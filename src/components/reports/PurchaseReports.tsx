import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Language, CompanyProfile } from '../../types';
import { ShoppingBag, Truck, Building, CreditCard, Search, CheckCircle2, Clock, AlertTriangle, } from 'lucide-react';
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
    </div>);
};
