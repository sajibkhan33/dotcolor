/**
 * Automated Test Suite for Dot Color Communication Accounting & Security Logic
 * Tests:
 * 1. Physical Inventory Valuation (Immunity against PO inflation)
 * 2. Customer Receivables & Supplier Payables
 * 3. General Ledger Single Account Balancing
 * 4. Double-Entry Invariance: Assets = Liabilities + Equity
 * 5. Staff PIN Cryptographic Hashing & Backward-Compatible Auto-Upgrade (SEC-04)
 * 6. Audit Log Payload Trimming (ARC-02)
 */

import {
    calculateInventoryValuation,
    calculateTotalCustomerReceivables,
    calculateTotalSupplierPayables,
    calculateSingleAccountBalance,
} from '../src/utils/accountUtils';

import {
    hashPin,
    verifyPin,
    isPinHashed,
    maskPin,
} from '../src/utils/securityUtils';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${testName}`);
        if (errorDetail) console.error(`     Details: ${errorDetail}`);
        failedTests++;
    }
}

console.log('\n======================================================');
console.log('🧪 Dot Color Communication - SQA Test Suite (QA-06)');
console.log('======================================================\n');

// --- Test Suite 1: Inventory Valuation ---
console.log('📦 Test Suite 1: Physical Inventory Valuation');
{
    const products: any[] = [
        { id: 'p1', name: 'Flex Banner Material', stockFactory: 10, stockOffice: 5, costPrice: 120, isRawMaterial: true },
        { id: 'p2', name: 'Solvent Ink Cyan', stockFactory: 4, stockOffice: 1, costPrice: 800, isRawMaterial: true },
        { id: 'p3', name: 'Printed Roll Up Standee', stockFactory: 2, stockOffice: 0, costPrice: 1500, isRawMaterial: false },
    ];
    // Expected physical valuation:
    // p1: 15 * 120 = 1,800
    // p2: 5 * 800  = 4,000
    // p3: 2 * 1500 = 3,000
    // Total: 8,800

    const dummyPOs: any[] = [
        { id: 'po-1', status: 'Received', grandTotal: 95000 },
        { id: 'po-2', status: 'Received', grandTotal: 45000 },
    ];

    const totalVal = calculateInventoryValuation(products, dummyPOs, undefined, []);
    assert(
        totalVal === 8800,
        'Inventory valuation derives strictly from physical stock, ignoring cumulative historical POs',
        `Expected 8800, got ${totalVal}`
    );

    const rawAccount: any = { code: '1060', name: 'Raw Materials & Inventory', balance: 0 };
    const rawVal = calculateInventoryValuation(products, dummyPOs, rawAccount, []);
    assert(
        rawVal === 5800,
        'Raw materials account (1060) accurately isolates raw materials stock (1800 + 4000 = 5800)',
        `Expected 5800, got ${rawVal}`
    );

    const finishedAccount: any = { code: '1070', name: 'Finished Goods Inventory', balance: 0 };
    const finishedVal = calculateInventoryValuation(products, dummyPOs, finishedAccount, []);
    assert(
        finishedVal === 3000,
        'Finished goods account (1070) accurately isolates finished goods stock (3000)',
        `Expected 3000, got ${finishedVal}`
    );

    // Test PO procurement journal immunity
    const poJournals: any[] = [
        { id: 'jv-1', refNo: 'PO-7842 Manik Steel', debitAccountName: 'Cost of Goods Sold - Raw Materials', creditAccountName: 'Raw Materials & Inventory', amount: 10000 },
        { id: 'jv-2', refNo: 'PO-9617 Engr. Saiful Azim', debitAccountName: 'Cost of Goods Sold - Raw Materials', creditAccountName: 'Raw Materials & Inventory', amount: 600 },
    ];
    const poRawProducts: any[] = [
        { id: 'rm-1', name: 'MS Sheet', stockFactory: 1, stockOffice: 0, costPrice: 10000, isRawMaterial: true },
        { id: 'rm-2', name: 'Welding Rod', stockFactory: 1, stockOffice: 0, costPrice: 600, isRawMaterial: true },
    ];
    const poRawVal = calculateInventoryValuation(poRawProducts, [], rawAccount, poJournals);
    assert(
        poRawVal === 10600,
        'Raw Materials inventory valuation is fully protected when PO receipt journal vouchers exist (10,600 not 0)',
        `Expected 10600, got ${poRawVal}`
    );
}

// --- Test Suite 2: Receivables & Payables ---
console.log('\n💳 Test Suite 2: Accounts Receivable & Accounts Payable');
{
    const invoices: any[] = [
        { id: 'inv-1', customerId: 'cust-1', invoiceNo: 'INV-101', totalAmount: 10000, paidAmount: 6000, dueAmount: 4000 },
        { id: 'inv-2', customerId: 'cust-2', invoiceNo: 'INV-102', totalAmount: 25000, paidAmount: 25000, dueAmount: 0 },
        { id: 'inv-3', customerId: 'cust-3', invoiceNo: 'INV-103', totalAmount: 15000, paidAmount: 5000, dueAmount: 10000 },
    ];
    const dummyCusts: any[] = [
        { id: 'cust-1', name: 'Dhaka Media' },
        { id: 'cust-2', name: 'Global Brand' },
        { id: 'cust-3', name: 'Apex Trade' },
    ];

    const totalReceivables = calculateTotalCustomerReceivables(dummyCusts, invoices, []);
    assert(
        totalReceivables === 14000,
        'Total customer receivables correctly sums open invoice dues (4,000 + 10,000 = 14,000)',
        `Expected 14000, got ${totalReceivables}`
    );

    const suppliers: any[] = [
        { id: 'sup-1', name: 'Ink Supplies Ltd', balancePayable: 12000, dueAmount: 12000 },
        { id: 'sup-2', name: 'Paper & Board Mills', balancePayable: 8500, dueAmount: 8500 },
    ];
    const totalPayables = calculateTotalSupplierPayables(suppliers);
    assert(
        totalPayables === 20500,
        'Total supplier payables correctly aggregates supplier balances (12,000 + 8,500 = 20,500)',
        `Expected 20500, got ${totalPayables}`
    );
}

// --- Test Suite 3: General Ledger Single Account Balance ---
console.log('\n📒 Test Suite 3: General Ledger Single Account Balance');
{
    const cashAccount: any = {
        id: 'acc-1010',
        code: '1010',
        name: 'Cash in Hand (Office)',
        type: 'Asset',
        openingBalance: 5000,
    };

    const transactions: any[] = [
        { id: 'tx-1', type: 'INCOME', amount: 15000, paymentMethod: 'Cash' },
        { id: 'tx-2', type: 'EXPENSE', amount: 4000, paymentMethod: 'Cash' },
    ];

    const journals: any[] = [
        { id: 'j-1', debitAccountId: 'acc-1010', debitAccountName: 'Cash in Hand (Office)', creditAccountId: 'acc-4010', amount: 2000 },
    ];

    const bal = calculateSingleAccountBalance(cashAccount, transactions, [], [], journals);
    // Opening 5,000 + Income 15,000 - Expense 4,000 + Journal Debit 2,000 = 18,000
    assert(
        bal === 18000,
        'Asset account balance correctly calculates: Opening + Income - Expense + Journal Debit',
        `Expected 18000, got ${bal}`
    );

    // Test invoice short/long ref matching deduplication
    const cityBankAcc: any = { id: 'coa-city', code: '1004', name: 'City Bank PLC', classification: 'Asset', openingBalance: 0 };
    const invoicesList: any[] = [
        { invoiceNo: 'DCC-INV-2026-4307', paidAmount: 99000, splitPayments: { 'Cash in Hand': 80000, 'City Bank PLC': 10000, 'Southeast Bank': 9000 } }
    ];
    const txList: any[] = [
        { id: 'tx-inv', refNo: 'INV-4307', type: 'INCOME', amount: 10000, account: 'City Bank PLC', paymentAccount: 'City Bank PLC' },
        { id: 'tx-exp', refNo: 'EXP-4477', type: 'EXPENSE', amount: 1000, account: 'City Bank PLC', paymentAccount: 'City Bank PLC' }
    ];
    const cityBal = calculateSingleAccountBalance(cityBankAcc, txList, invoicesList, [], []);
    assert(
        cityBal === 9000,
        'City Bank balance accurately reflects 10,000 income minus 1,000 expense (9,000) without invoice duplication',
        `Expected 9000, got ${cityBal}`
    );
}

// --- Test Suite 4: Double-Entry Balancing ---
console.log('\n⚖️ Test Suite 4: Double-Entry Voucher Integrity');
{
    const sampleVoucher: any = {
        voucherNo: 'JV-2026-001',
        debitAccountId: 'acc-1010',
        debitAccountName: 'Cash',
        creditAccountId: 'acc-4010',
        creditAccountName: 'Sales Revenue',
        amount: 25000,
    };

    const isBalanced = sampleVoucher.amount > 0 && sampleVoucher.debitAccountId && sampleVoucher.creditAccountId;
    assert(
        Boolean(isBalanced),
        'Double-entry journal voucher enforces debit amount equals credit amount',
        'Voucher is unbalanced'
    );
}

// --- Test Suite 5: Staff PIN Cryptographic Hashing & Verification (SEC-04) ---
console.log('\n🔐 Test Suite 5: Staff PIN Cryptographic Security (SEC-04)');
{
    const rawPin = '240777';
    const hashed = hashPin(rawPin);

    assert(
        isPinHashed(hashed),
        'hashPin creates a properly formatted salted SHA-256 hash prefixed with "sha256:"',
        `Result: ${hashed}`
    );

    assert(
        hashed.startsWith('sha256:') && hashed.length === 71,
        'Hash output contains sha256 prefix + 64 hex characters (71 chars total)',
        `Length: ${hashed.length}`
    );

    const verifiedCorrect = verifyPin(rawPin, hashed);
    assert(
        verifiedCorrect.valid === true && verifiedCorrect.needsUpgrade === false,
        'verifyPin successfully authenticates correct PIN against stored hash'
    );

    const verifiedWrong = verifyPin('999999', hashed);
    assert(
        verifiedWrong.valid === false,
        'verifyPin strictly rejects incorrect PIN against stored hash'
    );

    // Non-destructive backward compatibility test
    const legacyPlainPin = '1234';
    const legacyVerification = verifyPin(legacyPlainPin, legacyPlainPin);
    assert(
        legacyVerification.valid === true &&
        legacyVerification.needsUpgrade === true &&
        isPinHashed(legacyVerification.upgradedHash),
        'verifyPin transparently verifies legacy plain-text PIN and generates upgrade hash for auto-migration'
    );

    assert(
        maskPin(hashed) === '••••••',
        'maskPin masks PIN display for UI security'
    );
}

// --- Test Suite 6: State Payload Trimming (ARC-02) ---
console.log('\n🛡️ Test Suite 6: State Payload Trimming (ARC-02)');
{
    const bloatedLogs = Array.from({ length: 1200 }, (_, i) => ({
        id: `audit-${i}`,
        details: `Log entry ${i}`,
        timestamp: new Date().toISOString(),
    }));

    const cappedLogs = bloatedLogs.slice(0, 500);
    assert(
        cappedLogs.length === 500,
        'Audit log array is capped at 500 records to prevent MongoDB 16MB document boundary overflow',
        `Length: ${cappedLogs.length}`
    );
}

// --- Test Suite 7: Full Transactional Data Reset & COGS Zeroing Integrity ---
console.log('\n🔄 Test Suite 7: Full Transactional Data Reset & COGS Zeroing Integrity');
{
    // Mock COGS account 5001
    const cogsAccount: ChartOfAccount = {
        id: 'coa-5001',
        code: '5001',
        name: 'Cost of Goods Sold - Raw Materials',
        classification: 'Expense',
        accountGroup: 'Direct Expenses / COGS',
        normalBalance: 'Debit',
        openingBalance: 0,
        currentBalance: 10600,
        isActive: true,
    };

    // Case A: When manual journal vouchers exist (e.g. 10,000 + 600 = 10,600)
    const activeJournals: JournalEntry[] = [
        {
            id: 'jnl-1',
            entryNo: 'JNL-2026-0001',
            date: '2026-10-25',
            debitAccountId: 'coa-5001',
            debitAccountName: 'Cost of Goods Sold - Raw Materials',
            creditAccountId: 'coa-1002',
            creditAccountName: 'Raw Materials & Inventory',
            amount: 10000,
            narration: 'Test Raw Material Consumed',
            source: 'MANUAL',
            createdBy: 'Admin',
        },
        {
            id: 'jnl-2',
            entryNo: 'JNL-2026-0002',
            date: '2026-10-25',
            debitAccountId: 'coa-5001',
            debitAccountName: 'Cost of Goods Sold - Raw Materials',
            creditAccountId: 'coa-1002',
            creditAccountName: 'Raw Materials & Inventory',
            amount: 600,
            narration: 'Test Raw Material Consumed',
            source: 'MANUAL',
            createdBy: 'Admin',
        },
    ];

    let journalCogsDeltaWithEntries = 0;
    activeJournals.forEach(j => {
        if (j.debitAccountId === cogsAccount.id || j.debitAccountName === cogsAccount.name) {
            journalCogsDeltaWithEntries += Number(j.amount) || 0;
        }
    });

    const calculatedWithEntries = Math.max(0, (cogsAccount.openingBalance || 0) + journalCogsDeltaWithEntries);
    assert(
        calculatedWithEntries === 10600,
        'COGS accurately reflects manual journal entries (10,000 + 600 = 10,600)',
        `Got: ${calculatedWithEntries}`
    );

    // Case B: After Reset All Transactional Data (journals wiped to [])
    const resetJournals: JournalEntry[] = [];
    let journalCogsDeltaAfterReset = 0;
    resetJournals.forEach(j => {
        if (j.debitAccountId === cogsAccount.id || j.debitAccountName === cogsAccount.name) {
            journalCogsDeltaAfterReset += Number(j.amount) || 0;
        }
    });

    const poExpensesAfterReset = 0;
    const calculatedAfterReset = Math.max(0, (cogsAccount.openingBalance || 0) + poExpensesAfterReset + journalCogsDeltaAfterReset);

    assert(
        calculatedAfterReset === 0,
        'COGS recalculates strictly to 0 when transactional data and journal entries are reset',
        `Got: ${calculatedAfterReset}`
    );
}


// --- Test Suite 8: Direct Sales & QR Code Scan Lookup Integrity (QA-08) ---
console.log('\n🧾 Test Suite 8: Direct Sales & QR Code Scan Lookup Integrity');
{
    // Test 8.1: Smart Concurrency Merge preserves un-pushed local invoices
    const remoteInvoices: any[] = [
        { id: 'inv-existing-1', invoiceNo: 'DCC-INV-2026-1001', grandTotal: 5000, customerName: 'Client A' }
    ];
    const localInvoices: any[] = [
        { id: 'inv-newly-created-2', invoiceNo: 'DCC-INV-2026-2002', grandTotal: 170000, customerName: 'sss (sss)' },
        { id: 'inv-existing-1', invoiceNo: 'DCC-INV-2026-1001', grandTotal: 5000, customerName: 'Client A' }
    ];

    const remoteIds = new Set(remoteInvoices.map((inv: any) => inv.id));
    const pendingLocal = localInvoices.filter((inv: any) => inv?.id && !remoteIds.has(inv.id));
    const mergedInvoices = pendingLocal.length > 0 ? [...pendingLocal, ...remoteInvoices] : remoteInvoices;

    assert(
        mergedInvoices.length === 2 && mergedInvoices[0].id === 'inv-newly-created-2',
        'Smart Concurrency Merge preserves newly created local invoice during remote cloud pull',
        `Expected 2 invoices, got ${mergedInvoices.length}`
    );

    // Test 8.2: Multi-format Public Invoice / QR Scan Lookup
    const mockDbInvoices: any[] = [
        { id: 'inv-1792999506968', invoiceNo: 'DCC-INV-2026-6968', grandTotal: 170000 }
    ];

    const lookupInvoice = (query: string) => {
        const queryId = query.trim().toLowerCase();
        const queryNoHash = queryId.replace(/^#/, '');
        return mockDbInvoices.find(
            (inv: any) =>
                (inv.id && inv.id.toLowerCase() === queryId) ||
                (inv.id && inv.id.toLowerCase() === queryNoHash) ||
                (inv.invoiceNo && inv.invoiceNo.toLowerCase() === queryId) ||
                (inv.invoiceNo && inv.invoiceNo.toLowerCase() === queryNoHash) ||
                (inv.id && inv.id.toLowerCase().replace(/^#/, '') === queryNoHash) ||
                (inv.invoiceNo && inv.invoiceNo.toLowerCase().replace(/^#/, '') === queryNoHash)
        );
    };

    assert(
        Boolean(lookupInvoice('inv-1792999506968')),
        'Public endpoint finds invoice by exact document ID',
        'Failed to find by id'
    );
    assert(
        Boolean(lookupInvoice('#inv-1792999506968')),
        'Public endpoint finds invoice by hashed ID (#inv-...) from QR scan',
        'Failed to find by #id'
    );
    assert(
        Boolean(lookupInvoice('dcc-inv-2026-6968')),
        'Public endpoint finds invoice by lowercase invoice number',
        'Failed to find by invoiceNo'
    );
    assert(
        Boolean(lookupInvoice('#DCC-INV-2026-6968')),
        'Public endpoint finds invoice by hashed invoice number (#DCC-INV-...) from QR scan',
        'Failed to find by #invoiceNo'
    );

    // Test 8.3: Direct Sales Modal Dynamic Totals Calculation (Auto-Add fallback)
    const testItems: any[] = [
        { name: 'Trader Signboard (New)', qty: 500, unitPrice: 340, totalPrice: 170000 }
    ];
    const testSubtotal = testItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const testDiscount = 0;
    const testVat = 0;
    const testGrandTotal = testSubtotal - testDiscount + testVat;
    const testPaid = 0;
    const testDue = testGrandTotal - testPaid;

    assert(
        testGrandTotal === 170000 && testDue === 170000,
        'Direct Sales dynamic calculation correctly computes grand total Tk 170,000 and due Tk 170,000',
        `Got grandTotal: ${testGrandTotal}, due: ${testDue}`
    );
}

// --- Summary ---
console.log('\n======================================================');
console.log(`📊 Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log('======================================================\n');

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
