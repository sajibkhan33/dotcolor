const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { exec, execFile } = require('child_process');

const CLOUD_SERVER_URL = (process.argv[2] || process.env.CLOUD_SERVER_URL || 'http://localhost:5000').replace(/\/+$/, '');
const LOCAL_PORT = 9123;
const POLL_INTERVAL_MS = 250;

let cachedPrinters = [];
let cachedDetailedPrinters = [];
let cachedUsbDevicePaths = [];
let cachedLanIps = ['192.168.1.87'];
let isUsbPhysicallyConnected = false;
let isLanReachable = false;
let lastPrinterScan = 0;
let printerScanPromise = null;

const VIRTUAL_PRINTER_REGEX = /microsoft print to pdf|xps document writer|onenote|fax|adobe pdf|foxit|send to|anydesk|snagit|cutepdf/i;

function ensureFastPrintBinary() {
  const exePath = path.join(__dirname, 'scripts', 'raw-print.exe');
  const csPath = path.join(__dirname, 'scripts', 'raw-print.cs');
  if (fs.existsSync(exePath)) return exePath;
  const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  if (fs.existsSync(csc) && fs.existsSync(csPath)) {
    execFile(csc, ['/nologo', '/optimize+', '/target:exe', `/out:${exePath}`, csPath], () => {});
  }
  return exePath;
}

function checkTcpReachable(host, port, timeoutMs = 300) {
  return new Promise((resolve) => {
    let done = false;
    const socket = new net.Socket();
    const finish = (ok) => {
      if (!done) {
        done = true;
        try { socket.destroy(); } catch (e) {}
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, host, () => finish(true));
  });
}

// Automatically configure routing if a thermal printer is plugged directly into PC's LAN port without a router (APIPA 169.254.x.x)
function configureDirectLanCableRoute() {
  const ps = `
    $eth = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' -and ($_.InterfaceDescription -match 'Ethernet|Realtek|Intel|PCIe|LAN|USB' -or $_.Name -match 'Ethernet') };
    foreach ($adapter in $eth) {
      $ips = @(Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue);
      $hasApipa = $ips | Where-Object { $_.IPAddress -match '^169\\.254\\.' };
      $has192 = $ips | Where-Object { $_.IPAddress -match '^192\\.168\\.1\\.' };
      if ($hasApipa -and -not $has192) {
        route add 192.168.1.87 mask 255.255.255.255 0.0.0.0 IF $adapter.ifIndex 2>$null;
        New-NetIPAddress -InterfaceIndex $adapter.ifIndex -IPAddress 192.168.1.250 -PrefixLength 24 -SkipAsSource $true -ErrorAction SilentlyContinue | Out-Null;
      }
    }
  `.replace(/\r?\n/g, ' ');
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps.replace(/"/g, '\\"')}"`, { timeout: 8000 }, () => {});
}

function refreshWindowsPrintersInBackground() {
  if (printerScanPromise) return printerScanPromise;
  printerScanPromise = new Promise((resolve) => {
    const psCmd = [
      `$usb = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Service -eq 'usbprint' -and $_.Status -eq 'OK' });`,
      `$usbDevices = @();`,
      `foreach ($u in $usb) {`,
      `  $busDesc = (Get-PnpDeviceProperty -InstanceId $u.InstanceId -KeyName 'DEVPKEY_Device_BusReportedDeviceDesc' -ErrorAction SilentlyContinue).Data;`,
      `  $friendly = $u.FriendlyName;`,
      `  $label = if ($busDesc) { [string]$busDesc } elseif ($friendly) { [string]$friendly } else { 'USB Receipt Printer' };`,
      `  $usbDevices += [PSCustomObject]@{ Name = $label.Trim(); InstanceId = [string]$u.InstanceId; FriendlyName = [string]$friendly };`,
      `}`,
      `$printers = @(Get-Printer -ErrorAction SilentlyContinue | Select-Object Name, PortName, DriverName, WorkOffline, PrinterStatus);`,
      `[PSCustomObject]@{ usbCount = $usb.Count; usbDevices = $usbDevices; printers = $printers } | ConvertTo-Json -Depth 4 -Compress`
    ].join(' ');

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd.replace(/"/g, '\\"')}"`, { timeout: 12000 }, async (err, stdout) => {
      printerScanPromise = null;
      const detailed = [];
      const allNames = [];
      const usbPaths = [];
      const discoveredIps = new Set(['192.168.1.87', '192.168.0.87', '192.168.1.200', '192.168.0.200']);

      if (!err && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          isUsbPhysicallyConnected = (Number(parsed.usbCount) || 0) > 0;
          const rawList = Array.isArray(parsed.printers) ? parsed.printers : (parsed.printers ? [parsed.printers] : []);
          const usbDevList = Array.isArray(parsed.usbDevices) ? parsed.usbDevices : (parsed.usbDevices ? [parsed.usbDevices] : []);

          for (const p of rawList) {
            const name = (p && p.Name ? String(p.Name) : '').trim();
            const rawPort = (p && p.PortName ? String(p.PortName) : '').trim();
            if (!name) continue;

            const ipMatch = rawPort.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch) discoveredIps.add(ipMatch[1]);

            const isVirtual = VIRTUAL_PRINTER_REGEX.test(name) || /^(PORTPROMPT:|SHRFAX:|nul:|FILE:)/i.test(rawPort) || /^Microsoft\.Office\./i.test(rawPort);
            const isUsbPort = /^USB/i.test(rawPort);
            const isLanPort = Boolean(ipMatch) || /^(IP_|WSD|TCP)/i.test(rawPort);
            const connType = isLanPort ? 'LAN' : 'USB';
            const displayPort = /^Microsoft\.Office\.OneNote/i.test(rawPort)
              ? 'OneNote Port'
              : (rawPort.length > 28 ? rawPort.slice(0, 25) + '...' : (rawPort || 'USB001'));
            const connectedNow = isUsbPort ? isUsbPhysicallyConnected : (!p.WorkOffline);

            detailed.push({
              name,
              portName: displayPort,
              driverName: (p && p.DriverName ? String(p.DriverName) : ''),
              connectionType: connType,
              ipAddress: ipMatch ? ipMatch[1] : (connType === 'LAN' ? '192.168.1.87' : undefined),
              port: 9100,
              usbPort: isUsbPort ? rawPort : displayPort,
              isConnected: connectedNow,
              isVirtual,
              deviceCategory: 'Printers'
            });

            if (!allNames.some(n => n.toLowerCase() === name.toLowerCase())) {
              allNames.push(name);
            }
          }

          // Dynamically include connected USB PnP printer devices
          for (const u of usbDevList) {
            const instId = (u && u.InstanceId ? String(u.InstanceId) : '').trim();
            if (instId) {
              usbPaths.push('\\\\?\\' + instId.replace(/\\/g, '#') + '#{28d78fad-5a12-11d1-ae5b-0000f803a8c2}');
            }
            const usbName = (u && u.Name ? String(u.Name) : '').trim();
            if (!usbName) continue;
            if (!detailed.some(d => d.name.toLowerCase() === usbName.toLowerCase())) {
              detailed.push({
                name: usbName,
                portName: 'USB001',
                driverName: (u && u.FriendlyName ? String(u.FriendlyName) : 'USB Printing Support'),
                connectionType: 'USB',
                port: 9100,
                usbPort: 'USB001',
                isConnected: true,
                isVirtual: false,
                deviceCategory: 'Unspecified (USB)'
              });
            }
            if (!allNames.some(n => n.toLowerCase() === usbName.toLowerCase())) {
              allNames.push(usbName);
            }
          }
        } catch (parseErr) {
          // ignore parse error
        }
      }

      cachedUsbDevicePaths = usbPaths;
      cachedLanIps = Array.from(discoveredIps);

      // Check if any LAN thermal printer is reachable on TCP 9100 in parallel
      const lanResults = await Promise.all(
        cachedLanIps.map(async (ip) => ({ ip, ok: await checkTcpReachable(ip, 9100, 250) }))
      );
      const reachableEntry = lanResults.find(r => r.ok);
      isLanReachable = Boolean(reachableEntry);
      const activeLanIp = reachableEntry ? reachableEntry.ip : '192.168.1.87';
      if (reachableEntry) {
        cachedLanIps = [activeLanIp, ...cachedLanIps.filter(x => x !== activeLanIp)];
      }

      if (isLanReachable && !detailed.some(d => d.connectionType === 'LAN' && d.ipAddress === activeLanIp)) {
        detailed.unshift({
          name: `80 Printer (LAN ${activeLanIp})`,
          portName: `${activeLanIp}:9100`,
          driverName: 'Direct TCP/IP ESC/POS',
          connectionType: 'LAN',
          ipAddress: activeLanIp,
          port: 9100,
          isConnected: true,
          isVirtual: false,
          deviceCategory: 'LAN Printer'
        });
        if (!allNames.includes('80 Printer')) {
          allNames.unshift('80 Printer');
        }
      }

      detailed.sort((a, b) => {
        if (Boolean(a.isVirtual) !== Boolean(b.isVirtual)) {
          return a.isVirtual ? 1 : -1;
        }
        if (Boolean(a.isConnected) !== Boolean(b.isConnected)) {
          return a.isConnected ? -1 : 1;
        }
        return String(a.name).localeCompare(String(b.name));
      });

      cachedDetailedPrinters = detailed;
      cachedPrinters = detailed.map(d => d.name);
      lastPrinterScan = Date.now();
      resolve(cachedPrinters);
    });
  });
  return printerScanPromise;
}

async function getWindowsPrinters(force = false) {
  const now = Date.now();
  if (force || lastPrinterScan === 0) {
    await refreshWindowsPrintersInBackground();
    return cachedPrinters;
  }
  if (now - lastPrinterScan >= 8000) {
    refreshWindowsPrintersInBackground();
  }
  return cachedPrinters;
}

async function hasConnectedHardwarePrinter() {
  if (lastPrinterScan === 0) {
    await refreshWindowsPrintersInBackground();
  } else if (Date.now() - lastPrinterScan >= 8000) {
    refreshWindowsPrintersInBackground();
  }
  return isUsbPhysicallyConnected || isLanReachable || cachedPrinters.length > 0;
}

function printTcpRaw(host, port, rawBuffer, timeoutMs = 450) {
  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();
    const finish = (ok) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch (e) {}
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, host, () => {
      socket.write(rawBuffer, () => {
        socket.end();
        finish(true);
      });
    });
  });
}

function resolveThermalPrinter(installedPrinters, requestedName) {
  const printers = (installedPrinters || []).filter(p => !VIRTUAL_PRINTER_REGEX.test(p));
  const lanPrinter = printers.find(p => /80\s*printer/i.test(p));

  if (lanPrinter) {
    return lanPrinter;
  }

  if (requestedName && !VIRTUAL_PRINTER_REGEX.test(requestedName)) {
    const trimmedReq = requestedName.trim();
    const exact = printers.find(p => p.toLowerCase() === trimmedReq.toLowerCase());
    if (exact) return exact;

    const matchPartial = printers.find(p => p.toLowerCase().includes(trimmedReq.toLowerCase()));
    if (matchPartial) return matchPartial;
  }

  const thermal = printers.find(p => /pos|receipt|thermal|80|58|xp|xprinter|gp|rongta|epson|bixolon|generic/i.test(p));
  if (thermal) return thermal;

  return printers[0] || '80 Printer';
}

async function printSlipWindows(printerName, rawBuffer) {
  return new Promise((resolve) => {
    const tempFile = path.join(os.tmpdir(), 'dotcolor_print_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.bin');
    fs.writeFileSync(tempFile, rawBuffer);

    const safePrinter = (printerName || '80 Printer').trim();
    const fastExe = ensureFastPrintBinary();
    const usbDevPath = cachedUsbDevicePaths[0] || '';

    // 1. Ultra-Fast Native C# Binary (~50-80ms)
    if (fs.existsSync(fastExe)) {
      execFile(fastExe, [safePrinter, tempFile, usbDevPath], { timeout: 2500 }, (err, stdout) => {
        if (!err) {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          console.log('⚡ [Instant USB/Spooler Print] ' + (stdout || 'SUCCESS').trim());
          return resolve(true);
        }
        // Fallback to PowerShell script
        const scriptPath = path.join(__dirname, 'scripts', 'print-raw.ps1');
        const psCmd = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + scriptPath + '" -PrinterName "' + safePrinter.replace(/"/g, '`"') + '" -FilePath "' + tempFile.replace(/"/g, '`"') + '"';
        exec(psCmd, (error, psOut) => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          if (error) {
            console.error('❌ [Print Error] Hardware print failed on "' + safePrinter + '"');
            resolve(false);
          } else {
            console.log('🖨️ [Hardware Print] ' + (psOut || 'SUCCESS').trim());
            resolve(true);
          }
        });
      });
      return;
    }

    // 2. PowerShell fallback
    const scriptPath = path.join(__dirname, 'scripts', 'print-raw.ps1');
    const psCmd = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + scriptPath + '" -PrinterName "' + safePrinter.replace(/"/g, '`"') + '" -FilePath "' + tempFile.replace(/"/g, '`"') + '"';

    exec(psCmd, (error, stdout) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      if (error) {
        console.error('❌ [Print Error] Hardware print failed on "' + printerName + '":', (error.message || '').split('\n')[0]);
        resolve(false);
      } else {
        console.log('🖨️ [Hardware Print] ' + (stdout || 'SUCCESS').trim());
        resolve(true);
      }
    });
  });
}

async function printSlipFast(printerName, rawBuffer) {
  // 1. Direct TCP Socket if LAN is reachable
  if (isLanReachable) {
    for (const ip of cachedLanIps) {
      const tcpOk = await printTcpRaw(ip, 9100, rawBuffer, 350);
      if (tcpOk) {
        console.log('⚡ [Ultra-Fast LAN Print] Sent directly to ' + ip + ':9100');
        return true;
      }
    }
  }

  // 2. Direct USB Hardware / Windows Spooler via raw-print.exe (~80ms)
  return await printSlipWindows(printerName, rawBuffer);
}

function line2Col(left, right, width = 42) {
  const l = (left || '').trim();
  const r = (right || '').trim();
  const maxL = Math.max(0, width - 1 - r.length);
  const safeL = l.length > maxL ? l.slice(0, maxL) : l;
  const spaces = Math.max(1, width - safeL.length - r.length);
  return safeL + ' '.repeat(spaces) + r + '\n';
}

function buildInvoiceEscPosBuffer(inv) {
  const chunks = [];
  const pushStr = (str) => chunks.push(Buffer.from(str, 'latin1'));
  const pushBytes = (arr) => chunks.push(Buffer.from(arr));

  // 1. Initialize printer
  pushBytes([0x1B, 0x40]);

  // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density - prevents over-bolding and heavy ink bleeding)
  pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
  pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
  pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform standard font A (42 columns)

  // 3. Center Align: Company Branding Header
  pushBytes([0x1B, 0x61, 0x01]);
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON
  pushStr((inv.companyName || 'DOT COLOR COMMUNICATION').toUpperCase() + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

  pushStr((inv.companyCategory || 'PRINTING, PACKAGING & SIGNAGE') + '\n');
  if (inv.companyHotline || inv.companyPhone) {
    pushStr('Hotline: ' + (inv.companyHotline || inv.companyPhone || '01846100900') + '\n');
  }
  if (inv.companyAddress) {
    pushStr(inv.companyAddress + '\n');
  }

  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]);
  pushStr((inv.documentTitle || 'TAX INVOICE / বিল') + '\n');
  pushBytes([0x1B, 0x45, 0x00]);
  pushStr('------------------------------------------\n');

  // 4. Left Align: Invoice Metadata
  pushBytes([0x1B, 0x61, 0x00]);
  pushStr(line2Col('Invoice No :', inv.invoiceNo || 'INV-0001'));
  pushStr(line2Col('Date       :', inv.date || new Date().toLocaleDateString('en-GB')));
  if (inv.referenceNo) {
    pushStr(line2Col('Ref / PO # :', inv.referenceNo));
  }
  pushStr(line2Col('Customer   :', inv.customerName || 'Walk-in Customer'));
  if (inv.customerPhone) {
    pushStr(line2Col('Phone      :', inv.customerPhone));
  }
  if (inv.customerAddress) {
    pushStr(line2Col('Address    :', inv.customerAddress));
  }
  pushStr('------------------------------------------\n');

  // 5. Line Items Header (Exact 42 character columns)
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON
  const colItemH = 'ITEM'.padEnd(19, ' ');
  const colQtyH = 'QTY'.padStart(3, ' ');
  const colPriceH = 'RATE'.padStart(8, ' ');
  const colTotalH = 'TOTAL'.padStart(9, ' ');
  pushStr(colItemH + ' ' + colQtyH + ' ' + colPriceH + ' ' + colTotalH + '\n');
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
  pushStr('------------------------------------------\n');

  // 6. Items List
  const items = Array.isArray(inv.items) ? inv.items : [];
  for (const item of items) {
    let rawName = (item.name || 'Item').trim();
    let firstLineName = rawName;
    let remainder = '';
    if (firstLineName.length > 19) {
      const lastSpace = firstLineName.lastIndexOf(' ', 19);
      if (lastSpace > 6) {
        remainder = firstLineName.slice(lastSpace + 1).trim();
        firstLineName = firstLineName.slice(0, lastSpace);
      } else {
        remainder = firstLineName.slice(19).trim();
        firstLineName = firstLineName.slice(0, 19);
      }
    }

    const colItem = firstLineName.padEnd(19, ' ');
    const colQty = String(item.qty || 1).padStart(3, ' ');
    const unitPrice = Number(item.unitPrice || 0);
    const totalPrice = Number(item.totalPrice || (unitPrice * (item.qty || 1)));
    const colPrice = unitPrice.toLocaleString().padStart(8, ' ');
    const colTotal = totalPrice.toLocaleString().padStart(9, ' ');

    pushStr(colItem + ' ' + colQty + ' ' + colPrice + ' ' + colTotal + '\n');
    if (remainder) {
      pushStr('  ' + remainder + '\n');
    }
    if (item.width && item.height) {
      const singleSqft = Number(((item.width || 0) * (item.height || 0)).toFixed(2));
      const qty = Number(item.qty) || 1;
      const totSqft = item.totalSqft && item.totalSqft !== singleSqft
        ? item.totalSqft
        : Number((singleSqft * qty).toFixed(2));
      pushStr(`  (${item.width}' x ${item.height}' = ${singleSqft} sqft${qty > 1 ? ` x ${qty} = ${totSqft} sqft` : ''})\n`);
    } else if (item.totalSqft) {
      pushStr(`  (${item.totalSqft} sqft)\n`);
    }
    if (item.notes) {
      pushStr('  * Note: ' + item.notes + '\n');
    }
  }

  pushStr('------------------------------------------\n');

  // 7. Financial Totals
  const subtotal = Number(inv.subtotal || 0);
  const discount = Number(inv.discount || 0);
  const vatAmount = Number(inv.vatAmount || 0);
  const grandTotal = Number(inv.grandTotal || (subtotal - discount + vatAmount));
  const paidAmount = Number(inv.paidAmount || 0);
  const dueAmount = Number(inv.dueAmount || Math.max(0, grandTotal - paidAmount));

  pushStr(line2Col('Subtotal:', subtotal.toLocaleString()));
  if (discount > 0) {
    pushStr(line2Col('Discount:', '-' + discount.toLocaleString()));
  }
  if (vatAmount > 0) {
    pushStr(line2Col('VAT (' + (inv.vatRate || 0) + '%):', '+' + vatAmount.toLocaleString()));
  }

  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x45, 0x01]); // Bold ON
  pushStr(line2Col('TOTAL AMOUNT:', grandTotal.toLocaleString() + ' BDT'));
  pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

  pushStr(line2Col('Paid (' + (inv.paymentMethod || 'Cash') + '):', paidAmount.toLocaleString()));

  if (dueAmount > 0) {
    pushBytes([0x1B, 0x45, 0x01]); // Bold ON
    pushStr(line2Col('BALANCE DUE:', dueAmount.toLocaleString() + ' BDT'));
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
  } else {
    pushBytes([0x1B, 0x61, 0x01]);
    pushStr('*** PAID IN FULL / পরিশোধিত ***\n');
    pushBytes([0x1B, 0x61, 0x00]);
  }

  // 8. Footer
  pushStr('------------------------------------------\n');
  pushBytes([0x1B, 0x61, 0x01]); // Center
  pushStr('*** ধন্যবাদ আবার আসবেন ***\n');
  pushStr('Thank you for your business!\n');
  pushStr('Quality Printing & Signage Solutions\n');
  pushStr('------------------------------------------\n');
  pushStr('Software Developed by BD HOSTT\n');
  pushStr('Hotline: 01846100900 • www.bdhostt.com\n');
  pushStr('------------------------------------------\n');
  pushStr('\n\n\n');
  pushBytes([0x1D, 0x56, 0x00]); // Full Cut

  return Buffer.concat(chunks);
}

const recentJobsCache = new Map();

function getJobDedupKey(job) {
  if (!job) return '';
  let key = job.id;
  if (job.payload) {
    const p = job.payload;
    const inv = p.invoiceNo || p.id || '';
    const tot = p.grandTotal || p.netTotal || '';
    key = (job.type || '') + '_' + inv + '_' + tot;
  }
  return key;
}

function isDuplicateJob(job) {
  if (!job) return false;
  const now = Date.now();
  for (const [key, timestamp] of recentJobsCache.entries()) {
    if (now - timestamp > 30000) recentJobsCache.delete(key);
  }

  const key = getJobDedupKey(job);
  if (recentJobsCache.has(key)) {
    const diff = now - recentJobsCache.get(key);
    if (diff < 15000) {
      console.log('⚠️ [Deduplication] Blocked duplicate print job (' + key + ') within ' + diff + 'ms.');
      return true;
    }
  }
  return false;
}

function markJobPrinted(job) {
  const key = getJobDedupKey(job);
  if (key) recentJobsCache.set(key, Date.now());
}

async function processPrintJob(job) {
  if (!job || !job.type) return false;
  if (isDuplicateJob(job)) return true;

  const installedPrinters = await getWindowsPrinters();
  const defaultThermal = resolveThermalPrinter(installedPrinters);

  console.log('\n🖨️ [Job Dispatch] Processing job ' + job.id + ' (' + job.type + ')');

  if (job.type === 'INVOICE' || job.type === 'POS' || job.type === 'BILL') {
    const targetPrinter = resolveThermalPrinter(installedPrinters, job.payload.targetPrinterName);
    console.log(' ➔ Printing 80mm Invoice #' + (job.payload.invoiceNo || 'N/A') + ' on "' + targetPrinter + '"...');
    const buffer = buildInvoiceEscPosBuffer(job.payload);
    const ok = await printSlipFast(targetPrinter, buffer);
    if (ok) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] Printed successfully on ' + targetPrinter + '!');
    }
    return ok;
  }

  if (job.type === 'RAW') {
    const targetPrinter = resolveThermalPrinter(installedPrinters, job.payload.targetPrinterName);
    const rawBuffer = Buffer.isBuffer(job.payload.data)
      ? job.payload.data
      : Buffer.from(job.payload.data, job.payload.encoding || 'base64');
    const ok = await printSlipFast(targetPrinter, rawBuffer);
    if (ok) {
      markJobPrinted(job);
      console.log('✅ [Job ' + job.id + '] Raw bytes printed successfully on ' + targetPrinter + '!');
    }
    return ok;
  }

  return false;
}

function startLocalHttpServer(retryCount = 0) {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if ((req.url === '/health' || req.url.startsWith('/health?') || req.url === '/api/hardware/printers' || req.url.startsWith('/api/hardware/printers?')) && req.method === 'GET') {
      const force = req.url.includes('force=1');
      const printers = await getWindowsPrinters(force);
      const hasHardware = await hasConnectedHardwarePrinter();
      const activePrinter = resolveThermalPrinter(printers);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true,
        status: hasHardware ? 'ok' : 'standby',
        hasHardware,
        isUsbConnected: isUsbPhysicallyConnected,
        isLanReachable,
        activePrinter,
        printers: printers,
        detailedPrinters: cachedDetailedPrinters,
        timestamp: Date.now() 
      }));
      return;
    }

    const handleJsonPost = (type) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const ok = await processPrintJob({ id: 'local_' + Date.now(), type, payload });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: ok }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
    };

    if (req.url === '/api/hardware/print-invoice' || req.url === '/api/hardware/print-bill' || req.url === '/api/hardware/print-pos') {
      return handleJsonPost('INVOICE');
    }

    if (req.url === '/api/hardware/print-raw') {
      return handleJsonPost('RAW');
    }

    res.writeHead(404);
    res.end();
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (retryCount < 2) {
        console.log('⚠️ [Local Bridge] Port ' + LOCAL_PORT + ' is in use by another instance. Freeing port and taking over...');
        try { server.close(); } catch (e) {}

        const killCmd = process.platform === 'win32'
          ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort ${LOCAL_PORT} -ErrorAction SilentlyContinue; foreach ($c in $conns) { if ($c.OwningProcess -ne $PID -and $c.OwningProcess -ne 0) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } }; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { ($_.Name -match '^(node|wscript)\\.exe$') -and ($_.CommandLine -match 'print-agent\\.cjs|run-printer-silent\\.vbs') -and ($_.ProcessId -ne $PID) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`
          : `fuser -k ${LOCAL_PORT}/tcp`;

        exec(killCmd, () => {
          setTimeout(() => {
            startLocalHttpServer(retryCount + 1);
          }, 1000);
        });
        return;
      }

      console.log('ℹ️ [Local Bridge] Port ' + LOCAL_PORT + ' is already active in another background instance and could not be released.');
      process.exit(42);
    }
    console.error('⚠️ [Local Bridge Server Error]:', err.message);
  });

  server.listen(LOCAL_PORT, '0.0.0.0', () => {
    console.log('⚡ [Local Bridge] Direct HTTP Service ready on http://127.0.0.1:' + LOCAL_PORT + ' (and LAN 0.0.0.0:' + LOCAL_PORT + ')');
  });
}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

async function pollCloudPrintQueue() {
  try {
    const canPrintHere = await hasConnectedHardwarePrinter();
    if (canPrintHere) {
      const url = CLOUD_SERVER_URL + '/api/print-bridge/poll';
      const activePrinter = resolveThermalPrinter(cachedPrinters);
      const agentMeta = Buffer.from(JSON.stringify({
        activePrinter,
        isUsbConnected: isUsbPhysicallyConnected,
        isLanReachable,
        printers: cachedPrinters,
        detailedPrinters: cachedDetailedPrinters
      }), 'utf8').toString('base64');

      const response = await fetch(url, {
        headers: { 'X-Agent-Printers': agentMeta },
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.jobs) && data.jobs.length > 0) {
          const completedIds = [];
          for (const job of data.jobs) {
            const ok = await processPrintJob(job);
            if (ok) completedIds.push(job.id);
          }
          if (completedIds.length > 0) {
            await fetch(CLOUD_SERVER_URL + '/api/print-bridge/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobIds: completedIds })
            });
          }
        }
      }
    }
  } catch (e) {
    // idle or network blip
  }

  setTimeout(pollCloudPrintQueue, POLL_INTERVAL_MS);
}

async function init() {
  console.log('================================================================');
  console.log('   🚀 DOTCOLOR COMMUNICATION - THERMAL PRINTER BRIDGE (ACTIVE)');
  console.log('================================================================');
  console.log('  [+] Cloud Target   : ' + CLOUD_SERVER_URL);
  console.log('  [+] Local Bridge   : http://127.0.0.1:' + LOCAL_PORT + ' (Instant 0ms Print)');
  console.log('  [+] Queue Polling  : Active (Smart Hardware-Aware Mode)');
  console.log('================================================================\n');

  configureDirectLanCableRoute();
  setInterval(configureDirectLanCableRoute, 20000);

  startLocalHttpServer();
  pollCloudPrintQueue();

  const printers = await refreshWindowsPrintersInBackground();
  const primaryThermal = resolveThermalPrinter(printers);

  console.log('📋 Detected Connected Thermal Printers:');
  if (printers.length === 0 && !isLanReachable) {
    console.log('   ⏸️  No physical USB/LAN printer plugged into this PC right now (Standby Mode).');
  } else {
    printers.forEach(p => {
      if (p === primaryThermal) {
        console.log('   🎯 ' + p + ' [PRIMARY ACTIVE HARDWARE PRINTER]');
      } else {
        console.log('   • ' + p);
      }
    });
  }

  console.log('\n🖨️ Active Output Device : "' + primaryThermal + '" (USB: ' + (isUsbPhysicallyConnected ? 'YES' : 'NO') + ', LAN: ' + (isLanReachable ? 'YES' : 'NO') + ')');
  console.log('🟢 Status: Listening for print orders from ' + CLOUD_SERVER_URL + '...\n');
}

init();
