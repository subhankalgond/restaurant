import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { User } from '../../types';
import { PlusIcon } from '../../components/common/Icons';

export const StaffPage: React.FC = () => {
  const { currentRestaurant, currentUser } = useAuth();
  const { showToast } = useToast();
  const restId = currentRestaurant?.id || '';

  const caller = {
    restaurantId: restId,
    role: currentUser?.role || 'owner',
    userId: currentUser?.id || ''
  };

  const [staffList, setStaffList] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier' as 'cashier' | 'kitchen',
    password: ''
  });

  const loadData = () => {
    if (!restId) return;
    try {
      setStaffList(backend.getStaff(caller, restId));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, [restId]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;

    try {
      await backend.createStaff(caller, restId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        password: form.password
      });

      setIsModalOpen(false);
      setForm({ name: '', email: '', phone: '', role: 'cashier', password: '' });
      showToast('Staff account created successfully', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleStatus = (staff: User) => {
    try {
      backend.toggleStaffStatus(caller, restId, staff.id);
      showToast(`${staff.name} status updated`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">Staff Management</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">Manage cashier terminals, kitchen crew accounts and credential access</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-forest-800 hover:bg-forest-900 text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Role explanation */}
      <div className="mt-4 p-3 bg-surface border border-surfaceBorder rounded text-xs">
        <h4 className="font-bold text-forest-900 mb-1">Role Permissions Enforcement</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-charcoal-600">
          <div><strong className="text-charcoal-900">Owner:</strong> Full access to POS, menus, tables, staff, inventory and financial reports.</div>
          <div><strong className="text-charcoal-900">Cashier:</strong> Restricted to POS billing, tables, order creation and receipts.</div>
          <div><strong className="text-charcoal-900">Kitchen Staff:</strong> Restricted to the Kitchen Display System (KDS) order board.</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-surfaceBorder rounded shadow-xs mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                <th className="py-2.5 px-3">Staff Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceBorder">
              {staffList.map(member => (
                <tr key={member.id} className="hover:bg-neutralBg/70 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-charcoal-900">{member.name}</span>
                    {member.id === currentUser?.id && (
                      <span className="ml-2 text-[10px] text-forest-700 bg-forest-100 px-1.5 py-0.5 rounded font-bold">
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-charcoal-700">{member.email}</td>
                  <td className="py-2.5 px-3 font-mono text-charcoal-500">{member.phone || 'N/A'}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface text-charcoal-800">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      member.isActive ? 'bg-forest-100 text-forest-700' : 'bg-earthRed-light text-earthRed'
                    }`}>
                      {member.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          member.isActive
                            ? 'text-earthRed border-earthRed-border hover:bg-earthRed-light'
                            : 'text-forest-700 border-forest-600/30 hover:bg-forest-100'
                        }`}
                      >
                        {member.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded border border-surfaceBorder shadow-xl w-full max-w-sm text-charcoal-900 p-4">
            <h3 className="font-bold text-xs text-forest-900 mb-3">Add Staff Member</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Login Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="staff@restaurant.com"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Assigned Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none capitalize"
                >
                  <option value="cashier">Cashier (POS & Billing)</option>
                  <option value="kitchen">Kitchen Staff (Kitchen Display Board)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-2.5 py-1.5 border border-surfaceBorder rounded focus:outline-none"
                />
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
