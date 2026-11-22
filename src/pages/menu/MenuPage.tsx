import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { MenuCategory, MenuItem, MenuItemVariant, MenuItemAddOn } from '../../types';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, CloseIcon } from '../../components/common/Icons';

export const MenuPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'owner'
  };

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  // Form states for Add / Edit Item
  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: '',
    price: 150,
    description: '',
    itemType: 'veg' as 'veg' | 'non_veg' | 'egg' | 'vegan',
    isAvailable: true,
    taxPercent: 5.0,
    prepTimeMinutes: 10,
    variants: [] as MenuItemVariant[],
    addOns: [] as MenuItemAddOn[]
  });

  const loadData = () => {
    if (!restId) return;
    try {
      setCategories(backend.getCategories(caller, restId));
      setItems(backend.getMenuItems(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  const filteredItems = items.filter(item => {
    const matchCat = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  const handleToggleAvailability = (item: MenuItem) => {
    const updated: MenuItem = { ...item, isAvailable: !item.isAvailable };
    backend.saveMenuItem(caller, updated);
    showToast(`${item.name} marked ${updated.isAvailable ? 'Available' : 'Unavailable'}`);
  };

  const handleOpenItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        categoryId: item.categoryId,
        price: item.price,
        description: item.description || '',
        itemType: item.itemType,
        isAvailable: item.isAvailable,
        taxPercent: item.taxPercent,
        prepTimeMinutes: item.prepTimeMinutes || 10,
        variants: item.variants || [],
        addOns: item.addOns || []
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        categoryId: categories[0]?.id || '',
        price: 150,
        description: '',
        itemType: 'veg',
        isAvailable: true,
        taxPercent: 5.0,
        prepTimeMinutes: 10,
        variants: [],
        addOns: []
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;

    const toSave: MenuItem = {
      id: editingItem ? editingItem.id : 'item_' + Date.now(),
      restaurantId: restId,
      name: itemForm.name.trim(),
      categoryId: itemForm.categoryId,
      price: Number(itemForm.price),
      description: itemForm.description.trim() || undefined,
      itemType: itemForm.itemType,
      isAvailable: itemForm.isAvailable,
      taxPercent: Number(itemForm.taxPercent),
      prepTimeMinutes: Number(itemForm.prepTimeMinutes),
      variants: itemForm.variants,
      addOns: itemForm.addOns,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
    };

    backend.saveMenuItem(caller, toSave);
    setIsItemModalOpen(false);
    showToast(editingItem ? 'Item updated' : 'New menu item created', 'success');
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}" from menu?`)) {
      backend.deleteMenuItem(caller, restId, id);
      showToast(`Deleted ${name}`, 'info');
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    const newCat: MenuCategory = {
      id: 'cat_' + Date.now(),
      restaurantId: restId,
      name: categoryNameInput.trim(),
      slug: categoryNameInput.toLowerCase().replace(/\s+/g, '-'),
      displayOrder: categories.length + 1,
      isActive: true
    };

    backend.saveCategory(caller, newCat);
    setIsCategoryModalOpen(false);
    setCategoryNameInput('');
    showToast('New category added', 'success');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    try {
      backend.deleteCategory(caller, restId, id);
      showToast(`Category "${name}" removed`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Menu Management</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">Dishes, pricing, dietary indicators, portion variants and availability switches</p>
        </div>

        <button
          onClick={() => handleOpenItemModal()}
          className="flex items-center gap-1.5 bg-forest-800 hover:bg-forest-900 text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs self-start"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Dual Pane Layout */}
      <div className="flex-1 flex flex-col md:flex-row mt-4 gap-4 items-start">
        {/* Left Category Management Panel */}
        <div className="w-full md:w-56 bg-surface border border-surfaceBorder rounded p-3 flex flex-col flex-shrink-0 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surfaceBorder mb-2">
            <span className="font-bold text-forest-900 uppercase tracking-wider text-[11px]">Categories</span>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-forest-700 hover:text-forest-900 p-0.5"
              title="Add Category"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[500px]">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-forest-800 text-white font-bold'
                  : 'text-charcoal-700 hover:bg-neutralBg'
              }`}
            >
              <span>All Items</span>
              <span className="text-[10px] font-mono opacity-80">{items.length}</span>
            </button>

            {categories.map(cat => {
              const count = items.filter(i => i.categoryId === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-forest-800 text-white font-bold'
                      : 'text-charcoal-700 hover:bg-neutralBg'
                  }`}
                >
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="flex-1 text-left truncate mr-2"
                  >
                    {cat.name}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono opacity-80">{count}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="hidden group-hover:inline text-earthRed hover:text-red-700"
                      title="Delete category"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Table */}
        <div className="flex-1 w-full bg-white border border-surfaceBorder rounded shadow-xs overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="p-3 bg-surface border-b border-surfaceBorder flex items-center justify-between text-xs">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-charcoal-500">
                <SearchIcon className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Filter items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-surfaceBorder rounded focus:outline-none"
              />
            </div>
            <span className="text-charcoal-500">{filteredItems.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-center">Availability</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-charcoal-500">
                      No menu items found. Click "Add Menu Item" above to add food items.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-neutralBg/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-charcoal-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[10px] text-charcoal-500 line-clamp-1">{item.description}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.itemType === 'veg' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-forest-700"></span> Veg
                          </span>
                        )}
                        {item.itemType === 'non_veg' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-earthRed bg-earthRed-light px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-earthRed"></span> Non-Veg
                          </span>
                        )}
                        {item.itemType === 'egg' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-earthAmber bg-earthAmber-light px-2 py-0.5 rounded">
                            Egg
                          </span>
                        )}
                        {item.itemType === 'vegan' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded">
                            Vegan
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-forest-900 whitespace-nowrap">
                        ₹{item.price}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.isAvailable ? 'bg-forest-700' : 'bg-charcoal-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                              item.isAvailable ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            className="p-1 text-charcoal-500 hover:text-charcoal-900"
                            title="Edit Item"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1 text-earthRed hover:text-red-700"
                            title="Delete Item"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-md text-charcoal-900 p-4 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-xs text-forest-900 mb-3">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Woodfired Margherita Pizza"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category *</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Food Type</label>
                  <select
                    value={itemForm.itemType}
                    onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                  >
                    <option value="veg">Vegetarian (Green)</option>
                    <option value="non_veg">Non-Vegetarian (Red)</option>
                    <option value="egg">Contains Egg</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">GST Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={itemForm.taxPercent}
                    onChange={(e) => setItemForm({ ...itemForm, taxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ingredients and culinary notes..."
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="itemAvailable"
                  checked={itemForm.isAvailable}
                  onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                  className="rounded border-surfaceBorder text-forest-800"
                />
                <label htmlFor="itemAvailable" className="font-semibold cursor-pointer">
                  Available for counter billing
                </label>
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

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-xs text-charcoal-900 p-4">
            <h3 className="font-bold text-xs text-forest-900 mb-2">Create Menu Category</h3>
            <form onSubmit={handleSaveCategory}>
              <input
                type="text"
                autoFocus
                required
                value={categoryNameInput}
                onChange={(e) => setCategoryNameInput(e.target.value)}
                placeholder="e.g. Desserts & Bakes"
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded text-xs mb-3 focus:outline-none"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1 border border-surfaceBorder rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-forest-800 text-white rounded font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
