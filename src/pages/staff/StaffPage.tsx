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
    if (!restId) return;
    backend.fetchStaff(caller, restId).catch((err: any) => {
      showToast(err.message || 'Failed to load staff', 'error');
    });
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

  const handleToggleStatus = async (staff: User) => {
    try {
      await backend.toggleStaffStatus(caller, restId, staff.id);
      showToast(`${staff.name} status updated`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full bg-[#F5F6F5] text-[#171B18]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E7EBE8] gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#171B18] tracking-tight">Staff Management</h1>
          <p className="text-xs text-[#59615B] font-medium mt-0.5">Manage cashier terminals, kitchen crew accounts and credential access</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#078F36] hover:bg-[#087A32] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#078F36]/20 transition-all self-start"
        >
          <PlusIcon className="w-3.5 h-3.5 text-white" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Role explanation */}
      <div className="mt-4 p-4 bg-[#F0F8F3] border border-[#D8EFDF] rounded-2xl text-xs text-[#171B18]">
        <h4 className="font-extrabold text-sm text-[#078F36] mb-1.5">Role Permissions Enforcement</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#171B18]">
          <div className="bg-white/80 p-2.5 rounded-xl border border-[#D8EFDF]">
            <strong className="text-[#078F36] block font-extrabold mb-0.5">Owner</strong>
            <span className="text-[#59615B] font-medium">Full access to POS, menus, tables, staff, inventory and financial reports.</span>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-[#D8EFDF]">
            <strong className="text-[#078F36] block font-extrabold mb-0.5">Cashier</strong>
            <span className="text-[#59615B] font-medium">Restricted to POS billing, tables, order creation and receipts.</span>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-[#D8EFDF]">
            <strong className="text-[#078F36] block font-extrabold mb-0.5">Kitchen Staff</strong>
            <span className="text-[#59615B] font-medium">Restricted to the Kitchen Display System (KDS) order board.</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E7EBE8] rounded-2xl shadow-sm mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F6F5] border-b border-[#E7EBE8] text-[#171B18] font-extrabold select-none">
                <th className="py-3 px-3.5">Staff Name</th>
                <th className="py-3 px-3.5">Email Address</th>
                <th className="py-3 px-3.5">Phone</th>
                <th className="py-3 px-3.5">Role</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE8]">
              {staffList.map(member => (
                <tr key={member.id} className="hover:bg-[#F0F8F3]/60 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-extrabold text-[#171B18] text-xs">{member.name}</span>
                    {member.id === currentUser?.id && (
                      <span className="ml-2 text-[10px] text-[#078F36] bg-[#D8EFDF] px-2 py-0.5 rounded-full font-bold">
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-bold text-[#171B18]">{member.email}</td>
                  <td className="py-3 px-3.5 font-mono font-semibold text-[#59615B]">{member.phone || 'N/A'}</td>
                  <td className="py-3 px-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#F5F6F5] border border-[#E7EBE8] text-[#171B18]">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${member.isActive
                      ? 'bg-[#F0F8F3] text-[#078F36] border-[#D8EFDF]'
                      : 'bg-red-50 text-[#D94A43] border-red-200'
                      }`}>
                      {member.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase border transition-colors ${member.isActive
                          ? 'text-[#D94A43] border-red-200 hover:bg-red-50'
                          : 'text-[#078F36] border-[#D8EFDF] hover:bg-[#F0F8F3]'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-2xl w-full max-w-sm text-[#171B18] p-5">
            <h3 className="font-extrabold text-sm text-[#171B18] mb-3">Add Staff Member</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Login Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="staff@restaurant.com"
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Assigned Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36] bg-white capitalize"
                >
                  <option value="cashier">Cashier (POS & Billing)</option>
                  <option value="kitchen">Kitchen Staff (Kitchen Display Board)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#171B18] mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl font-bold text-xs text-[#171B18] focus:outline-none focus:border-[#078F36]"
                />
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
