import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { RestaurantType } from '../../types';

export const SettingsPage: React.FC = () => {
  const { currentRestaurant, currentUser, refreshSession } = useAuth();
  const { showToast } = useToast();

  const caller = {
    restaurantId: currentRestaurant?.id || '',
    role: currentUser?.role || 'owner'
  };

  const [form, setForm] = useState({
    name: currentRestaurant?.name || '',
    ownerName: currentRestaurant?.ownerName || '',
    phone: currentRestaurant?.phone || '',
    email: currentRestaurant?.email || '',
    address: currentRestaurant?.address || '',
    restaurantType: (currentRestaurant?.restaurantType || 'Restaurant') as RestaurantType,
    gstNumber: currentRestaurant?.gstNumber || '',
    fssaiNumber: currentRestaurant?.fssaiNumber || '',
    taxRatePercent: currentRestaurant?.taxRatePercent || 5.0,
    serviceChargePercent: currentRestaurant?.serviceChargePercent || 0,
    invoicePrefix: currentRestaurant?.invoicePrefix || 'INV-',
    upiId: currentRestaurant?.upiId || '',
    currencySymbol: currentRestaurant?.currencySymbol || '₹'
  });

  const [printerPaper, setPrinterPaper] = useState('80mm');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRestaurant) return;

    try {
      const updated = {
        ...currentRestaurant,
        name: form.name.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        restaurantType: form.restaurantType,
        gstNumber: form.gstNumber.trim() || undefined,
        fssaiNumber: form.fssaiNumber.trim() || undefined,
        taxRatePercent: Number(form.taxRatePercent),
        serviceChargePercent: Number(form.serviceChargePercent),
        invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
        upiId: form.upiId.trim() || undefined,
        currencySymbol: form.currencySymbol.trim()
      };

      backend.updateRestaurantSettings(caller, updated);
      refreshSession();
      showToast('Restaurant profile & billing settings saved', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="pb-4 border-b border-surfaceBorder">
        <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Restaurant Settings</h1>
        <p className="text-xs text-charcoal-500 mt-0.5">Profile identity, tax registration, invoice prefix, UPI payment handle and thermal hardware</p>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-6 text-xs">
        {/* Business Profile */}
        <div className="bg-white border border-surfaceBorder rounded p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-forest-900">Establishment Identity & Contact</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Restaurant Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Establishment Category</label>
              <select
                value={form.restaurantType}
                onChange={(e) => setForm({ ...form, restaurantType: e.target.value as RestaurantType })}
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Cafe">Cafe</option>
                <option value="Bakery">Bakery</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Hotel">Hotel</option>
                <option value="Cloud Kitchen">Cloud Kitchen</option>
                <option value="Food Truck">Food Truck</option>
                <option value="Juice Shop">Juice Shop</option>
                <option value="Ice Cream Shop">Ice Cream Shop</option>
                <option value="Multi-Cuisine Restaurant">Multi-Cuisine Restaurant</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Owner Name *</label>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Physical Address (printed on receipt) *</label>
            <textarea
              rows={2}
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
            />
          </div>
        </div>

        {/* Taxes & Legal */}
        <div className="bg-white border border-surfaceBorder rounded p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-forest-900">Legal Compliance & Tax Invoicing</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">GSTIN Number (Optional)</label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                placeholder="29ABCDE1234F1Z5"
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">FSSAI Registration (Optional)</label>
              <input
                type="text"
                value={form.fssaiNumber}
                onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value })}
                placeholder="11223344556677"
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">GST Tax Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={form.taxRatePercent}
                onChange={(e) => setForm({ ...form, taxRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Service Charge (%)</label>
              <input
                type="number"
                step="0.5"
                value={form.serviceChargePercent}
                onChange={(e) => setForm({ ...form, serviceChargePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Invoice Prefix *</label>
              <input
                type="text"
                required
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
                placeholder="INV-"
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none uppercase font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Payment UPI & Printer */}
        <div className="bg-white border border-surfaceBorder rounded p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-forest-900">Payment & Hardware Hardware</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Merchant UPI ID (for live counter QR)</label>
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                placeholder="restaurant@bank"
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Thermal Receipt Width</label>
              <select
                value={printerPaper}
                onChange={(e) => setPrinterPaper(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
              >
                <option value="80mm">Standard 80mm Roll (3-Inch Counter Thermal)</option>
                <option value="58mm">Compact 58mm Roll (2-Inch Handheld Thermal)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded font-bold shadow-xs transition-colors"
          >
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
};
