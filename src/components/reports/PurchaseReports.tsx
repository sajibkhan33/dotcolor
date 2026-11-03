import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Language, CompanyProfile } from '../../types';
import { ShoppingBag, Truck, Building, CreditCard, Search, CheckCircle2, Clock, AlertTriangle, RotateCcw, ArrowDownLeft, ShieldCheck, ChevronDown, ChevronUp, } from 'lucide-react';
interface PurchaseReportsProps {
    reportId: string;
    purchaseOrders: PurchaseOrder[];
    suppliers: Supplier[];
    profile: CompanyProfile;
    language: Language;
}
export const PurchaseReports: React.FC<PurchaseReportsProps> = ({ reportId, purchaseOrders, suppliers, profile, language, }) => {
    const isBn = language === 'bn';
    const currency = profile.currencySymbol || "Tk";
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);
    // -------------------------------------------------------------
    // 1. OVERALL PURCHASE REPORT (SUMMARY)
    // -------------------------------------------------------------
    const filteredPOs = useMemo(() => {
        return purchaseOrders.filter((po) => {
            const matchSearch = po.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                po.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchStatus = statusFilter === 'ALL' || po.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [purchaseOrders, searchTerm, statusFilter]);
    // -------------------------------------------------------------
    // 2. SUPPLIER-WISE PURCHASE REPORT
    // -------------------------------------------------------------
    const supplierPurchaseData = useMemo(() => {
        const map = new Map<string, {
            supplierId: string;
            name: string;
            company: string;
            phone: string;
            poCount: number;
            totalPurchased: number;
            totalPaid: number;
            totalDue: number;
            lastOrderDate: string;
        }>();
        purchaseOrders.forEach((po) => {
            const key = po.supplierId || po.supplierName;
            const current = map.get(key) || {
                supplierId: po.supplierId || '',
                name: po.supplierName,
                company: '',
                phone: po.supplierPhone || '',
                poCount: 0,
                totalPurchased: 0,
                totalPaid: 0,
                totalDue: 0,
                lastOrderDate: po.date,
            };
            current.poCount += 1;
            current.totalPurchased += po.totalAmount || 0;
            current.totalPaid += po.paidAmount || 0;
            if (po.status === 'Received') {
                current.totalDue += po.dueAmount || 0;
            }
            if (po.date > current.lastOrderDate) {
                current.lastOrderDate = po.date;
            }
            const matchSup = (suppliers || []).find((s) => s.id === po.supplierId || s.name === po.supplierName);
            if (matchSup) {
                current.company = matchSup.company || '';
                if (!current.phone && matchSup.phone)
                    current.phone = matchSup.phone;
            }
            map.set(key, current);
        });
        return Array.from(map.values()).sort((a, b) => b.totalPurchased - a.totalPurchased);
    }, [purchaseOrders, suppliers]);
    // -------------------------------------------------------------
    // 3. SUPPLIER PAYABLES REPORT (ACCOUNTS PAYABLE)
    // -------------------------------------------------------------
    const supplierPayablesData = useMemo(() => {
        const now = new Date().getTime();
        return purchaseOrders
            .filter((po) => po.status === 'Received' && (po.dueAmount || 0) > 0)
            .map((po) => {
            const poDate = new Date(po.date).getTime();
            const diffDays = Math.max(0, Math.floor((now - poDate) / (1000 * 60 * 60 * 24)));
            let agingBracket = 'Current (0-15 Days)';
            let agingBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (diffDays > 30) {
                agingBracket = 'Overdue (30+ Days)';
                agingBadge = 'bg-rose-50 text-rose-700 border-rose-200';
            }
            else if (diffDays > 15) {
                agingBracket = 'Due Soon (16-30 Days)';
                agingBadge = 'bg-amber-50 text-amber-700 border-amber-200';
            }
            const matchSup = (suppliers || []).find((s) => s.id === po.supplierId || s.name === po.supplierName);
            return {
                id: po.id,
                poNo: po.poNo,
                date: po.date,
                supplierName: po.supplierName,
                company: matchSup?.company || 'Vendor',
                phone: po.supplierPhone || matchSup?.phone || '-',
                totalAmount: po.totalAmount,
                paidAmount: po.paidAmount,
                dueAmount: po.dueAmount,
                destination: po.destination,
                status: po.status,
                daysPassed: diffDays,
                agingBracket,
                agingBadge,
            };
        })
            .sort((a, b) => b.dueAmount - a.dueAmount);
    }, [purchaseOrders, suppliers]);

    // -------------------------------------------------------------
    // 4. PURCHASE RETURNS & REFUND REPORT
    // -------------------------------------------------------------
    const purchaseReturnsData = useMemo(() => {
        return purchaseOrders
            .filter((po) => {
                const isReturned = po.status === 'Partially Returned' ||
                    po.status === 'Cancelled' ||
                    Boolean(po.returnedAt) ||
                    (po.returnedItems && po.returnedItems.length > 0) ||
                    (po.notes && (po.notes.toLowerCase().includes('return') || po.notes.toLowerCase().includes('refund')));
                const matchSearch = po.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (po.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (po.items || []).some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
                return isReturned && matchSearch;
            })
            .map((po) => {
                let totalRefund = 0;
                let totalConsumed = 0;
                if (po.returnedItems && po.returnedItems.length > 0) {
                    totalRefund = po.returnedItems.reduce((s, it) => s + (Number(it.refundAmount) || 0), 0);
                    totalConsumed = po.returnedItems.reduce((s, it) => s + (Number(it.consumedAmount) || 0), 0);
                } else {
                    totalConsumed = Number(po.paidAmount) || 0;
                    totalRefund = Math.max(0, (Number(po.totalAmount) || 0) - totalConsumed);
                }

                const originalPoAmount = (totalRefund + totalConsumed > 0) ? (totalRefund + totalConsumed) : (Number(po.totalAmount) || 0);
                const matchSup = (suppliers || []).find((s) => s.id === po.supplierId || s.name === po.supplierName);

                return {
                    id: po.id,
                    poNo: po.poNo,
                    poDate: po.date,
                    returnDate: po.returnedAt ? po.returnedAt.slice(0, 10) : po.date,
                    supplierName: po.supplierName,
                    company: matchSup?.company || '',
                    phone: po.supplierPhone || matchSup?.phone || '-',
                    destination: po.destination,
                    originalPoAmount,
                    retainedAmount: totalConsumed,
                    refundAmount: totalRefund,
                    status: po.status,
                    notes: po.notes || '',
                    reason: po.returnedReason || po.notes || 'Partial stock return to vendor',
                    items: po.returnedItems && po.returnedItems.length > 0
                        ? po.returnedItems
                        : (po.items || []).map((i) => ({
                            productId: i.productId,
                            name: i.name,
                            consumedQty: i.consumedQty ?? 0,
                            returnedQty: i.returnedQty ?? (i.qty || 0),
                            consumedAmount: Math.round((i.consumedQty ?? 0) * (i.unitCost || 0)),
                            refundAmount: Math.round((i.returnedQty ?? (i.qty || 0)) * (i.unitCost || 0)),
                        })),
                };
            })
            .sort((a, b) => new Date(b.returnDate || 0).getTime() - new Date(a.returnDate || 0).getTime());
    }, [purchaseOrders, suppliers, searchTerm]);

    return (<div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* REPORT 8: GENERAL PURCHASE ORDERS SUMMARY */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'purchase-summary' && (<div>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Total Purchase Orders'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{filteredPOs.length}</p>
              <span className="text-[11px] text-slate-400">
                {filteredPOs.filter((p) => p.status === 'Received').length} received
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Total Purchase Value'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {currency} {filteredPOs.reduce((a, b) => a + b.totalAmount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">Procurement costs</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Supplier Payments Made'}
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {currency} {filteredPOs.reduce((a, b) => a + b.paidAmount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">Paid to vendors</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Supplier Due Balance'}
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {currency} {filteredPOs.reduce((a, b) => a + b.dueAmount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-rose-500 font-medium">Accounts payable</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
              <input type="text" placeholder={'Search PO number, supplier, or items...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"/>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="ALL">{'All Status'}</option>
              <option value="Received">{'Received'}</option>
              <option value="Ordered">{'Ordered'}</option>
              <option value="Partially Returned">{'Partially Returned'}</option>
              <option value="Pending">{'Pending'}</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{'PO Ref & Date'}</th>
                    <th className="py-3 px-4">{'Supplier Name'}</th>
                    <th className="py-3 px-4">{'Purchased Items'}</th>
                    <th className="py-3 px-4 text-center">{'Destination'}</th>
                    <th className="py-3 px-4 text-right">{"PO AmountTk"}</th>
                    <th className="py-3 px-4 text-right">{"PaidTk"}</th>
                    <th className="py-3 px-4 text-right">{"DueTk"}</th>
                    <th className="py-3 px-4 text-center">{'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPOs.length === 0 ? (<tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        {'No purchase orders found'}
                      </td>
                    </tr>) : (filteredPOs.map((po, idx) => (<tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 font-mono block">{po.poNo}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{po.date}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{po.supplierName}</td>
                        <td className="py-3 px-4 max-w-xs text-slate-700">
                          {po.items.map((i) => `${i.name} (${i.qty} ${i.unit})`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${po.destination === 'Factory'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-blue-50 text-blue-700'}`}>
                            {po.destination}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {currency} {po.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {currency} {po.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          {currency} {po.dueAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${po.status === 'Partially Returned' ? 'bg-purple-50 text-purple-700 border-purple-200' : po.status === 'Received'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : po.status === 'Ordered'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                            {po.status}
                          </span>
                        </td>
                      </tr>)))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-right uppercase text-[11px]">
                      {'Grand Total Purchase:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency} {filteredPOs.reduce((a, b) => a + b.totalAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {currency} {filteredPOs.reduce((a, b) => a + b.paidAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">
                      {currency} {filteredPOs.reduce((a, b) => a + b.dueAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>)}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 9: SUPPLIER-WISE PURCHASE REPORT */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'supplier-purchase' && (<div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{'Supplier Name & Vendor'}</th>
                    <th className="py-3 px-4">{'Phone'}</th>
                    <th className="py-3 px-4 text-center">{'PO Orders'}</th>
                    <th className="py-3 px-4 text-right">{"Total PurchaseTk"}</th>
                    <th className="py-3 px-4 text-right">{"Total PaidTk"}</th>
                    <th className="py-3 px-4 text-right">{"Outstanding PayableTk"}</th>
                    <th className="py-3 px-4 text-right">{'Last Purchase Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPurchaseData.map((row, idx) => (<tr key={row.supplierId || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{row.name}</span>
                        {row.company && <span className="text-[11px] text-slate-500 block">{row.company}</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{row.phone || '-'}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                          {row.poCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {currency} {row.totalPurchased.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {currency} {row.totalPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        {currency} {row.totalDue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{row.lastOrderDate}</td>
                    </tr>))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right uppercase text-[11px]">
                      {'Grand Total:'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {supplierPurchaseData.reduce((a, b) => a + b.poCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency} {supplierPurchaseData.reduce((a, b) => a + b.totalPurchased, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {currency} {supplierPurchaseData.reduce((a, b) => a + b.totalPaid, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">
                      {currency} {supplierPurchaseData.reduce((a, b) => a + b.totalDue, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>)}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 10: SUPPLIER PAYABLES REPORT */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'supplier-payable' && (<div>
          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs mb-6 max-w-sm">
            <span className="text-xs text-rose-800 font-bold uppercase tracking-wider">
              {'Total Accounts Payable'}
            </span>
            <p className="text-2xl font-black text-rose-700 mt-1">
              {currency} {supplierPayablesData.reduce((a, b) => a + b.dueAmount, 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-500">
              {supplierPayablesData.length} {'unpaid PO bills'}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{'PO Ref & Date'}</th>
                    <th className="py-3 px-4">{'Supplier & Company'}</th>
                    <th className="py-3 px-4">{'Phone'}</th>
                    <th className="py-3 px-4 text-right">{"Bill AmountTk"}</th>
                    <th className="py-3 px-4 text-right">{"PaidTk"}</th>
                    <th className="py-3 px-4 text-right">{"Payable DueTk"}</th>
                    <th className="py-3 px-4 text-center">{'Aging Bracket'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPayablesData.length === 0 ? (<tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {'No outstanding supplier payables!'}
                      </td>
                    </tr>) : (supplierPayablesData.map((row, idx) => (<tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 font-mono block">{row.poNo}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{row.date}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{row.supplierName}</span>
                          <span className="text-[11px] text-slate-500 block">{row.company}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{row.phone}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {currency} {row.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {currency} {row.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm">
                          {currency} {row.dueAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${row.agingBadge}`}>
                            {row.agingBracket}
                          </span>
                        </td>
                      </tr>)))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px]">
                      {'Total Payables:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {currency} {supplierPayablesData.reduce((a, b) => a + b.totalAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {currency} {supplierPayablesData.reduce((a, b) => a + b.paidAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm font-black">
                      {currency} {supplierPayablesData.reduce((a, b) => a + b.dueAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>)}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 11: PURCHASE RETURNS & REFUND REPORT */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'purchase-return' && (<div>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {'Total Return Records'}
                </span>
                <RotateCcw className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{purchaseReturnsData.length}</p>
              <span className="text-[11px] text-slate-400">Audited PO return logs</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                  {'Supplier Refund Received'}
                </span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {currency} {purchaseReturnsData.reduce((a, b) => a + b.refundAmount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">Liquid cash / bank refunded</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                  {'Retained in Production'}
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {currency} {purchaseReturnsData.reduce((a, b) => a + b.retainedAmount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-amber-600 font-medium">Consumed in factory COGS</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Original Procured Value'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {currency} {purchaseReturnsData.reduce((a, b) => a + b.originalPoAmount, 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">Gross order commitments</span>
            </div>
          </div>

          {/* Search Filter (Screen only) */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={'Search return PO ref, supplier, or items...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{'Return Date & PO Ref'}</th>
                    <th className="py-3 px-4">{'Supplier & Contact'}</th>
                    <th className="py-3 px-4 text-center">{'Destination'}</th>
                    <th className="py-3 px-4 text-right">{"Original ValTk"}</th>
                    <th className="py-3 px-4 text-right">{"Retained (COGS)Tk"}</th>
                    <th className="py-3 px-4 text-right">{"Refund ReceivedTk"}</th>
                    <th className="py-3 px-4 text-center">{'Status'}</th>
                    <th className="py-3 px-4 text-center">{'Action / Breakdown'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseReturnsData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        {'No purchase returns or debit note records found'}
                      </td>
                    </tr>
                  ) : (
                    purchaseReturnsData.map((row, idx) => {
                      const isExpanded = expandedReturnId === row.id;
                      return (
                        <React.Fragment key={row.id}>
                          <tr className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 font-mono block">{row.poNo}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{row.returnDate}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{row.supplierName}</span>
                              <span className="text-[11px] text-slate-500 font-mono block">{row.phone}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.destination === 'Factory' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                {row.destination}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                              {currency} {row.originalPoAmount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono font-bold text-amber-700 block">
                                {currency} {row.retainedAmount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-block">
                                Consumed in BOM
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono font-black text-emerald-700 block text-sm">
                                {currency} {row.refundAmount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block font-semibold">
                                Refund Credited
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">
                                {row.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setExpandedReturnId(isExpanded ? null : row.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Hide</span>
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                  </>
                                ) : (
                                  <>
                                    <span>{row.items.length > 0 ? `${row.items.length} Items` : 'Details'}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expandable itemized audit tray */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-y border-slate-200">
                              <td colSpan={9} className="p-4">
                                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                    <div>
                                      <span className="text-xs font-bold text-slate-900 block">
                                        Audit Reason & Return Log:
                                      </span>
                                      <p className="text-xs text-slate-600 italic mt-0.5">{row.reason}</p>
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">
                                      <span>Original PO Date: {row.poDate}</span> | <span>Return Processed: {row.returnDate}</span>
                                    </div>
                                  </div>

                                  {/* Items Sub-table */}
                                  {row.items.length > 0 && (
                                    <div>
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                                        Item-wise Return & Production Consumption Breakdown:
                                      </span>
                                      <div className="overflow-x-auto rounded border border-slate-200">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px]">
                                            <tr>
                                              <th className="py-2 px-3">Item Description</th>
                                              <th className="py-2 px-3 text-center">Consumed (Factory)</th>
                                              <th className="py-2 px-3 text-right">Consumed Cost</th>
                                              <th className="py-2 px-3 text-center">Returned (Vendor)</th>
                                              <th className="py-2 px-3 text-right">Refund Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                            {row.items.map((it, iIdx) => (
                                              <tr key={it.productId || iIdx} className="hover:bg-slate-50/50">
                                                <td className="py-2 px-3 font-sans font-medium text-slate-900">
                                                  {it.name}
                                                </td>
                                                <td className="py-2 px-3 text-center text-amber-700 font-bold">
                                                  {it.consumedQty} pcs
                                                </td>
                                                <td className="py-2 px-3 text-right text-amber-700">
                                                  {currency} {(it.consumedAmount || 0).toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-center text-purple-700 font-bold">
                                                  {it.returnedQty} pcs
                                                </td>
                                                <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                                                  {currency} {(it.refundAmount || 0).toLocaleString()}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px]">
                      {'Grand Total Return Summary:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 text-sm">
                      {currency} {purchaseReturnsData.reduce((a, b) => a + b.originalPoAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700 text-sm">
                      {currency} {purchaseReturnsData.reduce((a, b) => a + b.retainedAmount, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm font-black">
                      {currency} {purchaseReturnsData.reduce((a, b) => a + b.refundAmount, 0).toLocaleString()}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>)}
    </div>);
};
