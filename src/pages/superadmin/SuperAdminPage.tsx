import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backend } from '../../db/backendService';
import { Restaurant, PlatformAuditLog } from '../../types';
import { ShieldIcon, SearchIcon } from '../../components/common/Icons';

export const SuperAdminPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const caller = {
    role: currentUser?.role || 'superadmin',
    name: currentUser?.name || 'Platform Admin'
  };

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'audit'>('accounts');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    try {
      setRestaurants(backend.getAllRestaurants(caller));
      setAuditLogs(backend.getPlatformAuditLogs(caller));
    } catch (e: any) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    loadData();
    return backend.subscribe(loadData);
  }, []);

  const handleToggleStatus = (rest: Restaurant) => {
    const nextStatus = rest.status === 'active' ? 'suspended' : 'active';
    try {
      backend.setRestaurantStatus(caller, rest.id, nextStatus);
      showToast(`Restaurant ${rest.name} status updated to ${nextStatus.toUpperCase()}`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full text-xs">
      {/* Notice */}
      <div className="flex items-center gap-2 p-3 bg-forest-900 text-white rounded mb-4">
        <ShieldIcon className="w-5 h-5 text-forest-100 flex-shrink-0" />
        <div>
          <span className="font-bold">Platform Super Admin Gateway:</span> Tenant oversight, restaurant account approvals, suspension controls, and system audit logs.
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-surfaceBorder gap-3">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight">Platform Account Oversight</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">Manage independent restaurant tenants, status permissions and audit trail</p>
        </div>

        <div className="flex items-center bg-surface border border-surfaceBorder rounded p-0.5">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded font-bold ${
              activeTab === 'accounts' ? 'bg-forest-800 text-white' : 'text-charcoal-700'
            }`}
          >
            Restaurant Accounts ({restaurants.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded font-bold ${
              activeTab === 'audit' ? 'bg-forest-800 text-white' : 'text-charcoal-700'
            }`}
          >
            Platform Audit Logs
          </button>
        </div>
      </div>

      {activeTab === 'accounts' ? (
        <>
          {/* Search bar */}
          <div className="bg-white p-3 rounded border border-surfaceBorder shadow-xs mt-4 flex items-center justify-between">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-charcoal-500">
                <SearchIcon className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search by restaurant or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-neutralBg border border-surfaceBorder rounded focus:outline-none"
              />
            </div>
            <span className="text-charcoal-500">{filteredRestaurants.length} registered restaurants</span>
          </div>

          {/* Table */}
          <div className="bg-white border border-surfaceBorder rounded shadow-xs mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                    <th className="py-2.5 px-3">Restaurant Name</th>
                    <th className="py-2.5 px-3">Owner Contact</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Registered On</th>
                    <th className="py-2.5 px-3 text-center">Account Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceBorder">
                  {filteredRestaurants.map(rest => (
                    <tr key={rest.id} className="hover:bg-neutralBg/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-charcoal-900">{rest.name}</div>
                        <div className="text-[10px] text-charcoal-400 font-mono">{rest.id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-charcoal-800">{rest.ownerName}</div>
                        <div className="text-[10px] text-charcoal-500 font-mono">{rest.email} &bull; {rest.phone}</div>
                      </td>
                      <td className="py-2.5 px-3 text-charcoal-700">{rest.restaurantType}</td>
                      <td className="py-2.5 px-3 text-charcoal-500 font-mono">{new Date(rest.createdAt).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rest.status === 'active' ? 'bg-forest-100 text-forest-700 border border-forest-600/30' :
                          'bg-earthRed-light text-earthRed border border-earthRed-border'
                        }`}>
                          {rest.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleToggleStatus(rest)}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                            rest.status === 'active'
                              ? 'text-earthRed border-earthRed-border hover:bg-earthRed-light'
                              : 'text-forest-700 border-forest-600/30 hover:bg-forest-100'
                          }`}
                        >
                          {rest.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Audit Trail */
        <div className="bg-white border border-surfaceBorder rounded shadow-xs mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surfaceBorder text-charcoal-700 font-semibold select-none">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-charcoal-500">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-neutralBg/70">
                      <td className="py-2.5 px-3 text-charcoal-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono text-forest-900">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-charcoal-800">
                        {log.actorName} ({log.actorRole})
                      </td>
                      <td className="py-2.5 px-3 text-charcoal-700">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
