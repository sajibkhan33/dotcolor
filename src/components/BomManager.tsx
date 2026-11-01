import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { BillOfMaterial, BomComponent, ProductItem } from '../types';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  X,
  PlayCircle,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Boxes,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Eye,
} from 'lucide-react';

export const BomManager: React.FC = () => {
  const {
    bomList,
    products,
    addBom,
    updateBom,
    deleteBom,
    produceBatch,
    profile,
    checkPermission,
    activeStaff,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'auto_deduct' | 'manual'>('all');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingBom, setEditingBom] = useState<BillOfMaterial | null>(null);
  const [viewingBom, setViewingBom] = useState<BillOfMaterial | null>(null);
  const [producingBom, setProducingBom] = useState<BillOfMaterial | null>(null);
  const [bomToDelete, setBomToDelete] = useState<BillOfMaterial | null>(null);

  // Batch production state
  const [batchQty, setBatchQty] = useState<number>(10);
  const [batchLocation, setBatchLocation] = useState<'Factory' | 'Office'>('Factory');
  const [productionMessage, setProductionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for Add / Edit BOM
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [autoDeductOnSale, setAutoDeductOnSale] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [components, setComponents] = useState<BomComponent[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const isSuperAdmin = activeStaff?.role === 'Super Admin' || activeStaff?.role === 'SUPER_ADMIN';
  const canManageBom =
    isSuperAdmin ||
    Boolean(
      checkPermission &&
        (checkPermission('inventory.manage_bom') || checkPermission('inventory.view'))
    );

  // Finished Goods list (products that are not raw materials)
  const finishedProducts = useMemo(() => {
    return (products || []).filter((p) => !p.isRawMaterial);
  }, [products]);

  // Raw Materials list (products marked as raw materials)
  const rawMaterials = useMemo(() => {
    return (products || []).filter((p) => p.isRawMaterial);
  }, [products]);

  // Filtered BOMs list
  const filteredBoms = useMemo(() => {
    return (bomList || []).filter((bom) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        bom.finishedProductName.toLowerCase().includes(q) ||
        bom.finishedProductCode.toLowerCase().includes(q) ||
        (bom.components || []).some(
          (c) =>
            c.rawMaterialName.toLowerCase().includes(q) ||
            c.rawMaterialCode.toLowerCase().includes(q)
        );

      if (!matchesSearch) return false;

      if (filterMode === 'auto_deduct') {
        return bom.autoDeductOnSale !== false;
      }
      if (filterMode === 'manual') {
        return bom.autoDeductOnSale === false;
      }
      return true;
    });
  }, [bomList, searchQuery, filterMode]);

  // Stats
  const totalBoms = (bomList || []).length;
  const autoDeductCount = (bomList || []).filter((b) => b.autoDeductOnSale !== false).length;
  const uniqueRawMaterialsLinked = useMemo(() => {
    const rmIds = new Set<string>();
    (bomList || []).forEach((b) => {
      (b.components || []).forEach((c) => rmIds.add(c.rawMaterialId));
    });
    return rmIds.size;
  }, [bomList]);

  // Open Create Modal
  const handleOpenCreate = () => {
    // Pick the first finished product that doesn't have a BOM yet, if available
    const existingProductIds = new Set((bomList || []).map((b) => b.finishedProductId));
    const defaultProduct = finishedProducts.find((p) => !existingProductIds.has(p.id)) || finishedProducts[0];

    setSelectedProductId(defaultProduct ? defaultProduct.id : '');
    setAutoDeductOnSale(true);
    setNotes('');
    setFormError(null);
    setEditingBom(null);

    // Initial default empty component row if raw materials exist
    if (rawMaterials.length > 0) {
      const firstRm = rawMaterials[0];
      const unitCost = Number(firstRm.costPrice || firstRm.purchasePrice || 0);
      setComponents([
        {
          rawMaterialId: firstRm.id,
          rawMaterialCode: firstRm.code,
          rawMaterialName: firstRm.name,
          quantity: 1,
          unit: firstRm.unit || 'sqft',
          unitCost: unitCost,
          totalCost: unitCost,
        },
      ]);
    } else {
      setComponents([]);
    }

    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (bom: BillOfMaterial) => {
    setSelectedProductId(bom.finishedProductId);
    setAutoDeductOnSale(bom.autoDeductOnSale !== false);
    setNotes(bom.notes || '');
    setFormError(null);
    setEditingBom(bom);
    setComponents(
      (bom.components || []).map((c) => ({
        ...c,
        totalCost: Math.round((Number(c.quantity) || 0) * (Number(c.unitCost) || 0) * 100) / 100,
      }))
    );
    setShowAddEditModal(true);
  };

  // Add Component Row
  const handleAddComponentRow = () => {
    if (rawMaterials.length === 0) return;
    // Try to pick one not already in components
    const usedIds = new Set(components.map((c) => c.rawMaterialId));
    const nextRm = rawMaterials.find((rm) => !usedIds.has(rm.id)) || rawMaterials[0];
    const unitCost = Number(nextRm.costPrice || nextRm.purchasePrice || 0);

    setComponents((prev) => [
      ...prev,
      {
        rawMaterialId: nextRm.id,
        rawMaterialCode: nextRm.code,
        rawMaterialName: nextRm.name,
        quantity: 1,
        unit: nextRm.unit || 'sqft',
        unitCost: unitCost,
        totalCost: unitCost,
      },
    ]);
  };

  // Update Component Row
  const handleUpdateComponent = (
    index: number,
    field: keyof BomComponent,
    val: any
  ) => {
    setComponents((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };

      if (field === 'rawMaterialId') {
        const matched = rawMaterials.find((r) => r.id === val);
        if (matched) {
          target.rawMaterialId = matched.id;
          target.rawMaterialCode = matched.code;
          target.rawMaterialName = matched.name;
          target.unit = matched.unit || 'sqft';
          target.unitCost = Number(matched.costPrice || matched.purchasePrice || 0);
          target.totalCost = Math.round((Number(target.quantity) || 0) * target.unitCost * 100) / 100;
        }
      } else if (field === 'quantity') {
        const q = Number(val) || 0;
        target.quantity = q;
        target.totalCost = Math.round(q * (Number(target.unitCost) || 0) * 100) / 100;
      } else if (field === 'unitCost') {
        const uc = Number(val) || 0;
        target.unitCost = uc;
        target.totalCost = Math.round((Number(target.quantity) || 0) * uc * 100) / 100;
      } else {
        (target as any)[field] = val;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Remove Component Row
  const handleRemoveComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  // Total BOM estimated cost
  const calculatedTotalBomCost = useMemo(() => {
    return components.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  }, [components]);

  // Save BOM Form
  const handleSaveBom = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const product = finishedProducts.find((p) => p.id === selectedProductId);
    if (!product) {
      setFormError('Please select a valid finished product.');
      return;
    }

    if (components.length === 0) {
      setFormError('Please add at least one raw material component to the BOM recipe.');
      return;
    }

    // Validate that each component has a valid quantity
    for (let i = 0; i < components.length; i++) {
      if (!components[i].quantity || components[i].quantity <= 0) {
        setFormError(`Component "${components[i].rawMaterialName}" must have a quantity greater than 0.`);
        return;
      }
    }

    const payload = {
      finishedProductId: product.id,
      finishedProductCode: product.code,
      finishedProductName: product.name,
      outputUnit: product.unit || 'pcs',
      components: components.map((c) => ({
        ...c,
        quantity: Number(c.quantity) || 0,
        unitCost: Number(c.unitCost) || 0,
        totalCost: Math.round((Number(c.quantity) || 0) * (Number(c.unitCost) || 0) * 100) / 100,
      })),
      totalCost: Math.round(calculatedTotalBomCost * 100) / 100,
      notes: notes.trim(),
      autoDeductOnSale,
    };

    if (editingBom) {
      updateBom(editingBom.id, payload);
    } else {
      addBom(payload);
    }

    setShowAddEditModal(false);
  };

  // Open Produce Batch Modal
  const handleOpenProduce = (bom: BillOfMaterial) => {
    setProducingBom(bom);
    setBatchQty(10);
    setBatchLocation('Factory');
    setProductionMessage(null);
  };

  // Execute Batch Production
  const handleExecuteProduction = () => {
    if (!producingBom || batchQty <= 0) return;
    const res = produceBatch(producingBom.id, batchQty, batchLocation);
    if (res.success) {
      setProductionMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setProducingBom(null);
        setProductionMessage(null);
      }, 2500);
    } else {
      setProductionMessage({ type: 'error', text: res.message });
    }
  };

  // Toggle Auto Deduct on Sale directly from row
  const handleToggleAutoDeduct = (bom: BillOfMaterial) => {
    updateBom(bom.id, {
      autoDeductOnSale: bom.autoDeductOnSale === false ? true : false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  Bill of Materials (BOM)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Manufacturing & Consumption
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                উৎপাদন রেসিপি ও কাঁচামাল কনজাম্পশন ফর্মুলা: বিক্রয় ইনভয়েসের সাথে স্বয়ংক্রিয় স্টক কর্তন এবং ম্যানুয়াল ব্যাচ প্রোডাকশন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {canManageBom && (
              <>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Formula</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total BOM Formulas
              </div>
              <div className="text-base font-bold text-slate-800">
                {totalBoms} Recipes
              </div>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Auto-Deduct on Sale
              </div>
              <div className="text-base font-bold text-emerald-700">
                {autoDeductCount} Active
              </div>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Raw Materials Linked
              </div>
              <div className="text-base font-bold text-slate-800">
                {uniqueRawMaterialsLinked} Materials
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search finished product, code or raw material..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Formulas ({totalBoms})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('auto_deduct')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'auto_deduct'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Auto-Deduct Active ({autoDeductCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('manual')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'manual'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Manual Batch Only ({totalBoms - autoDeductCount})
          </button>
        </div>
      </div>

      {/* BOM Formulas Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Finished Product</th>
                <th className="py-3 px-4">Recipe Components</th>
                <th className="py-3 px-4 text-right">Est. Raw Material Cost</th>
                <th className="py-3 px-4 text-center">Auto-Deduct on Sale</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBoms.map((bom) => {
                const finishedProduct = products.find((p) => p.id === bom.finishedProductId);
                const currentStockTotal = finishedProduct ? (Number(finishedProduct.stock) || 0) : 0;
                const isAuto = bom.autoDeductOnSale !== false;

                return (
                  <tr key={bom.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {bom.finishedProductName}
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {bom.finishedProductCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Unit: <strong className="text-slate-600 font-semibold">{bom.outputUnit}</strong></span>
                            <span>•</span>
                            <span>Current Stock: <strong className={currentStockTotal > 0 ? 'text-emerald-600' : 'text-rose-500'}>{currentStockTotal} {bom.outputUnit}</strong></span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1.5">
                          {(bom.components || []).slice(0, 3).map((comp, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70"
                            >
                              <span className="font-bold text-blue-700">{comp.quantity} {comp.unit}</span>
                              <span className="truncate max-w-[120px]">{comp.rawMaterialName}</span>
                            </span>
                          ))}
                          {(bom.components || []).length > 3 && (
                            <button
                              type="button"
                              onClick={() => setViewingBom(bom)}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                            >
                              +{(bom.components || []).length - 3} more
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Total {(bom.components || []).length} raw material components
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {profile.currencySymbol}
                        {(Number(bom.totalCost) || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        per 1 {bom.outputUnit}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAutoDeduct(bom)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                          isAuto
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle auto stock deduction on sales"
                      >
                        {isAuto ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Auto-Deduct ON</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span>Manual Only</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Run Batch Production Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenProduce(bom)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                          title="Run Batch Production"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Produce</span>
                        </button>

                        {/* View Recipe Button */}
                        <button
                          type="button"
                          onClick={() => setViewingBom(bom)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
                          title="View Formula Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        {canManageBom && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(bom)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
                            title="Edit BOM Formula"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Button */}
                        {canManageBom && (
                          <button
                            type="button"
                            onClick={() => setBomToDelete(bom)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200"
                            title="Delete BOM"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBoms.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          No Bill of Materials (BOM) found
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchQuery
                            ? 'No formulas matched your search keywords.'
                            : 'Create manufacturing recipes to auto-deduct raw materials upon sales or run batch production.'}
                        </p>
                      </div>
                      {canManageBom && !searchQuery && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create First BOM Formula</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATE / EDIT BOM MODAL */}
      {/* ========================================================================= */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingBom ? 'Edit Bill of Materials (BOM)' : 'Create New Bill of Materials (BOM)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define the raw materials and recipe required to produce 1 unit of finished product
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBom} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product selection and auto-deduct switch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Finished Good / Service Item <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={Boolean(editingBom)}
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-75 disabled:bg-slate-100"
                    required
                  >
                    <option value="" disabled>-- Select Finished Product --</option>
                    {finishedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) — {p.unit || 'pcs'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Auto-Deduct on Invoice Sale
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Automatically reduce raw materials when sold via POS/Invoice
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoDeductOnSale(!autoDeductOnSale)}
                      className={`p-1 rounded-lg transition-colors ${
                        autoDeductOnSale ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {autoDeductOnSale ? (
                        <ToggleRight className="w-7 h-7" />
                      ) : (
                        <ToggleLeft className="w-7 h-7" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Components Dynamic Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Raw Material Components (Recipe Formula)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                      Per 1 {finishedProducts.find((p) => p.id === selectedProductId)?.unit || 'unit'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddComponentRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Material</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Raw Material</th>
                        <th className="py-2 px-3 w-28">Required Qty</th>
                        <th className="py-2 px-3 w-24">Unit</th>
                        <th className="py-2 px-3 w-28 text-right">Unit Cost ({profile.currencySymbol})</th>
                        <th className="py-2 px-3 w-28 text-right">Component Cost</th>
                        <th className="py-2 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {components.map((comp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <select
                              value={comp.rawMaterialId}
                              onChange={(e) => handleUpdateComponent(idx, 'rawMaterialId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {rawMaterials.map((rm) => (
                                <option key={rm.id} value={rm.id}>
                                  {rm.name} ({rm.code}) — Stock: {rm.stock} {rm.unit}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="any"
                              min="0.000001"
                              value={comp.quantity}
                              onChange={(e) => handleUpdateComponent(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                              required
                            />
                          </td>

                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={comp.unit}
                              onChange={(e) => handleUpdateComponent(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none"
                            />
                          </td>

                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={comp.unitCost}
                              onChange={(e) => handleUpdateComponent(idx, 'unitCost', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-mono"
                            />
                          </td>

                          <td className="py-2 px-3 text-right font-bold text-slate-800">
                            {profile.currencySymbol}
                            {(Number(comp.totalCost) || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                              title="Remove raw material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {components.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No raw materials added yet. Click &quot;Add Material&quot; to define recipe components.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total Cost Summary Bar */}
                <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-blue-800">
                    <span className="font-bold">Total Estimated Raw Material Cost:</span>
                    <span className="text-slate-500 ml-1">
                      (Formula cost per 1 {finishedProducts.find((p) => p.id === selectedProductId)?.unit || 'unit'})
                    </span>
                  </div>
                  <div className="text-base font-bold text-blue-900">
                    {profile.currencySymbol}
                    {calculatedTotalBomCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Production Notes & Instructions (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Standard solvent flex print recipe with 5% waste allowance..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Form Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {editingBom ? 'Update BOM Formula' : 'Save BOM Formula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRODUCE BATCH / RUN PRODUCTION MODAL */}
      {/* ========================================================================= */}
      {producingBom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Run Batch Production
                  </h3>
                  <p className="text-xs text-slate-500">
                    Produce finished goods and automatically deduct required raw materials from warehouse
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProducingBom(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {productionMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    productionMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {productionMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{productionMessage.text}</span>
                </div>
              )}

              {/* Product Info Bar */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">Target Finished Good</div>
                  <div className="font-bold text-slate-800 text-sm">
                    {producingBom.finishedProductName} ({producingBom.finishedProductCode})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-400">Output Unit</div>
                  <div className="font-bold text-indigo-700 text-sm">
                    {producingBom.outputUnit}
                  </div>
                </div>
              </div>

              {/* Batch Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Quantity to Produce ({producingBom.outputUnit}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={batchQty}
                    onChange={(e) => setBatchQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Warehouse Location
                  </label>
                  <select
                    value={batchLocation}
                    onChange={(e) => setBatchLocation(e.target.value as 'Factory' | 'Office')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Factory">Central Factory Warehouse</option>
                    <option value="Office">Branch Office Warehouse</option>
                  </select>
                </div>
              </div>

              {/* Live Feasibility Check Table */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Required Raw Material Stock Check ({batchQty} {producingBom.outputUnit} batch)</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Warehouse: {batchLocation === 'Factory' ? 'Central Factory' : 'Branch Office'}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Raw Material</th>
                        <th className="py-2 px-3 text-right">Per Unit</th>
                        <th className="py-2 px-3 text-right font-bold text-indigo-900">Total Needed</th>
                        <th className="py-2 px-3 text-right">Available Stock</th>
                        <th className="py-2 px-3 text-center">Feasibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {producingBom.components.map((comp) => {
                        const needed = Math.round(comp.quantity * batchQty * 100) / 100;
                        const rmProduct = products.find((p) => p.id === comp.rawMaterialId);
                        const available = rmProduct
                          ? batchLocation === 'Factory'
                            ? Number(rmProduct.stockFactory) || 0
                            : Number(rmProduct.stockOffice) || 0
                          : 0;
                        const isSufficient = available >= needed;

                        return (
                          <tr key={comp.rawMaterialId} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800">{comp.rawMaterialName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{comp.rawMaterialCode}</div>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 font-mono">
                              {comp.quantity} {comp.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-indigo-700 font-mono">
                              {needed} {comp.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {available} {comp.unit}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isSufficient ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span>In Stock</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Shortage ({Math.round((needed - available) * 100) / 100})</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setProducingBom(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteProduction}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Confirm & Run Batch Production</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW RECIPE MODAL */}
      {/* ========================================================================= */}
      {viewingBom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    BOM Formula Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewingBom.finishedProductName} ({viewingBom.finishedProductCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBom(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400">Output Unit:</span>{' '}
                  <strong className="text-slate-800">{viewingBom.outputUnit}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Auto Deduct:</span>{' '}
                  <strong className={viewingBom.autoDeductOnSale !== false ? 'text-emerald-600' : 'text-slate-600'}>
                    {viewingBom.autoDeductOnSale !== false ? 'Enabled' : 'Disabled'}
                  </strong>
                </div>
                {viewingBom.notes && (
                  <div className="col-span-2 text-slate-600">
                    <span className="text-slate-400">Notes:</span> {viewingBom.notes}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 mb-2">Recipe Components</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Component</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Cost</th>
                        <th className="py-2 px-3 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingBom.components.map((c, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-800">{c.rawMaterialName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{c.rawMaterialCode}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {c.quantity} {c.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {profile.currencySymbol}{c.unitCost.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800 font-mono">
                            {profile.currencySymbol}{c.totalCost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2.5 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900">Total Recipe Cost per {viewingBom.outputUnit}:</span>
                  <span className="font-bold text-blue-900 text-sm">
                    {profile.currencySymbol}{(Number(viewingBom.totalCost) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setViewingBom(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingBom;
                    setViewingBom(null);
                    handleOpenProduce(target);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Produce Batch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {bomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Delete BOM Formula?
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete the recipe for &quot;{bomToDelete.finishedProductName}&quot;?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 mb-5">
              This will remove the recipe formula and automatic raw material consumption calculations. Existing stock and past invoices will remain intact.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBomToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBom(bomToDelete.id);
                  setBomToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
              >
                Delete Formula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
