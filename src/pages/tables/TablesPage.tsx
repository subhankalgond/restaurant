import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { RestaurantTable, TableStatus, Order } from '../../types';
import { PlusIcon, EditIcon, TrashIcon, CloseIcon } from '../../components/common/Icons';

export const TablesPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'owner'
  };

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableForm, setTableForm] = useState({
    tableNumber: '',
    capacity: 4,
    status: 'available' as TableStatus
  });

  const loadData = () => {
    if (!restId) return;
    try {
      setTables(backend.getTables(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return 'bg-[#F0F8F3] text-[#078F36] border-[#D8EFDF]';
      case 'occupied':
        return 'bg-red-50 text-[#D94A43] border-red-200';
      case 'billing':
        return 'bg-amber-50 text-[#F5BD3D] border-amber-200';
      case 'reserved':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-[#59615B] border-gray-200';
    }
  };

  const handleOpenModal = (tbl?: RestaurantTable) => {
    if (tbl) {
      setEditingTable(tbl);
      setTableForm({
        tableNumber: tbl.tableNumber,
        capacity: tbl.capacity,
        status: tbl.status
      });
    } else {
      setEditingTable(null);
      setTableForm({
        tableNumber: `T-0${tables.length + 1}`,
        capacity: 4,
        status: 'available'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.tableNumber.trim()) return;

    const toSave: RestaurantTable = {
      id: editingTable ? editingTable.id : 'tbl_' + Date.now(),
      restaurantId: restId,
      tableNumber: tableForm.tableNumber.trim(),
      capacity: Number(tableForm.capacity),
      status: tableForm.status
    };

    try {
      await backend.saveTable(caller, toSave);
      setIsModalOpen(false);
      showToast(editingTable ? 'Table updated' : 'New table added', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save table', 'error');
    }
  };

  const handleDeleteTable = async (id: string, num: string) => {
    if (window.confirm(`Delete Table "${num}"?`)) {
      try {
        await backend.deleteTable(caller, restId, id);
        showToast(`Table ${num} deleted`, 'info');
        if (selectedTable?.id === id) setSelectedTable(null);
      } catch (err: any) {
        showToast(err.message || 'Failed to delete table', 'error');
      }
    }
  };

  // Inspect current table order if occupied
  const currentTableOrder: Order | undefined = selectedTable?.currentOrderId
    ? backend.getOrderById(caller, restId, selectedTable.currentOrderId)
    : undefined;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full bg-[#F5F6F5] text-[#171B18]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E7EBE8] gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#171B18] tracking-tight">Table Management</h1>
          <p className="text-xs text-[#59615B] font-medium mt-0.5">Dining room seating status, active table orders and seating capacity</p>
        </div>

        {currentUser?.role === 'owner' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 bg-[#078F36] hover:bg-[#087A32] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#078F36]/20 transition-all self-start"
          >
            <PlusIcon className="w-3.5 h-3.5 text-white" />
            <span>Add Table</span>
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-bold text-[#171B18] mt-4">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#078F36]"></span> Available</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D94A43]"></span> Occupied</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5BD3D]"></span> Billing</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Reserved</span>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mt-4">
        {tables.map(tbl => {
          const isSelected = selectedTable?.id === tbl.id;
          const badgeStyle = getStatusBadge(tbl.status);

          return (
            <div
              key={tbl.id}
              onClick={() => setSelectedTable(tbl)}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all shadow-sm ${
                isSelected ? 'border-[#078F36] ring-2 ring-[#078F36]/30' : 'border-[#E7EBE8] hover:border-gray-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="font-extrabold text-base font-mono text-[#171B18]">{tbl.tableNumber}</span>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                    {tbl.status}
                  </span>
                </div>
                <span className="text-xs text-[#59615B] font-bold block">{tbl.capacity} Seats</span>
              </div>

              {currentUser?.role === 'owner' && (
                <div className="mt-4 pt-2.5 border-t border-[#E7EBE8] flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(tbl);
                    }}
                    className="p-1 text-[#777F79] hover:text-[#078F36]"
                    title="Edit Table"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(tbl.id, tbl.tableNumber);
                    }}
                    className="p-1 text-[#D94A43] hover:text-red-700"
                    title="Delete Table"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table Inspection Drawer */}
      {selectedTable && (
        <div className="mt-6 bg-white border border-[#E7EBE8] rounded-2xl p-5 shadow-sm text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE8]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#171B18]">
                Table {selectedTable.tableNumber} ({selectedTable.capacity} Seats)
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(selectedTable.status)}`}>
                {selectedTable.status}
              </span>
            </div>
            <button onClick={() => setSelectedTable(null)} className="text-[#777F79] hover:text-[#171B18]">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="font-extrabold text-[#171B18] text-xs mb-2">Change Table Status</h4>
              <div className="flex flex-wrap gap-2">
                {(['available', 'occupied', 'reserved', 'billing'] as const).map(st => (
                  <button
                    key={st}
                    onClick={async () => {
                      if (selectedTable.currentOrderId && st === 'available') {
                        showToast('Complete or cancel the active order before marking table available.', 'warning');
                        return;
                      }
                      const updated: RestaurantTable = { ...selectedTable, status: st };
                      try {
                        await backend.saveTable(caller, updated);
                        setSelectedTable(updated);
                        showToast(`Table ${selectedTable.tableNumber} status set to ${st}`);
                      } catch (err: any) {
                        showToast(err.message || 'Failed to update table status', 'error');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border transition-colors ${
                      selectedTable.status === st
                        ? 'bg-[#078F36] text-white border-[#078F36]'
                        : 'bg-[#F5F6F5] border-[#E7EBE8] text-[#171B18] hover:bg-gray-100'
                    }`}
                  >
                    Mark {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-[#171B18] text-xs mb-2">Active Order Details</h4>
              {currentTableOrder ? (
                <div className="bg-[#F5F6F5] p-3 rounded-xl border border-[#E7EBE8]">
                  <div className="flex justify-between font-extrabold text-[#171B18]">
                    <span>Order #{currentTableOrder.orderNumber} ({currentTableOrder.invoiceNumber})</span>
                    <span className="font-mono text-[#078F36]">{currentRestaurant?.currencySymbol || '₹'}{currentTableOrder.finalTotal}</span>
                  </div>
                  <div className="text-[11px] text-[#59615B] font-medium mt-1">
                    Guest: {currentTableOrder.customerName || 'Dine-in Guest'}
                  </div>
                  <div className="mt-2 divide-y divide-[#E7EBE8] border-t border-[#E7EBE8] pt-1">
                    {currentTableOrder.items.map((i, idx) => (
                      <div key={idx} className="py-1 flex justify-between text-[11px] font-semibold text-[#171B18]">
                        <span>{i.quantity}x {i.name}</span>
                        <span>{currentRestaurant?.currencySymbol || '₹'}{i.totalPrice}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[#59615B] font-medium italic">No active order assigned to this table.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-sm text-[#171B18] p-5">
            <h3 className="font-extrabold text-sm text-[#171B18] mb-3">
              {editingTable ? 'Edit Table' : 'Add New Table'}
            </h3>
            <form onSubmit={handleSaveTable} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Table Number *</label>
                <input
                  type="text"
                  required
                  value={tableForm.tableNumber}
                  onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                  placeholder="e.g. T-07"
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl text-xs font-bold text-[#171B18] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Seating Capacity *</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 2 })}
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl text-xs font-bold text-[#171B18] focus:outline-none focus:border-[#078F36] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Status</label>
                <select
                  value={tableForm.status}
                  onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as TableStatus })}
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl text-xs font-bold text-[#171B18] focus:outline-none focus:border-[#078F36] bg-white"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="billing">Billing</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7EBE8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E7EBE8] rounded-xl text-xs font-bold text-[#59615B] hover:text-[#171B18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl text-xs font-bold shadow-md shadow-[#078F36]/20 transition-all"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
