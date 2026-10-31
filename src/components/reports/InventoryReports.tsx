import React, { useState, useMemo } from 'react';
import { Product, StockMovement, SalesInvoice, PurchaseOrder, Language, CompanyProfile } from '../../types';
import { Package, ArrowDownRight, ArrowUpRight, RefreshCw, Search, AlertTriangle, CheckCircle2, Building2, Factory, } from 'lucide-react';
interface InventoryReportsProps {
    reportId: string;
    products: Product[];
    stockMovements: StockMovement[];
    invoices: SalesInvoice[];
    purchaseOrders: PurchaseOrder[];
    profile: CompanyProfile;
    language: Language;
}
export const InventoryReports: React.FC<InventoryReportsProps> = ({ reportId, products, stockMovements, invoices, purchaseOrders, profile, language, }) => {
    const isBn = language === 'bn';
    const currency = profile.currencySymbol || "Tk";
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'RAW' | 'FINISHED' | 'ALL'
    // Categories list
    const categories = useMemo(() => {
        const set = new Set<string>();
        products.forEach((p) => set.add(p.category));
        return Array.from(set);
    }, [products]);
    // -------------------------------------------------------------
    // 11. INVENTORY STOCK VALUATION REPORT
    // -------------------------------------------------------------
    const filteredStock = useMemo(() => {
        return products.filter((p) => {
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.nameBn && p.nameBn.toLowerCase().includes(searchTerm.toLowerCase())) ||
                p.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
            const matchType = typeFilter === 'ALL' ||
                (typeFilter === 'RAW' && p.isRawMaterial) ||
                (typeFilter === 'FINISHED' && !p.isRawMaterial);
            return matchSearch && matchCat && matchType;
        });
    }, [products, searchTerm, categoryFilter, typeFilter]);
    // -------------------------------------------------------------
    // 12. INVENTORY MOVEMENT REPORT (OPENING, IN, OUT, CLOSING)
    // -------------------------------------------------------------
    const movementReportData = useMemo(() => {
        return products.map((prod) => {
            const isMatch = (itemProdId?: string, itemName?: string) => {
                if (itemProdId && itemProdId === prod.id) return true;
                if (itemName && prod.name) {
                    const n1 = itemName.toLowerCase().trim();
                    const n2 = prod.name.toLowerCase().trim();
                    if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
                }
                return false;
            };

            // Calculate IN quantity from stockMovements or Purchase Orders marked received
            const inMovements = stockMovements
                .filter((sm) => sm.type === 'IN' && isMatch(sm.productId, sm.productName))
                .reduce((sum, sm) => sum + sm.qty, 0);
            // Calculate OUT quantity from stockMovements or Sales Invoices
            const outMovements = stockMovements
                .filter((sm) => sm.type === 'OUT' && isMatch(sm.productId, sm.productName))
                .reduce((sum, sm) => sum + sm.qty, 0);
            // In case stockMovements were empty or partial, fallback to aggregating from invoices & received POs
            const poIn = purchaseOrders
                .filter((po) => po.status === 'Received')
                .flatMap((po) => po.items)
                .filter((it) => isMatch(it.productId, it.name))
                .reduce((s, it) => s + (it.receivedQty !== undefined ? it.receivedQty : it.qty), 0);
            const invOut = invoices
                .flatMap((inv) => inv.items)
                .filter((it) => isMatch(it.productId, it.name))
                .reduce((s, it) => s + (Number(it.qty) || 0), 0);
            const totalIn = Math.max(inMovements, poIn);
            const totalOut = Math.max(outMovements, invOut);
            const currentClosing = (prod.stockOffice || 0) + (prod.stockFactory || 0);
            // Compute Opening Stock as: Closing + Out - In
            // (ensuring non-negative logical opening)
            const openingStock = Math.max(0, currentClosing + totalOut - totalIn);
            const closingValueCost = currentClosing * (prod.costPrice || 0);
            const closingValueRetail = currentClosing * (prod.unitPrice || 0);
            return {
                id: prod.id,
                code: prod.code,
                name: prod.name,
                nameBn: prod.nameBn,
                category: prod.category,
                unit: prod.unit,
                isRawMaterial: prod.isRawMaterial,
                costPrice: prod.costPrice || 0,
                unitPrice: prod.unitPrice || 0,
                openingStock,
                purchaseIn: totalIn,
                salesOut: totalOut,
                closingStock: currentClosing,
                stockOffice: prod.stockOffice || 0,
                stockFactory: prod.stockFactory || 0,
                closingValueCost,
                closingValueRetail,
                minStockAlert: prod.minStockAlert,
            };
        });
    }, [products, stockMovements, invoices, purchaseOrders]);
    const filteredMovements = useMemo(() => {
        return movementReportData.filter((item) => {
            const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.nameBn && item.nameBn.toLowerCase().includes(searchTerm.toLowerCase())) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
            return matchSearch && matchCat;
        });
    }, [movementReportData, searchTerm, categoryFilter]);
    return (<div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* REPORT 11: INVENTORY STOCK VALUATION */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'stock-summary' && (<div>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Total Catalog SKUs'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{filteredStock.length}</p>
              <span className="text-[11px] text-slate-400">
                {filteredStock.filter((p) => p.isRawMaterial).length} raw materials •{' '}
                {filteredStock.filter((p) => !p.isRawMaterial).length} products
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Stock Value at Cost'}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {currency}{' '}
                {filteredStock
                .reduce((sum, p) => sum + (p.stockOffice + p.stockFactory) * p.costPrice, 0)
                .toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">Asset valuation (COGS basis)</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Potential Retail Value'}
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {currency}{' '}
                {filteredStock
                .reduce((sum, p) => sum + (p.stockOffice + p.stockFactory) * p.unitPrice, 0)
                .toLocaleString()}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">Sales potential</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">
                {'Low Stock Warnings'}
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {filteredStock.filter((p) => p.stockOffice + p.stockFactory <= p.minStockAlert).length}
              </p>
              <span className="text-[11px] text-amber-600 font-medium">Reorder required soon</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
              <input type="text" placeholder={'Search by code or item name...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"/>
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="ALL">{'All Categories'}</option>
              {categories.map((c) => (<option key={c} value={c}>
                  {c}
                </option>))}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="ALL">{'All Products & Materials'}</option>
              <option value="FINISHED">{'Finished Goods'}</option>
              <option value="RAW">{'Raw Materials'}</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{'Item Code'}</th>
                    <th className="py-3 px-4">{'Product / Material'}</th>
                    <th className="py-3 px-4">{'Category'}</th>
                    <th className="py-3 px-4 text-right">{'Office Stock'}</th>
                    <th className="py-3 px-4 text-right">{'Factory Stock'}</th>
                    <th className="py-3 px-4 text-right">{'Total Stock'}</th>
                    <th className="py-3 px-4 text-right">{"CostTk"}</th>
                    <th className="py-3 px-4 text-right">{"PriceTk"}</th>
                    <th className="py-3 px-4 text-right">{'Value at Cost'}</th>
                    <th className="py-3 px-4 text-center">{'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStock.map((prod, idx) => {
                const totalQty = (prod.stockOffice || 0) + (prod.stockFactory || 0);
                const totalCostVal = totalQty * (prod.costPrice || 0);
                const isLow = totalQty <= prod.minStockAlert;
                return (<tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px]">{prod.code}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{prod.name}</span>
                          {prod.nameBn && <span className="text-[11px] text-slate-500 block">{prod.nameBn}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {prod.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {prod.stockOffice} {prod.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {prod.stockFactory} {prod.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {totalQty} {prod.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {currency} {prod.costPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900">
                          {currency} {prod.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {currency} {totalCostVal.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isLow
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {isLow ? ('Low Stock') : 'Optimal'}
                          </span>
                        </td>
                      </tr>);
            })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-right uppercase text-[11px]">
                      {'Total Stock Valuation at Cost:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {filteredStock.reduce((s, p) => s + (p.stockOffice + p.stockFactory), 0).toLocaleString()}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right font-mono text-slate-400">
                      -
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                      {currency}{' '}
                      {filteredStock
                .reduce((sum, p) => sum + (p.stockOffice + p.stockFactory) * p.costPrice, 0)
                .toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>)}

      {/* ------------------------------------------------------------- */}
      {/* REPORT 12: INVENTORY MOVEMENT (OPENING, IN, OUT, CLOSING) */}
      {/* ------------------------------------------------------------- */}
      {reportId === 'stock-movement' && (<div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {'Stock Movement Reconciliation Formula'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {'Closing Stock = Opening Stock + Purchase Inward - Sales Outward'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  <ArrowDownRight className="w-3.5 h-3.5 text-blue-600"/>
                  + In: {filteredMovements.reduce((s, m) => s + m.purchaseIn, 0)} units
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600"/>
                  - Out: {filteredMovements.reduce((s, m) => s + m.salesOut, 0)} units
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{'Code'}</th>
                    <th className="py-3 px-4">{'Item Description'}</th>
                    <th className="py-3 px-4 text-center">{'Unit'}</th>
                    <th className="py-3 px-4 text-right bg-slate-100/50">{'Opening Stock'}</th>
                    <th className="py-3 px-4 text-right text-blue-700 bg-blue-50/30">
                      {'Purchase In (+)'}
                    </th>
                    <th className="py-3 px-4 text-right text-rose-700 bg-rose-50/30">
                      {'Sales Out (-)'}
                    </th>
                    <th className="py-3 px-4 text-right font-black text-slate-900 bg-slate-100/70">
                      {'Closing Stock'}
                    </th>
                    <th className="py-3 px-4 text-right">{'Cost Rate'}</th>
                    <th className="py-3 px-4 text-right">{"Closing ValueTk"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.map((m, idx) => (<tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 text-[11px]">{m.code}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {m.name}
                        {m.nameBn && <span className="text-[11px] text-slate-500 block">{m.nameBn}</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">{m.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 bg-slate-50/40">
                        {m.openingStock.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 bg-blue-50/20">
                        +{m.purchaseIn.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                        -{m.salesOut.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm bg-slate-50/70">
                        {m.closingStock.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {currency} {m.costPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        {currency} {m.closingValueCost.toLocaleString()}
                      </td>
                    </tr>))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px]">
                      {'Total Movement Summary:'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono bg-slate-100/50">
                      {filteredMovements.reduce((s, m) => s + m.openingStock, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-700 bg-blue-50/30">
                      +{filteredMovements.reduce((s, m) => s + m.purchaseIn, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 bg-rose-50/30">
                      -{filteredMovements.reduce((s, m) => s + m.salesOut, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm bg-slate-100/70">
                      {filteredMovements.reduce((s, m) => s + m.closingStock, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                      {currency}{' '}
                      {filteredMovements.reduce((s, m) => s + m.closingValueCost, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>)}
    </div>);
};
