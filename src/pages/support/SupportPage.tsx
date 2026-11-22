import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SettingsIcon, CheckIcon } from '../../components/common/Icons';

export const SupportPage: React.FC = () => {
  const { currentUser, currentRestaurant } = useAuth();
  const { showToast } = useToast();

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Hardware / Thermal Printer');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTickets, setSubmittedTickets] = useState([
    {
      id: 'TICK-9021',
      date: '2026-11-20',
      subject: 'Thermal 80mm ESC/POS Auto Cutter Setup',
      category: 'Printer Hardware',
      status: 'Resolved',
      reply: 'Browser print settings configured with 0 margins and automatic cutter signaling verified.',
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      showToast('Please fill out the ticket subject and description', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newTicket = {
        id: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        subject: ticketSubject.trim(),
        category: ticketCategory,
        status: 'Open',
        reply: 'Ticket acknowledged by Support Engineering. An agent is reviewing your logs.',
      };
      setSubmittedTickets([newTicket, ...submittedTickets]);
      setTicketSubject('');
      setTicketDescription('');
      setIsSubmitting(false);
      showToast('Support ticket logged successfully', 'success');
    }, 600);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-[#F8FAFC]">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Help & Support Center</h1>
        <p className="text-xs text-gray-400">
          Operational guides, diagnostic information, and priority technical assistance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Ticket Submission Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111622] border border-[#1E2638] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Submit Priority Support Ticket</h2>
            <p className="text-xs text-gray-400 mb-4">
              Need assistance with billing workflows, hardware integration, or tax calculations?
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1E2638] bg-[#161C2A] rounded-xl text-sm text-white focus:outline-none focus:border-[#00D26A]"
                  >
                    <option value="Hardware / Thermal Printer">Hardware / Thermal Printer</option>
                    <option value="POS & Billing Workflow">POS & Billing Workflow</option>
                    <option value="Tax & GST Invoicing">Tax & GST Invoicing</option>
                    <option value="Staff Permissions & Roles">Staff Permissions & Roles</option>
                    <option value="Kitchen Display System">Kitchen Display System</option>
                    <option value="Account & Subscription">Account & Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full px-3 py-2 border border-[#1E2638] bg-[#161C2A] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00D26A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Include steps to reproduce, printer model if applicable, and expected behavior..."
                  className="w-full px-3 py-2 border border-[#1E2638] bg-[#161C2A] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00D26A]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#00D26A] text-[#080A0F] rounded-xl text-sm font-extrabold hover:bg-[#00B85C] disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  <CheckIcon className="w-4 h-4 text-[#080A0F]" />
                  <span>{isSubmitting ? 'Logging Ticket...' : 'Submit Support Request'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Ticket History */}
          <div className="bg-[#111622] border border-[#1E2638] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1E2638]">
              <h3 className="text-sm font-bold text-white">Recent Support Tickets</h3>
            </div>
            <div className="divide-y divide-[#1E2638]">
              {submittedTickets.map((t) => (
                <div key={t.id} className="p-4 hover:bg-[#161C2A] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-[#00D26A]">{t.id}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        t.status === 'Resolved'
                          ? 'bg-emerald-500/10 text-[#00D26A] border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{t.subject}</h4>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span>Category: {t.category}</span>
                    <span>Logged: {t.date}</span>
                  </div>
                  {t.reply && (
                    <div className="mt-2 p-2.5 bg-[#0B0E14] border border-[#1E2638] rounded-xl text-xs text-gray-300">
                      <span className="font-bold text-[#00D26A]">Support Reply: </span>
                      {t.reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnostics & Troubleshooting Panel */}
        <div className="space-y-6">
          {/* System Diagnostics */}
          <div className="bg-[#111622] border border-[#1E2638] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[#00D26A]" />
              <span>Workspace Diagnostics</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#1E2638]">
                <span className="text-gray-400">Restaurant:</span>
                <span className="font-semibold text-white">
                  {currentRestaurant?.name || 'Platform Scope'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E2638]">
                <span className="text-gray-400">Tenant ID:</span>
                <span className="font-mono text-[11px] text-gray-300">
                  {currentRestaurant?.id || 'GLOBAL_SUPERADMIN'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E2638]">
                <span className="text-gray-400">Current Operator:</span>
                <span className="font-semibold text-white">{currentUser?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E2638]">
                <span className="text-gray-400">Role:</span>
                <span className="font-bold uppercase text-[10px] text-[#00D26A] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {currentUser?.role}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1E2638]">
                <span className="text-gray-400">Print Engine:</span>
                <span className="font-semibold text-white">CSS3 @media print (Thermal)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400">Offline Cache:</span>
                <span className="text-[#00D26A] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]"></span> Active
                </span>
              </div>
            </div>
          </div>

          {/* Quick Troubleshooting Guide */}
          <div className="bg-[#111622] border border-[#1E2638] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Thermal Printer Checklist</h3>
            <ol className="space-y-2 text-xs text-gray-400 list-decimal pl-4">
              <li>
                <strong className="text-gray-200">Browser Margins:</strong> In the browser print dialog, set Margins to <em>None</em> or <em>Minimum</em>.
              </li>
              <li>
                <strong className="text-gray-200">Headers & Footers:</strong> Uncheck <em>Headers and Footers</em> to prevent the page URL from printing on receipts.
              </li>
              <li>
                <strong className="text-gray-200">Paper Width:</strong> Ensure your printer settings match either 80mm (3-inch standard) or 58mm (2-inch compact) selected in Settings.
              </li>
              <li>
                <strong className="text-gray-200">KOT Routing:</strong> Kitchen tickets print separate KOT slips without tax details for prep stations.
              </li>
            </ol>
          </div>

          {/* Contact Details */}
          <div className="bg-[#161C2A] border border-[#1E2638] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[#00D26A] mb-1">Direct Technical Desk</h3>
            <p className="text-xs text-gray-400 mb-3">
              Standard operating hours: Monday through Sunday, 8:00 AM – 11:00 PM IST.
            </p>
            <div className="space-y-1.5 text-xs text-gray-300">
              <div>
                <strong className="text-white">Support Desk:</strong> support@restropos.io
              </div>
              <div>
                <strong className="text-white">Toll-free Hotline:</strong> 1800-419-3463
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
