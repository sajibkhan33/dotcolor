import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductUnit, ProductItem } from '../types';
import { Scale, Plus, Search, Edit2, Trash2, Package, AlertCircle, X } from 'lucide-react';

export const UnitManager: React.FC = () => {
  const {
    productUnits,
    products,
    addProductUnit,
    updateProductUnit,
    deleteProductUnit,
    checkPermission,
    activeStaff,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<ProductUnit | null>(null);
  const [viewingUnitForItems, setViewingUnitForItems] = useState<ProductUnit | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const isSuperAdmin = activeStaff?.role === 'Super Admin' || activeStaff?.role === 'SUPER_ADMIN';
  const canManageUnits =
    isSuperAdmin ||
    Boolean(
      checkPermission &&
        (checkPermission('inventory.manage_units') || checkPermission('inventory.manage_categories'))
    );

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameBn: '',
    symbol: '',
    description: '',
  });

  const filteredUnits = (productUnits || []).filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.nameBn && u.nameBn.includes(q)) ||
      u.code.toLowerCase().includes(q) ||
      (u.symbol && u.symbol.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      nameBn: '',
      symbol: '',
      description: '',
    });
    setEditingUnit(null);
    setShowAddModal(true);
    setDeleteError(null);
  };

  const handleOpenEdit = (unit: ProductUnit) => {
    setFormData({
      code: unit.code,
      name: unit.name,
      nameBn: unit.nameBn || '',
      symbol: unit.symbol || unit.code,
      description: unit.description || '',
    });
    setEditingUnit(unit);
    setShowAddModal(true);
    setDeleteError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    const cleanedCode = formData.code.trim().toLowerCase().replace(/\s+/g, '-');
    const cleanedSymbol = formData.symbol.trim() || cleanedCode;

    // Check duplicate code if adding
    if (!editingUnit) {
      const isDuplicate = (productUnits || []).some(
        (u) => u.code.toLowerCase() === cleanedCode
      );
      if (isDuplicate) {
        setDeleteError(`Unit with code "${cleanedCode}" already exists.`);
        setTimeout(() => setDeleteError(null), 5000);
        return;
      }
    }

    if (editingUnit) {
      updateProductUnit(editingUnit.id, {
        code: cleanedCode,
        name: formData.name.trim(),
        nameBn: formData.nameBn.trim(),
        symbol: cleanedSymbol,
        description: formData.description.trim(),
      });
    } else {
      addProductUnit({
        code: cleanedCode,
        name: formData.name.trim(),
        nameBn: formData.nameBn.trim(),
        symbol: cleanedSymbol,
        description: formData.description.trim(),
      });
    }
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    const res = deleteProductUnit(id);
    if (!res.success) {
      setDeleteError(res.message || 'Cannot delete unit');
      setTimeout(() => setDeleteError(null), 5000);
    }
  };

  return (
    <div className="space-y-4">
      {deleteError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button type="button" onClick={() => setDeleteError(null)} className="text-rose-500 hover:text-rose-800">
            ✕
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search unit by name, code or symbol..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
          />
        </div>

        {canManageUnits && (
          <button
            type="button"
            id="btn-add-unit"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>{'Add New Unit'}</span>
          </button>
        )}
      </div>

      {/* Units Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 px-4">{'Unit Code / Symbol'}</th>
                <th className="py-3 px-4">{'Unit Name & Description'}</th>
                <th className="py-3 px-4 text-center">{'Linked Items'}</th>
                <th className="py-3 px-4 text-right">{'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Scale className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">{'No units found'}</h4>
                      <p className="text-xs text-slate-400">
                        {'Try searching with another keyword or add a new unit.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const itemCount = (products || []).filter(
                    (p) =>
                      (p.unit || '').toLowerCase() === (unit.code || '').toLowerCase() ||
                      (p.unit || '').toLowerCase() === (unit.name || '').toLowerCase()
                  ).length;

                  return (
                    <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            {unit.code}
                          </span>
                          {unit.symbol && unit.symbol !== unit.code && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({unit.symbol})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-bold text-slate-900 text-sm">{unit.name}</div>
                        {unit.nameBn && (
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            {unit.nameBn}
                          </div>
                        )}
                        {unit.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-md">
                            {unit.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingUnitForItems(unit);
                            setItemSearchQuery('');
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 px-2.5 py-1 rounded-full border border-blue-200 transition-colors cursor-pointer group"
                          title="Click to view items using this unit"
                        >
                          <Package className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span>
                            {itemCount} {'Items'}
                          </span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(unit)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                            title={'Edit Unit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUnitToDelete(unit)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                            title={'Delete Unit'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Unit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingUnit ? 'Edit Unit' : 'Add New Unit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Unit Code / Identifier *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. kg, pcs, meter"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold lowercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {'Short unique code (e.g. sqft, roll, kg)'}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Symbol / Short Label'}
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="e.g. kg, sqft, pcs"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {'Displayed in invoice rows and badges'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Unit Name (EN) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Kilogram, Pieces, Bundle"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {'Bengali Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.nameBn}
                    onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                    placeholder="যেমন: কেজি, পিস, বান্ডিল"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {'Description / Notes'}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Measurement details or usage notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
              >
                {'Save Unit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE UNIT MODAL */}
      {unitToDelete &&
        (() => {
          const itemCount = (products || []).filter(
            (p) =>
              (p.unit || '').toLowerCase() === (unitToDelete.code || '').toLowerCase() ||
              (p.unit || '').toLowerCase() === (unitToDelete.name || '').toLowerCase()
          ).length;
          const hasProducts = itemCount > 0;

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
                    hasProducts
                      ? 'bg-amber-50 text-amber-600 border-amber-100'
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}
                >
                  {hasProducts ? <AlertCircle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {hasProducts ? 'Cannot Delete Unit' : 'Confirm Unit Deletion'}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    {hasProducts
                      ? `This unit cannot be deleted because it is currently assigned to ${itemCount} product(s) in inventory. Please reassign them first.`
                      : `Are you sure you want to delete the unit "${unitToDelete.name} (${unitToDelete.code})"? This action cannot be undone.`}
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  {hasProducts ? (
                    <button
                      type="button"
                      onClick={() => setUnitToDelete(null)}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
                    >
                      {'OK'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setUnitToDelete(null)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        {'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(unitToDelete.id);
                          setUnitToDelete(null);
                        }}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                      >
                        {'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* MODAL: VIEW LINKED ITEMS FOR A UNIT */}
      {viewingUnitForItems &&
        (() => {
          const unitProducts = (products || []).filter(
            (p) =>
              (p.unit || '').toLowerCase() === (viewingUnitForItems.code || '').toLowerCase() ||
              (p.unit || '').toLowerCase() === (viewingUnitForItems.name || '').toLowerCase()
          );
          const filteredUnitProducts = unitProducts.filter((p) => {
            if (!itemSearchQuery.trim()) return true;
            const q = itemSearchQuery.toLowerCase().trim();
            return (
              p.name.toLowerCase().includes(q) ||
              p.code.toLowerCase().includes(q) ||
              (p.nameBn && p.nameBn.includes(q))
            );
          });

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {'Items using unit:'} {viewingUnitForItems.name} ({viewingUnitForItems.code})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {unitProducts.length} {'product(s) currently linked'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingUnitForItems(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      placeholder="Filter items by name or SKU..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
                  {filteredUnitProducts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      {'No products found for this unit.'}
                    </div>
                  ) : (
                    filteredUnitProducts.map((p) => (
                      <div
                        key={p.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>SKU: {p.code}</span>
                            <span>•</span>
                            <span>{p.category}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {Number(((p.stockOffice || 0) + (p.stockFactory || 0)).toFixed(3))} {p.unit}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingUnitForItems(null)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                  >
                    {'Close'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
