import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ProcurementRequisition, ProductItem, Supplier, CompanyProfile, PurchaseOrder } from '../types';
import { 
  Plus, Search, CheckCircle2, XCircle, Clock, Truck, 
  AlertTriangle, Eye, Trash2, ArrowRight, FileText, 
  Building2, Factory, Calendar, DollarSign, X, Check
} from 'lucide-react';

interface ProcurementRequisitionsTabProps {
  requisitions?: ProcurementRequisition[];
  products?: ProductItem[];
  suppliers?: Supplier[];
  profile?: CompanyProfile;
  activeStaff?: any;
  canCreatePO?: boolean;
  onAddRequisition?: (req: Omit<ProcurementRequisition, 'id' | 'prNo' | 'createdAt'>) => ProcurementRequisition;
  onUpdateRequisition?: (id: string, updates: Partial<ProcurementRequisition>) => void;
  onDeleteRequisition?: (id: string) => void;
  onApproveAndConvert?: (reqId: string, supplierId: string, supplierName: string, destination?: 'Factory' | 'Office') => PurchaseOrder;
  onViewPO?: (poNo: string) => void;
}

export const ProcurementRequisitionsTab: React.FC<ProcurementRequisitionsTabProps> = (props) => {
  const app = useApp();

  const requisitions = props.requisitions || app.procurementRequisitions || [];
  const products = props.products || app.products || [];
  const suppliers = props.suppliers || app.suppliers || [];
  const profile = props.profile || app.profile;
  const currencySymbol = profile?.currencySymbol || '৳';
  const activeStaff = props.activeStaff || app.activeStaff;

  const isSuperAdmin = (activeStaff?.role || '').toLowerCase() === 'super admin' ||
    (activeStaff?.role || '').toLowerCase() === 'superadmin' ||
    activeStaff?.customRoleId === 'role-superadmin' ||
    (activeStaff?.name || '').toLowerCase().includes('super admin');
  const canCreatePO = props.canCreatePO ?? (isSuperAdmin || Boolean(app.checkPermission && app.checkPermission('supply.create_po')));

  const onAddRequisition = props.onAddRequisition || app.addProcurementRequisition;
  const onUpdateRequisition = props.onUpdateRequisition || app.updateProcurementRequisition;
  const onDeleteRequisition = props.onDeleteRequisition || app.deleteProcurementRequisition;
  const onApproveAndConvert = props.onApproveAndConvert || app.approveAndConvertRequisitionToPO;
  const onViewPO = props.onViewPO;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReqForApproval, setSelectedReqForApproval] = useState<ProcurementRequisition | null>(null);
  const [selectedReqForDetails, setSelectedReqForDetails] = useState<ProcurementRequisition | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Approval Modal Form State
  const [approvalSupplierId, setApprovalSupplierId] = useState('');
  const [approvalDestination, setApprovalDestination] = useState<'Factory' | 'Office'>('Factory');

  // Create Requisition Form State
  const [formData, setFormData] = useState({
    department: 'Factory' as 'Factory' | 'Office',
    requiredByDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    requestedBy: activeStaff?.name || 'Factory Production Plant',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    preferredSupplierId: '',
    notes: '',
  });

  const [formItems, setFormItems] = useState<{
    productId: string;
    name: string;
    unit: any;
    qty: number;
    estimatedCost: number;
  }[]>([
    { productId: '', name: '', unit: 'pcs', qty: 1, estimatedCost: 0 }
  ]);

  const rawMaterials = useMemo(() => {
    return products.filter(p => p.isRawMaterial);
  }, [products]);

  // Filtered Requisitions
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      if (filterStatus !== 'ALL' && req.status !== filterStatus) return false;
      if (filterDept !== 'ALL' && req.department !== filterDept) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchNo = req.prNo.toLowerCase().includes(q);
      const matchReq = (req.requestedBy || '').toLowerCase().includes(q);
      const matchNotes = (req.notes || '').toLowerCase().includes(q);
      const matchItems = (req.items || []).some(it => it.name.toLowerCase().includes(q));
      return matchNo || matchReq || matchNotes || matchItems;
    });
  }, [requisitions, filterStatus, filterDept, searchQuery]);

  // Metrics
  const pendingCount = requisitions.filter(r => r.status === 'Pending').length;
  const approvedCount = requisitions.filter(r => r.status === 'Approved' || r.status === 'Converted to PO').length;
  const totalEstVal = requisitions.reduce((sum, r) => sum + (Number(r.totalEstimatedCost) || 0), 0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      department: 'Factory',
      requiredByDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      requestedBy: activeStaff?.name || 'Factory Production Plant',
      priority: 'Medium',
      preferredSupplierId: '',
      notes: '',
    });
    setFormItems([
      { productId: rawMaterials[0]?.id || '', name: rawMaterials[0]?.name || '', unit: rawMaterials[0]?.unit || 'pcs', qty: 10, estimatedCost: Number(rawMaterials[0]?.costPrice) || 0 }
    ]);
    setShowCreateModal(true);
  };

  const handleAddItemRow = () => {
    const firstRM = rawMaterials[0];
    setFormItems(prev => [
      ...prev,
      {
        productId: firstRM?.id || '',
        name: firstRM?.name || '',
        unit: firstRM?.unit || 'pcs',
        qty: 1,
        estimatedCost: Number(firstRM?.costPrice) || 0
      }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemProductChange = (idx: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    setFormItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return {
        ...item,
        productId: prod.id,
        name: prod.name,
        unit: prod.unit,
        estimatedCost: Number(prod.costPrice) || 0
      };
    }));
  };

  const handleCreateRequisitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) {
      showToast('Please add at least one material/item to the requisition.', 'error');
      return;
    }

    const validItems = formItems.filter(it => it.name.trim() && it.qty > 0);
    if (validItems.length === 0) {
      showToast('Please specify valid item names and quantities.', 'error');
      return;
    }

    const preferredSup = suppliers.find(s => s.id === formData.preferredSupplierId);

    const itemsFormatted = validItems.map(it => ({
      productId: it.productId || `prod-custom-${Date.now()}`,
      name: it.name,
      unit: it.unit || 'pcs',
      qty: Number(it.qty) || 1,
      estimatedCost: Number(it.estimatedCost) || 0,
      totalEstimatedCost: (Number(it.qty) || 1) * (Number(it.estimatedCost) || 0)
    }));

    const totalEst = itemsFormatted.reduce((acc, cur) => acc + cur.totalEstimatedCost, 0);

    const created = onAddRequisition({
      date: new Date().toISOString().slice(0, 10),
      requiredByDate: formData.requiredByDate,
      department: formData.department,
      requestedBy: formData.requestedBy,
      priority: formData.priority,
      preferredSupplierId: formData.preferredSupplierId || undefined,
      preferredSupplierName: preferredSup ? preferredSup.name : undefined,
      notes: formData.notes.trim() || undefined,
      items: itemsFormatted,
      totalEstimatedCost: totalEst,
      status: 'Pending',
    });

    setShowCreateModal(false);
    showToast(`Requisition ${created.prNo} created successfully! Waiting for approval.`);
  };

  const handleOpenApprovalModal = (req: ProcurementRequisition) => {
    setSelectedReqForApproval(req);
    setApprovalSupplierId(req.preferredSupplierId || suppliers[0]?.id || '');
    setApprovalDestination(req.department || 'Factory');
  };

  const handleConfirmApproval = () => {
    if (!selectedReqForApproval) return;
    const sup = suppliers.find(s => s.id === approvalSupplierId);
    if (!sup) {
      showToast('Please select a valid supplier/vendor to issue the Purchase Order.', 'error');
      return;
    }

    try {
      const newPO = onApproveAndConvert(
        selectedReqForApproval.id,
        sup.id,
        sup.name,
        approvalDestination
      );
      setSelectedReqForApproval(null);
      showToast(`Requisition ${selectedReqForApproval.prNo} APPROVED! Purchase Order #${newPO.poNo} created automatically!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to approve requisition', 'error');
    }
  };

  const handleRejectRequisition = (req: ProcurementRequisition) => {
    const reason = window.prompt(`Please enter reason for rejecting Requisition ${req.prNo}:`, 'Budget constraint / Out of schedule');
    if (reason !== null) {
      onUpdateRequisition(req.id, {
        status: 'Rejected',
        approvalNotes: reason,
        approvedBy: activeStaff?.name || 'Super Admin',
        approvedAt: new Date().toISOString(),
      });
      showToast(`Requisition ${req.prNo} marked as Rejected.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toastMessage && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border shadow-lg ${
          toastMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          <span>{toastMessage.text}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">
            Total Requisitions
          </span>
          <div className="text-2xl font-black text-slate-900">
            {requisitions.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {currencySymbol}{totalEstVal.toLocaleString()} estimated value
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-amber-700 block mb-1">
            Pending Approval
          </span>
          <div className="text-2xl font-black text-amber-700">
            {pendingCount}
          </div>
          <span className="text-[11px] text-amber-600/80 mt-0.5 block font-medium">
            Waiting for admin review & PO conversion
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 block mb-1">
            Approved & Converted to PO
          </span>
          <div className="text-2xl font-black text-emerald-700">
            {approvedCount}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block font-medium">
            Purchase Orders issued automatically
          </span>
        </div>
      </div>

      {/* Filter and Action Header */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PR#, material, requester..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="Pending">Pending Approval</option>
            <option value="Converted to PO">Converted to PO</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Dept filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Factory">Factory</option>
            <option value="Office">Office</option>
          </select>
        </div>

        {/* Create Requisition Button */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Requisition</span>
        </button>
      </div>

      {/* Requisitions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 px-4">PR Details</th>
                <th className="py-3 px-4">Department & Requester</th>
                <th className="py-3 px-4">Required Materials</th>
                <th className="py-3 px-4 text-right">Est. Total</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="font-semibold text-xs text-slate-600">No procurement requisitions found</p>
                    <p className="text-[11px]">Click "+ Create Requisition" to submit a new requirement.</p>
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((req) => {
                  const isPending = req.status === 'Pending';
                  const isConverted = req.status === 'Converted to PO';
                  const isRejected = req.status === 'Rejected';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* PR Number & Date */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{req.prNo}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Req: {req.date}</span>
                          {req.requiredByDate && (
                            <span className="text-amber-700 font-semibold">• Need: {req.requiredByDate}</span>
                          )}
                        </div>
                      </td>

                      {/* Department & Requester */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            req.department === 'Factory'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {req.department}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-1 truncate max-w-[180px]">
                          {req.requestedBy}
                        </div>
                      </td>

                      {/* Required Materials */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {req.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="truncate max-w-[200px]">{it.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({it.qty} {it.unit})</span>
                            </div>
                          ))}
                          {req.items.length > 2 && (
                            <span className="text-[10px] text-amber-700 font-bold block">
                              +{req.items.length - 2} more materials...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Est. Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {currencySymbol}{req.totalEstimatedCost.toLocaleString()}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : req.priority === 'High'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : req.priority === 'Low'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {req.priority || 'Medium'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                        {isConverted && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                            {req.convertedPoNo && (
                              <span className="text-[9px] font-mono text-emerald-700 font-bold mt-0.5">
                                PO: {req.convertedPoNo}
                              </span>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isPending && canCreatePO && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenApprovalModal(req)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                title="Approve & automatically create Purchase Order"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve & PO</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRequisition(req)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Reject Requisition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {isConverted && req.convertedPoNo && onViewPO && (
                            <button
                              type="button"
                              onClick={() => onViewPO(req.convertedPoNo!)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Go to Purchase Order"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View PO</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedReqForDetails(req)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View Requisition Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(isPending || isRejected) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete requisition ${req.prNo}?`)) {
                                  onDeleteRequisition(req.id);
                                  showToast(`Requisition ${req.prNo} deleted.`);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Requisition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* CREATE REQUISITION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Create Procurement Requisition
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisitionSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="Factory">Factory Production Plant</option>
                    <option value="Office">Corporate / Outlet Office</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Required By Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.requiredByDate}
                    onChange={(e) => setFormData({ ...formData, requiredByDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Requested By
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.requestedBy}
                    onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    placeholder="e.g. Factory Production Manager"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Preferred Vendor (Optional)
                  </label>
                  <select
                    value={formData.preferredSupplierId}
                    onChange={(e) => setFormData({ ...formData, preferredSupplierId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Any Recommended Vendor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Required Materials & Estimated Quantities
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => {
                    const rowTotal = (Number(item.qty) || 0) * (Number(item.estimatedCost) || 0);
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Select Material */}
                        <div className="flex-1 min-w-[160px]">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemProductChange(idx, e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                          >
                            <option value="">-- Select Material / Item --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit}) - {p.isRawMaterial ? 'Raw Material' : 'Item'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-24">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              required
                              value={item.qty}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: val } : it));
                              }}
                              className="w-full px-2 py-1 text-xs font-bold text-right focus:outline-hidden"
                            />
                            <span className="px-1.5 text-[10px] text-slate-400 font-bold bg-slate-50 border-l border-slate-200">
                              {item.unit}
                            </span>
                          </div>
                        </div>

                        {/* Est. Cost */}
                        <div className="w-28">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                            <span className="px-1.5 text-[10px] text-slate-400 font-bold bg-slate-50 border-r border-slate-200">
                              ৳
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.estimatedCost}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormItems(prev => prev.map((it, i) => i === idx ? { ...it, estimatedCost: val } : it));
                              }}
                              placeholder="Est Rate"
                              className="w-full px-2 py-1 text-xs font-bold text-right focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Row Subtotal */}
                        <div className="w-24 text-right font-mono font-bold text-xs text-slate-700 shrink-0">
                          ৳{rowTotal.toLocaleString()}
                        </div>

                        {/* Delete row */}
                        <button
                          type="button"
                          disabled={formItems.length <= 1}
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Justification Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Purpose / Justification Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Explain why this procurement is needed (e.g. low stock, upcoming bulk print orders)..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Estimated Total Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Total Estimated Requisition Value:</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    ৳{formItems.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.estimatedCost) || 0), 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    Submit Requisition
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVAL & AUTO-PO MODAL */}
      {selectedReqForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Approve Requisition & Generate PO
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedReqForApproval.prNo}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqForApproval(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Items:</span>
                  <span className="font-bold text-slate-800">{selectedReqForApproval.items.length} materials</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Est. Cost:</span>
                  <span className="font-mono font-bold text-slate-900">৳{selectedReqForApproval.totalEstimatedCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requester:</span>
                  <span className="font-bold text-slate-700">{selectedReqForApproval.requestedBy}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Select Vendor / Supplier for Purchase Order:
                </label>
                <select
                  required
                  value={approvalSupplierId}
                  onChange={(e) => setApprovalSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.company ? `(${s.company})` : ''} - {s.phone}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The approved items will be transferred directly to this vendor's Purchase Order.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Destination Warehouse / Plant:
                </label>
                <select
                  value={approvalDestination}
                  onChange={(e) => setApprovalDestination(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white"
                >
                  <option value="Factory">Central Factory & Production Plant</option>
                  <option value="Office">Corporate Warehouse (Office)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReqForApproval(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Approval & Issue PO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REQUISITION DETAILS MODAL */}
      {selectedReqForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Requisition Details</span>
                  <span className="font-mono text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    {selectedReqForDetails.prNo}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqForDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Department:</span>
                  <span className="font-bold text-slate-800">{selectedReqForDetails.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Requested By:</span>
                  <span className="font-bold text-slate-800">{selectedReqForDetails.requestedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Submission Date:</span>
                  <span className="font-bold text-slate-800">{selectedReqForDetails.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Required By:</span>
                  <span className="font-bold text-amber-800">{selectedReqForDetails.requiredByDate || 'Immediate'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status:</span>
                  <span className="font-bold text-slate-800">{selectedReqForDetails.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Linked Purchase Order:</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedReqForDetails.convertedPoNo || 'Not yet issued'}</span>
                </div>
              </div>

              {selectedReqForDetails.notes && (
                <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/80">
                  <span className="font-bold text-amber-900 block mb-0.5 text-[11px]">Justification Notes:</span>
                  <p className="text-slate-600">{selectedReqForDetails.notes}</p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 block text-xs">Required Materials Breakdown:</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedReqForDetails.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/60">
                      <div>
                        <div className="font-bold text-slate-900">{it.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Qty: {it.qty} {it.unit} • Est. Rate: ৳{it.estimatedCost}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        ৳{it.totalEstimatedCost.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                <span>Total Estimated Cost:</span>
                <span className="font-mono font-black text-slate-900">
                  ৳{selectedReqForDetails.totalEstimatedCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
