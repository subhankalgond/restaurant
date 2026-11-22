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

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return 'bg-forest-100 border-forest-700 text-forest-800';
      case 'occupied':
        return 'bg-earthRed-light border-earthRed text-earthRed';
      case 'billing':
        return 'bg-earthAmber-light border-earthAmber text-earthAmber';
      case 'reserved':
        return 'bg-blue-50 border-blue-400 text-blue-800';
      default:
        return 'bg-surface border-surfaceBorder text-charcoal-700';
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
        tableNumber: `T-${tables.length + 1 < 10 ? '0' : ''}${tables.length + 1}`,
        capacity: 4,
        status: 'available'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.tableNumber.trim()) return;

    const toSave: RestaurantTable = {
      id: editingTable ? editingTable.id : 'tbl_' + Date.now(),
      restaurantId: restId,
      tableNumber: tableForm.tableNumber.trim(),
      capacity: Number(tableForm.capacity),
      status: tableForm.status
    };

    backend.saveTable(caller, toSave);
    setIsModalOpen(false);
    showToast(editingTable ? 'Table updated' : 'New table added', 'success');
  };

  const handleDeleteTable = (id: string, num: string) => {
    if (window.confirm(`Delete Table "${num}"?`)) {
      backend.deleteTable(caller, restId, id);
      showToast(`Table ${num} deleted`, 'info');
      if (selectedTable?.id === id) setSelectedTable(null);
    }
  };

  // Inspect current table order if occupied
  const currentTableOrder: Order | undefined = selectedTable?.currentOrderId
    ? backend.getOrderById(caller, restId, selectedTable.currentOrderId)
    : undefined;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Table Management</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">Dining room seating status, active table orders and seating capacity</p>
        </div>

        {currentUser?.role === 'owner' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 bg-forest-800 hover:bg-forest-900 text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs self-start"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Table</span>
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-medium text-charcoal-700 mt-4">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-forest-700"></span> Available</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-earthRed"></span> Occupied</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-earthAmber"></span> Billing</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Reserved</span>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
        {tables.map(tbl => {
          const isSelected = selectedTable?.id === tbl.id;
          return (
            <div
              key={tbl.id}
              onClick={() => setSelectedTable(tbl)}
              className={`bg-white border-2 rounded p-3 flex flex-col justify-between cursor-pointer transition-all ${
                getStatusColor(tbl.status)
              } ${isSelected ? 'ring-2 ring-forest-800 shadow-xs' : 'hover:shadow-xs'}`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-bold text-base font-mono text-charcoal-900">{tbl.tableNumber}</span>
                  <span className="text-[10px] font-bold uppercase">{tbl.status}</span>
                </div>
                <span className="text-[11px] text-charcoal-500 mt-1 block">{tbl.capacity} Seats</span>
              </div>

              {currentUser?.role === 'owner' && (
                <div className="mt-3 pt-2 border-t border-surfaceBorder flex justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(tbl);
                    }}
                    className="p-1 text-charcoal-500 hover:text-charcoal-900"
                    title="Edit Table"
                  >
                    <EditIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(tbl.id, tbl.tableNumber);
                    }}
                    className="p-1 text-earthRed hover:text-red-700"
                    title="Delete Table"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table Inspection Drawer */}
      {selectedTable && (
        <div className="mt-6 bg-white border border-surfaceBorder rounded p-4 shadow-xs text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-forest-900">
                Table {selectedTable.tableNumber} ({selectedTable.capacity} Seats)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(selectedTable.status)}`}>
                {selectedTable.status}
              </span>
            </div>
            <button onClick={() => setSelectedTable(null)} className="text-charcoal-500 hover:text-charcoal-900">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-charcoal-800 mb-2">Change Table Status</h4>
              <div className="flex flex-wrap gap-2">
                {(['available', 'occupied', 'reserved', 'billing'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      const updated: RestaurantTable = { ...selectedTable, status: st };
                      backend.saveTable(caller, updated);
                      setSelectedTable(updated);
                      showToast(`Table ${selectedTable.tableNumber} status set to ${st}`);
                    }}
                    className={`px-3 py-1.5 rounded font-medium capitalize border ${
                      selectedTable.status === st
                        ? 'bg-forest-800 text-white border-forest-800'
                        : 'bg-surface border-surfaceBorder text-charcoal-700 hover:bg-neutralBg'
                    }`}
                  >
                    Mark {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-charcoal-800 mb-2">Active Order Details</h4>
              {currentTableOrder ? (
                <div className="bg-surface p-2.5 rounded border border-surfaceBorder">
                  <div className="flex justify-between font-bold text-charcoal-900">
                    <span>Order #{currentTableOrder.orderNumber} ({currentTableOrder.invoiceNumber})</span>
                    <span className="font-mono text-forest-900">₹{currentTableOrder.finalTotal}</span>
                  </div>
                  <div className="text-[11px] text-charcoal-500 mt-1">
                    Guest: {currentTableOrder.customerName || 'Dine-in Guest'}
                  </div>
                  <div className="mt-2 divide-y divide-surfaceBorder border-t border-surfaceBorder pt-1">
                    {currentTableOrder.items.map((i, idx) => (
                      <div key={idx} className="py-0.5 flex justify-between text-[11px]">
                        <span>{i.quantity}x {i.name}</span>
                        <span>₹{i.totalPrice}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-charcoal-500 italic">No active order assigned to this table.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-sm text-charcoal-900 p-4">
            <h3 className="font-bold text-xs text-forest-900 mb-3">
              {editingTable ? 'Edit Table' : 'Add New Table'}
            </h3>
            <form onSubmit={handleSaveTable} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Table Number *</label>
                <input
                  type="text"
                  required
                  value={tableForm.tableNumber}
                  onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                  placeholder="e.g. T-07"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Seating Capacity *</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 2 })}
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select
                  value={tableForm.status}
                  onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as TableStatus })}
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="billing">Billing</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surfaceBorder">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-surfaceBorder rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded font-medium"
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
