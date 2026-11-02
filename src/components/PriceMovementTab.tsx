import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Layers,
  Search,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { PurchaseOrder, ProductItem } from '../types';

interface PriceMovementTabProps {
  onViewPO?: (poNo: string) => void;
}

type TimeRangeFilter = '7d' | '30d' | '90d' | 'custom' | 'all';

interface FlattenedPurchaseRecord {
  id: string;
  poId: string;
  poNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  destination: string;
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  status: string;
}

export const PriceMovementTab: React.FC<PriceMovementTabProps> = ({ onViewPO }) => {
  const { purchaseOrders = [], products = [], profile, language } = useApp();

  const isBn = language === 'bn';
  const currency = profile?.currencySymbol || '৳';

  // State
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [showGraph, setShowGraph] = useState<boolean>(true);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // 1. Collect all raw materials available in system or referenced in POs
  const rawMaterialsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; unit: string; category?: string }>();

    // From product catalog
    (products || []).forEach((p) => {
      if (p.isRawMaterial || (p.category && p.category.toLowerCase().includes('raw'))) {
        map.set(p.id, { id: p.id, name: p.name, unit: p.unit, category: p.category });
      }
    });

    // From POs as well
    (purchaseOrders || []).forEach((po) => {
      (po.items || []).forEach((item) => {
        if (!map.has(item.productId)) {
          map.set(item.productId, {
            id: item.productId,
            name: item.name,
            unit: item.unit || 'pcs',
            category: 'Material',
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, purchaseOrders]);

  // 2. Extract flattened item purchase records
  const allPurchaseRecords = useMemo<FlattenedPurchaseRecord[]>(() => {
    const list: FlattenedPurchaseRecord[] = [];

    (purchaseOrders || []).forEach((po) => {
      const poNum = po.poNumber || po.poNo || 'DCC-PO';
      const poDate = po.date || new Date().toISOString().slice(0, 10);
      const dest = po.destinationLocation || po.destination || 'Factory';

      (po.items || []).forEach((item, idx) => {
        const qty = Number(item.qty || 0);
        const cost = Number(item.unitCost || 0);
        const total = Number(item.totalCost || qty * cost);

        list.push({
          id: `${po.id}-${idx}`,
          poId: po.id,
          poNo: poNum,
          date: poDate,
          supplierId: po.supplierId || '',
          supplierName: po.supplierName || 'Unknown Vendor',
          destination: dest,
          productId: item.productId,
          productName: item.name,
          unit: item.unit || 'pcs',
          qty,
          unitCost: cost,
          totalCost: total,
          status: po.status || 'Received',
        });
      });
    });

    // Sort chronologically ascending for trend line calculations
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [purchaseOrders]);

  // 3. Filter by Time Range
  const dateFilteredRecords = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return allPurchaseRecords.filter((rec) => {
      const recDate = new Date(rec.date);
      if (isNaN(recDate.getTime())) return true;

      if (timeRange === '7d') {
        const limit = new Date(today);
        limit.setDate(limit.getDate() - 7);
        limit.setHours(0, 0, 0, 0);
        return recDate >= limit && recDate <= today;
      }
      if (timeRange === '30d') {
        const limit = new Date(today);
        limit.setDate(limit.getDate() - 30);
        limit.setHours(0, 0, 0, 0);
        return recDate >= limit && recDate <= today;
      }
      if (timeRange === '90d') {
        const limit = new Date(today);
        limit.setDate(limit.getDate() - 90);
        limit.setHours(0, 0, 0, 0);
        return recDate >= limit && recDate <= today;
      }
      if (timeRange === 'custom') {
        const start = customStartDate ? new Date(customStartDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        const end = customEndDate ? new Date(customEndDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        if (start && recDate < start) return false;
        if (end && recDate > end) return false;
        return true;
      }
      // 'all'
      return true;
    });
  }, [allPurchaseRecords, timeRange, customStartDate, customEndDate]);

  // 4. Filter by Product
  const productFilteredRecords = useMemo(() => {
    if (selectedProductId === 'all') {
      return dateFilteredRecords;
    }
    return dateFilteredRecords.filter(
      (r) => r.productId === selectedProductId || r.productName === selectedProductId
    );
  }, [dateFilteredRecords, selectedProductId]);

  // 5. Calculate KPI Metrics
  const metrics = useMemo(() => {
    if (productFilteredRecords.length === 0) {
      return {
        latestRate: 0,
        averageRate: 0,
        lowestRate: 0,
        highestRate: 0,
        rateDelta: 0,
        rateDeltaPercent: 0,
        totalPurchasedQty: 0,
        totalSpend: 0,
        count: 0,
        primaryUnit: '',
      };
    }

    const rates = productFilteredRecords.map((r) => r.unitCost);
    const latestRec = productFilteredRecords[productFilteredRecords.length - 1];
    const oldestRec = productFilteredRecords[0];

    const latestRate = latestRec.unitCost;
    const oldestRate = oldestRec.unitCost;
    const lowestRate = Math.min(...rates);
    const highestRate = Math.max(...rates);

    const totalQty = productFilteredRecords.reduce((acc, r) => acc + r.qty, 0);
    const totalSpend = productFilteredRecords.reduce((acc, r) => acc + r.totalCost, 0);
    const averageRate = totalQty > 0 ? totalSpend / totalQty : latestRate;

    const rateDelta = latestRate - oldestRate;
    const rateDeltaPercent = oldestRate > 0 ? (rateDelta / oldestRate) * 100 : 0;

    return {
      latestRate,
      averageRate,
      lowestRate,
      highestRate,
      rateDelta,
      rateDeltaPercent,
      totalPurchasedQty: totalQty,
      totalSpend,
      count: productFilteredRecords.length,
      primaryUnit: latestRec.unit,
    };
  }, [productFilteredRecords]);

  // 6. Chart Data Preparation
  const chartData = useMemo(() => {
    if (productFilteredRecords.length === 0) return [];

    // Group by Date for the chart
    const byDate = new Map<string, {
      date: string;
      formattedDate: string;
      unitCost: number;
      qty: number;
      totalSpend: number;
      suppliers: string[];
      items: string[];
    }>();

    productFilteredRecords.forEach((rec) => {
      const dKey = rec.date;
      const existing = byDate.get(dKey);

      if (!existing) {
        // Format display date: e.g. 02 Nov
        let displayDate = dKey;
        try {
          const dt = new Date(dKey);
          displayDate = dt.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
            month: 'short',
            day: 'numeric',
          });
        } catch {}

        byDate.set(dKey, {
          date: dKey,
          formattedDate: displayDate,
          unitCost: rec.unitCost,
          qty: rec.qty,
          totalSpend: rec.totalCost,
          suppliers: [rec.supplierName],
          items: [rec.productName],
        });
      } else {
        existing.qty += rec.qty;
        existing.totalSpend += rec.totalCost;
        // Weighted average cost for the date
        existing.unitCost = Math.round((existing.totalSpend / existing.qty) * 100) / 100;
        if (!existing.suppliers.includes(rec.supplierName)) {
          existing.suppliers.push(rec.supplierName);
        }
        if (!existing.items.includes(rec.productName)) {
          existing.items.push(rec.productName);
        }
      }
    });

    return Array.from(byDate.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [productFilteredRecords, isBn]);

  // 7. Table records with movement delta vs immediate prior purchase of the SAME item
  const tableRecordsWithDelta = useMemo(() => {
    // We sort descending for display in table (latest first)
    const sortedDesc = [...productFilteredRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Map prior cost by item
    return sortedDesc.map((rec, index) => {
      // Find the next older record of the exact same product
      const older = sortedDesc.slice(index + 1).find((r) => r.productId === rec.productId);
      let diff = 0;
      let diffPercent = 0;
      if (older && older.unitCost > 0) {
        diff = rec.unitCost - older.unitCost;
        diffPercent = (diff / older.unitCost) * 100;
      }
      return {
        ...rec,
        diff,
        diffPercent,
        hasPrior: Boolean(older),
      };
    });
  }, [productFilteredRecords]);

  // Filtered table view
  const displayTableRecords = useMemo(() => {
    const q = searchTableQuery.toLowerCase().trim();
    if (!q) return tableRecordsWithDelta;
    return tableRecordsWithDelta.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.poNo.toLowerCase().includes(q)
    );
  }, [tableRecordsWithDelta, searchTableQuery]);

  // Selected item name for headings
  const selectedMaterialName = useMemo(() => {
    if (selectedProductId === 'all') return isBn ? 'সকল কাঁচামাল' : 'All Raw Materials';
    const match = rawMaterialsList.find((m) => m.id === selectedProductId);
    return match ? match.name : selectedProductId;
  }, [selectedProductId, rawMaterialsList, isBn]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Description */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {isBn ? 'কাঁচামালের মূল্য পরিবর্তন ও গতিধারা' : 'Raw Material Price Movement & Trends'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  {isBn ? 'বিশ্লেষণ' : 'Analytics'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isBn
                  ? 'ক্রয়কৃত কাঁচামালের দর ওঠা-নামা পর্যবেক্ষণ করুন এবং সাশ্রয়ী সরবরাহকারী নির্বাচন করুন'
                  : 'Track procurement price fluctuations, detect cost spikes, and analyze vendor pricing trends'}
              </p>
            </div>
          </div>

          {/* Quick Filters & Graph On/Off Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Graph Toggle Button */}
            <button
              type="button"
              onClick={() => setShowGraph(!showGraph)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                showGraph
                  ? 'bg-amber-500/10 text-amber-700 border-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title={showGraph ? 'Hide Trend Graph' : 'Show Trend Graph'}
            >
              {showGraph ? <Eye className="w-4 h-4 text-amber-600" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
              <span>{showGraph ? (isBn ? 'গ্রাফ: চালু (ON)' : 'Graph: ON') : (isBn ? 'গ্রাফ: বন্ধ (OFF)' : 'Graph: OFF')}</span>
              <span
                className={`w-2 h-2 rounded-full ${showGraph ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}
              />
            </button>
          </div>
        </div>

        {/* Filters Row: Material Selector + Date Range Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Material Dropdown */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-400" />
              {isBn ? 'কাঁচামাল নির্বাচন:' : 'Select Material:'}
            </span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">{isBn ? 'সকল কাঁচামাল (All Materials)' : 'All Raw Materials (Overall)'}</option>
              {rawMaterialsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.unit ? `(${m.unit})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Presets */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: '7d', en: 'Weekly (7D)', bn: 'সাপ্তাহিক (৭ দিন)' },
                { id: '30d', en: 'Monthly (30D)', bn: 'মাসিক (৩০ দিন)' },
                { id: '90d', en: '3 Months', bn: '৩ মাস' },
                { id: 'all', en: 'All Records', bn: 'সর্বকালীন' },
                { id: 'custom', en: 'Custom Range', bn: 'কাস্টম তারিখ' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setTimeRange(preset.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  timeRange === preset.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isBn ? preset.bn : preset.en}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker when selected */}
        {timeRange === 'custom' && (
          <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              {isBn ? 'কাস্টম তারিখ নির্ধারণ করুন:' : 'Custom Date Range:'}
            </span>
            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-medium">{isBn ? 'শুরু:' : 'From:'}</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-medium">{isBn ? 'শেষ:' : 'To:'}</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-800"
              />
            </div>
            <span className="text-[11px] text-amber-800/80 italic ml-auto">
              {isBn ? 'ফিল্টার কার্যকর হয়েছে' : 'Applied custom interval'}
            </span>
          </div>
        )}
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Latest Purchase Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">
              {isBn ? 'সর্বশেষ ক্রয়মূল্য' : 'Latest Purchase Rate'}
            </span>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {currency}
            {metrics.latestRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block font-medium">
            {metrics.primaryUnit ? `per ${metrics.primaryUnit}` : 'per unit'}
          </span>
        </div>

        {/* Average Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">
              {isBn ? 'গড় ক্রয়মূল্য' : 'Average Rate'}
            </span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {currency}
            {Math.round(metrics.averageRate).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block font-medium">
            {isBn ? `${metrics.count}টি ক্রয়ের গড়` : `Weighted avg across ${metrics.count} records`}
          </span>
        </div>

        {/* Lowest Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-700">
              {isBn ? 'সর্বনিম্ন দর' : 'Lowest Rate Paid'}
            </span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px]">
              MIN
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {currency}
            {metrics.lowestRate.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block font-medium">
            {isBn ? 'সেরা সাশ্রয়ী দর' : 'Best purchase rate'}
          </span>
        </div>

        {/* Highest Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-700">
              {isBn ? 'সর্বোচ্চ দর' : 'Highest Rate Paid'}
            </span>
            <span className="p-1 rounded-lg bg-rose-50 text-rose-600 font-bold text-[10px]">
              PEAK
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            {currency}
            {metrics.highestRate.toLocaleString()}
          </div>
          <span className="text-[11px] text-rose-600/80 mt-1 block font-medium">
            {isBn ? 'পিক ক্রয়মূল্য' : 'Peak recorded cost'}
          </span>
        </div>

        {/* Price Trend % */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">
              {isBn ? 'দর পরিবর্তন (Trend)' : 'Net Price Trend'}
            </span>
            {metrics.rateDelta > 0 ? (
              <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            ) : metrics.rateDelta < 0 ? (
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="p-1 rounded-lg bg-slate-100 text-slate-600">
                <Minus className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              metrics.rateDelta > 0
                ? 'text-rose-600'
                : metrics.rateDelta < 0
                ? 'text-emerald-600'
                : 'text-slate-700'
            }`}
          >
            {metrics.rateDelta > 0 ? '+' : ''}
            {metrics.rateDeltaPercent.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block font-medium">
            {metrics.rateDelta > 0
              ? isBn
                ? 'মূল্য বৃদ্ধি পেয়েছে (Cost increased)'
                : 'Price increased over period'
              : metrics.rateDelta < 0
              ? isBn
                ? 'মূল্য হ্রাস পেয়েছে (Cost reduced)'
                : 'Price dropped over period'
              : isBn
                ? 'মূল্য অপরিবর্তিত (Stable)'
                : 'Stable price'}
          </span>
        </div>
      </div>

      {/* 3. Interactive Line Chart (Toggleable On / Off) */}
      {showGraph ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{selectedMaterialName}</span>
                <span className="text-xs font-medium text-slate-500">
                  {isBn ? 'দর ওঠানামা রেখাচিত্র (Price Movement Graph)' : 'Price Fluctuation Trend'}
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                {isBn
                  ? `ক্রয়ের তারিখ অনুযায়ী একক মূল্য (${currency}) এর পরিবর্তন চিত্র`
                  : `Unit rate progression in ${currency} plotted against PO purchase dates`}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
              <span>{isBn ? 'একক ক্রয় দর (৳ / Unit Rate)' : 'Purchase Rate (৳)'}</span>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 25, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(v) => `${currency}${v}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800">
                            <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">
                              {data.formattedDate} ({data.date})
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">{isBn ? 'একক দর:' : 'Unit Rate:'}</span>
                              <span className="font-bold text-white">
                                {currency}
                                {data.unitCost}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">{isBn ? 'পরিমাণ:' : 'Total Qty:'}</span>
                              <span className="font-medium text-slate-200">{data.qty}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">{isBn ? 'মোট খরচ:' : 'Total Cost:'}</span>
                              <span className="font-semibold text-emerald-400">
                                {currency}
                                {data.totalSpend.toLocaleString()}
                              </span>
                            </div>
                            {data.suppliers && data.suppliers.length > 0 && (
                              <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800">
                                <span className="font-medium text-slate-300">
                                  {isBn ? 'ভেন্ডর: ' : 'Vendor: '}
                                </span>
                                {data.suppliers.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="unitCost"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#d97706', stroke: '#fff', strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Package className="w-8 h-8 text-slate-300 mb-2" />
              <span>
                {isBn
                  ? 'নির্বাচিত তারিখের মধ্যে কোনো ক্রয়ের রেকর্ড পাওয়া যায়নি'
                  : 'No purchase records found for the selected material and date range.'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
            <EyeOff className="w-4 h-4 text-slate-400" />
            {isBn
              ? 'গ্রাফ বন্ধ রাখা হয়েছে। দেখতে চাইলে উপরে "গ্রাফ: চালু" বাটনে ক্লিক করুন।'
              : 'Graph is currently hidden. Click "Graph: OFF" button above to turn it ON.'}
          </p>
        </div>
      )}

      {/* 4. Detailed Purchase Price History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Filter / Search Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {isBn ? 'ক্রয়মূল্যের বিস্তারিত হিস্ট্রি ও তুলনা' : 'Purchase Price History & Movement Log'}
            </h4>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'প্রতিটি অর্ডারে কাঁচামালের দর ও পূর্ববর্তী অর্ডারের সাথে মূল্যের পরিবর্তন'
                : 'Itemized purchase rates with variance vs previous purchase of each material'}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTableQuery}
              onChange={(e) => setSearchTableQuery(e.target.value)}
              placeholder={isBn ? 'আইটেম, ভেন্ডর বা PO নং খুঁজুন...' : 'Search item, vendor or PO#...'}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">{isBn ? 'তারিখ' : 'Date'}</th>
                <th className="py-3 px-4">{isBn ? 'কাঁচামাল' : 'Raw Material'}</th>
                <th className="py-3 px-4">{isBn ? 'PO রেফারেন্স' : 'PO Ref'}</th>
                <th className="py-3 px-4">{isBn ? 'সরবরাহকারী / ভেন্ডর' : 'Supplier / Vendor'}</th>
                <th className="py-3 px-4">{isBn ? 'গুদাম' : 'Location'}</th>
                <th className="py-3 px-4 text-right">{isBn ? 'পরিমাণ' : 'Qty & Unit'}</th>
                <th className="py-3 px-4 text-right">{isBn ? 'একক দর' : 'Unit Rate'}</th>
                <th className="py-3 px-4 text-center">{isBn ? 'পূর্বের তুলনায় পরিবর্তন' : 'Movement vs Prior'}</th>
                <th className="py-3 px-4 text-right">{isBn ? 'মোট খরচ' : 'Total Cost'}</th>
                <th className="py-3 px-4 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {displayTableRecords.length > 0 ? (
                displayTableRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 text-slate-900 whitespace-nowrap font-bold">
                      {rec.date}
                    </td>

                    {/* Material */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rec.productName}</div>
                      <div className="text-[10px] text-slate-400">Unit: {rec.unit}</div>
                    </td>

                    {/* PO No */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {onViewPO ? (
                        <button
                          type="button"
                          onClick={() => onViewPO(rec.poNo)}
                          className="font-bold text-amber-600 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Open Purchase Order"
                        >
                          <span>{rec.poNo}</span>
                          <ExternalLink className="w-3 h-3 text-amber-500" />
                        </button>
                      ) : (
                        <span className="font-bold text-slate-800">{rec.poNo}</span>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{rec.supplierName}</div>
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {rec.destination}
                      </span>
                    </td>

                    {/* Qty & Unit */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {rec.qty.toLocaleString()} <span className="text-slate-500 font-normal">{rec.unit}</span>
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      {currency}
                      {rec.unitCost.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Movement vs Prior */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {rec.hasPrior ? (
                        rec.diff > 0 ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            <span>
                              +{currency}
                              {rec.diff} (+{rec.diffPercent.toFixed(1)}%)
                            </span>
                          </span>
                        ) : rec.diff < 0 ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                            <span>
                              -{currency}
                              {Math.abs(rec.diff)} ({rec.diffPercent.toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            <Minus className="w-3 h-3" />
                            <span>{isBn ? 'একই দর' : '0% (Same)'}</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          {isBn ? 'প্রথম ক্রয়' : 'Initial record'}
                        </span>
                      )}
                    </td>

                    {/* Total Cost */}
                    <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      {currency}
                      {rec.totalCost.toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'Received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'Ordered'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>
                      {isBn
                        ? 'কোনো ক্রয়মূল্যের রেকর্ড খুঁজে পাওয়া যায়নি'
                        : 'No purchase records found for this filter.'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
