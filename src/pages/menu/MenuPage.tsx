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
  const currency = currentRestaurant?.currencySymbol || '₹';

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
      setMenuItems(backend.getMenuItems(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const setMenuItems = (loaded: MenuItem[]) => {
    setItems(loaded);
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

  const handleToggleAvailability = async (item: MenuItem) => {
    const updated: MenuItem = { ...item, isAvailable: !item.isAvailable };
    try {
      await backend.saveMenuItem(caller, updated);
      showToast(`${item.name} marked ${updated.isAvailable ? 'Available' : 'Unavailable'}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update availability', 'error');
    }
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

  const handleSaveItem = async (e: React.FormEvent) => {
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

    try {
      await backend.saveMenuItem(caller, toSave);
      setIsItemModalOpen(false);
      showToast(editingItem ? 'Item updated' : 'New menu item created', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save menu item', 'error');
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (window.confirm(`Delete "${name}" from menu?`)) {
      try {
        await backend.deleteMenuItem(caller, restId, id);
        showToast(`Deleted ${name}`, 'info');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete item', 'error');
      }
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
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

    try {
      await backend.saveCategory(caller, newCat);
      setIsCategoryModalOpen(false);
      setCategoryNameInput('');
      showToast('New category added', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    try {
      await backend.deleteCategory(caller, restId, id);
      showToast(`Category "${name}" removed`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full bg-[#F5F6F5] text-[#171B18]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E7EBE8] gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#171B18] tracking-tight">Menu Management</h1>
          <p className="text-xs text-[#59615B] font-medium mt-0.5">Dishes, pricing, dietary indicators, portion variants and availability switches</p>
        </div>

        <button
          onClick={() => handleOpenItemModal()}
          className="flex items-center gap-1.5 bg-[#078F36] hover:bg-[#087A32] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#078F36]/20 transition-all self-start"
        >
          <PlusIcon className="w-4 h-4 text-white" />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Dual Pane Layout */}
      <div className="flex-1 flex flex-col md:flex-row mt-4 gap-4 items-start">
        {/* Left Category Management Panel */}
        <div className="w-full md:w-60 bg-white border border-[#E7EBE8] rounded-2xl p-4 flex flex-col flex-shrink-0 text-xs shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE8] mb-3">
            <span className="font-extrabold text-[#171B18] uppercase tracking-wider text-xs">Categories</span>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-[#078F36] hover:text-[#087A32] p-1 rounded-lg hover:bg-[#F0F8F3]"
              title="Add Category"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[500px]">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors font-bold ${
                selectedCategoryId === 'all'
                  ? 'bg-[#078F36] text-white shadow-2xs'
                  : 'text-[#171B18] hover:bg-[#F5F6F5]'
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
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl transition-colors font-bold ${
                    isSelected
                      ? 'bg-[#078F36] text-white shadow-2xs'
                      : 'text-[#171B18] hover:bg-[#F5F6F5]'
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
                      className={`hidden group-hover:inline hover:text-red-700 ${isSelected ? 'text-white' : 'text-[#D94A43]'}`}
                      title="Delete category"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Table */}
        <div className="flex-1 w-full bg-white border border-[#E7EBE8] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="p-3.5 bg-white border-b border-[#E7EBE8] flex items-center justify-between text-xs">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#777F79]">
                <SearchIcon className="w-4 h-4 text-[#777F79]" />
              </span>
              <input
                type="text"
                placeholder="Filter dishes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F5F6F5] border border-[#E7EBE8] rounded-xl text-xs font-semibold text-[#171B18] placeholder-[#777F79] focus:outline-none focus:border-[#078F36]"
              />
            </div>
            <span className="text-xs font-bold text-[#59615B]">{filteredItems.length} dishes listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F6F5] border-b border-[#E7EBE8] text-[#171B18] font-extrabold select-none">
                  <th className="py-3 px-3.5">Dish Name</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5 text-right">Price</th>
                  <th className="py-3 px-3.5 text-center">Available</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE8]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#59615B] font-medium">
                      No menu dishes found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-[#F0F8F3]/60 transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-extrabold text-xs text-[#171B18]">{item.name}</span>
                        {item.description && (
                          <div className="text-[11px] text-[#59615B] font-medium line-clamp-1 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[#59615B]">
                        {categories.find(c => c.id === item.categoryId)?.name || 'General'}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          item.itemType === 'veg'
                            ? 'bg-[#F0F8F3] text-[#078F36] border-[#D8EFDF]'
                            : 'bg-red-50 text-[#D94A43] border-red-200'
                        }`}>
                          {item.itemType}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-extrabold text-sm text-[#171B18]">
                        {currency}{item.price}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.isAvailable ? 'bg-[#078F36]' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                              item.isAvailable ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            className="p-1 text-[#777F79] hover:text-[#078F36]"
                            title="Edit Item"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1 text-[#D94A43] hover:text-red-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-md text-[#171B18] p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-[#171B18] mb-3">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Woodfired Margherita Pizza"
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-[#171B18] mb-1">Category *</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36] bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-xs text-[#171B18] mb-1">Food Type</label>
                  <select
                    value={itemForm.itemType}
                    onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36] bg-white"
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
                  <label className="block font-bold text-xs text-[#171B18] mb-1">Price ({currency}) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-[#171B18] mb-1">GST Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={itemForm.taxPercent}
                    onChange={(e) => setItemForm({ ...itemForm, taxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ingredients and culinary notes..."
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl text-xs font-semibold text-[#171B18] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="itemAvailable"
                  checked={itemForm.isAvailable}
                  onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                  className="rounded border-[#E7EBE8] text-[#078F36] focus:ring-[#078F36]"
                />
                <label htmlFor="itemAvailable" className="font-bold text-xs text-[#171B18]">
                  Available for Billing
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7EBE8]">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border border-[#E7EBE8] rounded-xl font-bold text-[#59615B] hover:text-[#171B18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl font-bold shadow-md shadow-[#078F36]/20 transition-all flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4 text-white" />
                  <span>Save Menu Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-sm text-[#171B18] p-5">
            <h3 className="font-extrabold text-sm text-[#171B18] mb-3">Add Menu Category</h3>
            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  placeholder="e.g. Starters, Beverages, Desserts"
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7EBE8]">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-[#E7EBE8] rounded-xl font-bold text-[#59615B] hover:text-[#171B18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#078F36] hover:bg-[#087A32] text-white rounded-xl font-bold shadow-md shadow-[#078F36]/20 transition-all flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4 text-white" />
                  <span>Create Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
