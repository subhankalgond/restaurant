import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { InventoryItem, StockMovement } from '../../types';
import { PlusIcon, SearchIcon, EditIcon } from '../../components/common/Icons';

export const InventoryPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'owner',
    name: currentUser?.name || 'Owner'
  };

  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit item modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    unit: 'kg',
    currentStock: 10,
    minimumStock: 5,
    costPerUnit: 100
  });

  // Stock Adjustment modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 5,
    reason: 'Restocked by supplier delivery'
  });

  const loadData = () => {
    if (!restId) return;
    try {
      setItems(backend.getInventory(caller, restId));
      setMovements(backend.getStockMovements(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenItemModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        unit: item.unit,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        costPerUnit: item.costPerUnit
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        unit: 'kg',
        currentStock: 10,
        minimumStock: 5,
        costPerUnit: 120
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;

    const toSave: InventoryItem = {
      id: editingItem ? editingItem.id : 'inv_' + Date.now(),
      restaurantId: restId,
      name: itemForm.name.trim(),
      unit: itemForm.unit.trim(),
      currentStock: Number(itemForm.currentStock),
      minimumStock: Number(itemForm.minimumStock),
      costPerUnit: Number(itemForm.costPerUnit)
    };

    try {
      await backend.saveInventoryItem(caller, toSave);
      setIsItemModalOpen(false);
      showToast(editingItem ? 'Item updated' : 'Stock item added', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save inventory item', 'error');
    }
  };

  const handleOpenAdjustModal = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustForm({
      type: 'in',
      quantity: 5,
      reason: 'Standard stock replenishment'
    });
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || adjustForm.quantity < 0) return;
    if (adjustForm.type !== 'adjustment' && adjustForm.quantity <= 0) return;

    try {
      await backend.adjustStock(
        caller,
        restId,
        adjustingItem.id,
        adjustForm.type,
        Number(adjustForm.quantity),
        adjustForm.reason.trim()
      );

      setIsAdjustModalOpen(false);
      showToast(`Stock updated for ${adjustingItem.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Basic Inventory</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">Stock additions, reductions, depletion thresholds and low-stock indicators</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-surfaceBorder rounded p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 rounded font-medium ${
                activeTab === 'stock' ? 'bg-forest-800 text-white' : 'text-charcoal-700'
              }`}
            >
              Current Stock
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded font-medium ${
                activeTab === 'movements' ? 'bg-forest-800 text-white' : 'text-charcoal-700'
              }`}
            >
              Adjustment Ledger
            </button>
          </div>

          <button
            onClick={() => handleOpenItemModal()}
            className="flex items-center gap-1.5 bg-forest-800 hover:bg-forest-900 text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {activeTab === 'stock' ? (
        <>
          {/* Search bar */}
          <div className="bg-white p-3 rounded border border-surfaceBorder shadow-xs mt-4 flex items-center justify-between text-xs">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-charcoal-500">
                <SearchIcon className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-neutralBg border border-surfaceBorder rounded focus:outline-none"
              />
            </div>
            <span className="text-charcoal-500">{filteredItems.length} items tracked</span>
          </div>

          {/* Table */}
          <div className="bg-white border border-surfaceBorder rounded shadow-xs mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-right">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Min Threshold</th>
                    <th className="py-2.5 px-3 text-right">Cost / Unit</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceBorder">
                  {filteredItems.map(item => {
                    const isLow = item.currentStock <= item.minimumStock;
                    return (
                      <tr key={item.id} className="hover:bg-neutralBg/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-charcoal-900">
                          {item.name}
                          {isLow && (
                            <span className="ml-2 text-[10px] text-earthAmber bg-earthAmber-light px-1.5 py-0.5 rounded font-bold border border-earthAmber-border">
                              LOW STOCK
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={isLow ? 'text-earthRed' : 'text-charcoal-900'}>
                            {item.currentStock} {item.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-charcoal-500">
                          {item.minimumStock} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-charcoal-800">
                          ₹{item.costPerUnit}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAdjustModal(item)}
                              className="px-2 py-1 bg-surface hover:bg-surfaceBorder text-charcoal-900 rounded font-medium"
                            >
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => handleOpenItemModal(item)}
                              className="p-1 text-charcoal-500 hover:text-charcoal-900"
                              title="Edit"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Movements Log */
        <div className="bg-white border border-surfaceBorder rounded shadow-xs mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Previous &rarr; New</th>
                  <th className="py-2.5 px-3">Reason / Note</th>
                  <th className="py-2.5 px-3">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-charcoal-500">
                      No stock movement history recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map(m => (
                    <tr key={m.id} className="hover:bg-neutralBg/70">
                      <td className="py-2.5 px-3 text-charcoal-500 font-mono">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-charcoal-900">{m.itemName}</td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded ${
                          m.type === 'in' ? 'bg-forest-100 text-forest-700' :
                          m.type === 'out' ? 'bg-earthRed-light text-earthRed' :
                          'bg-surface text-charcoal-700'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{m.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-charcoal-500">
                        {m.previousStock} &rarr; {m.newStock}
                      </td>
                      <td className="py-2.5 px-3 text-charcoal-700">{m.reason}</td>
                      <td className="py-2.5 px-3 text-charcoal-600">{m.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-sm text-charcoal-900 p-4">
            <h3 className="font-bold text-xs text-forest-900 mb-3">
              {editingItem ? 'Edit Stock Item' : 'Add New Inventory Item'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Item / Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Arabica Coffee Beans"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Unit of Measurement</label>
                  <input
                    type="text"
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="kg, liters, pcs, pack"
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Cost / Unit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={itemForm.costPerUnit}
                    onChange={(e) => setItemForm({ ...itemForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm({ ...itemForm, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Low-Stock Alert Min</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemForm.minimumStock}
                    onChange={(e) => setItemForm({ ...itemForm, minimumStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surfaceBorder">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-3 py-1.5 border border-surfaceBorder rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded font-medium"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-sm text-charcoal-900 p-4">
            <h3 className="font-bold text-xs text-forest-900 mb-1">
              Adjust Stock &bull; {adjustingItem.name}
            </h3>
            <p className="text-[11px] text-charcoal-500 mb-3">
              Current recorded level: <span className="font-bold font-mono text-charcoal-900">{adjustingItem.currentStock} {adjustingItem.unit}</span>
            </p>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Adjustment Action</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                >
                  <option value="in">Stock Addition (Purchase / Delivery)</option>
                  <option value="out">Stock Reduction (Kitchen Usage / Spoilage)</option>
                  <option value="adjustment">Manual Count Override</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Quantity ({adjustingItem.unit}) *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Received weekly delivery invoice"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surfaceBorder">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 border border-surfaceBorder rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded font-medium"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
