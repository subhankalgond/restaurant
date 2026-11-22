import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AppIcons } from '../../components/common/Icons';

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
        reply: 'Ticket acknowledged by DineFlow Support Engineering. An agent is reviewing your logs.',
      };
      setSubmittedTickets([newTicket, ...submittedTickets]);
      setTicketSubject('');
      setTicketDescription('');
      setIsSubmitting(false);
      showToast('Support ticket logged successfully', 'success');
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2421]">Help & Support Center</h1>
        <p className="text-xs text-[#6C757D]">
          Operational guides, diagnostic information, and priority technical assistance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Ticket Submission Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E5E0D8] rounded p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#1F2421] mb-1">Submit Priority Support Ticket</h2>
            <p className="text-xs text-[#6C757D] mb-4">
              Need assistance with billing workflows, hardware integration, or tax calculations?
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                    Category *
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] bg-white focus:outline-none focus:border-[#1B4332]"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Include steps to reproduce, printer model if applicable, and expected behavior..."
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1B4332] text-white rounded text-sm font-semibold hover:bg-[#2D6A4F] disabled:opacity-50 flex items-center gap-2"
                >
                  <AppIcons.Check />
                  <span>{isSubmitting ? 'Logging Ticket...' : 'Submit Support Request'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Ticket History */}
          <div className="bg-white border border-[#E5E0D8] rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5E0D8]">
              <h3 className="text-sm font-bold text-[#1F2421]">Recent Support Tickets</h3>
            </div>
            <div className="divide-y divide-[#E5E0D8]">
              {submittedTickets.map((t) => (
                <div key={t.id} className="p-4 hover:bg-[#FBF9F5] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-[#1B4332]">{t.id}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        t.status === 'Resolved'
                          ? 'bg-[#EBF5EE] text-[#1B4332]'
                          : 'bg-[#FDF6ED] text-[#A76527]'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#1F2421]">{t.subject}</h4>
                  <div className="flex gap-4 text-xs text-[#6C757D] mt-1">
                    <span>Category: {t.category}</span>
                    <span>Logged: {t.date}</span>
                  </div>
                  {t.reply && (
                    <div className="mt-2 p-2.5 bg-[#FBF9F5] border border-[#E5E0D8] rounded text-xs text-[#1F2421]">
                      <span className="font-bold text-[#1B4332]">Support Reply: </span>
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
          <div className="bg-white border border-[#E5E0D8] rounded p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#1F2421] mb-3 flex items-center gap-2">
              <AppIcons.Settings />
              <span>Workspace Diagnostics</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
                <span className="text-[#6C757D]">Restaurant:</span>
                <span className="font-semibold text-[#1F2421]">
                  {currentRestaurant?.name || 'Platform Scope'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
                <span className="text-[#6C757D]">Tenant ID:</span>
                <span className="font-mono text-[11px] text-[#1F2421]">
                  {currentRestaurant?.id || 'GLOBAL_SUPERADMIN'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
                <span className="text-[#6C757D]">Current Operator:</span>
                <span className="font-semibold text-[#1F2421]">{currentUser?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
                <span className="text-[#6C757D]">Role:</span>
                <span className="font-bold uppercase text-[10px] text-[#1B4332] bg-[#EBF5EE] px-1.5 py-0.5 rounded">
                  {currentUser?.role}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
                <span className="text-[#6C757D]">Print Engine:</span>
                <span className="font-semibold text-[#1F2421]">CSS3 @media print (Thermal)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#6C757D]">Offline Cache:</span>
                <span className="text-[#1B4332] font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#1B4332]"></span> Active
                </span>
              </div>
            </div>
          </div>

          {/* Quick Troubleshooting Guide */}
          <div className="bg-white border border-[#E5E0D8] rounded p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#1F2421] mb-3">Thermal Printer Checklist</h3>
            <ol className="space-y-2 text-xs text-[#6C757D] list-decimal pl-4">
              <li>
                <strong>Browser Margins:</strong> In the browser print dialog, set Margins to <em>None</em> or <em>Minimum</em>.
              </li>
              <li>
                <strong>Headers & Footers:</strong> Uncheck <em>Headers and Footers</em> to prevent the page URL from printing on receipts.
              </li>
              <li>
                <strong>Paper Width:</strong> Ensure your printer settings match either 80mm (3-inch standard) or 58mm (2-inch compact) selected in Settings.
              </li>
              <li>
                <strong>KOT Routing:</strong> Kitchen tickets print separate KOT slips without tax details for prep stations.
              </li>
            </ol>
          </div>

          {/* Contact Details */}
          <div className="bg-[#EBF5EE] border border-[#C2E0C6] rounded p-5">
            <h3 className="text-sm font-bold text-[#1B4332] mb-1">Direct Technical Desk</h3>
            <p className="text-xs text-[#1F2421] mb-3">
              Standard operating hours: Monday through Sunday, 8:00 AM – 11:00 PM IST.
            </p>
            <div className="space-y-1 text-xs">
              <div>
                <strong>Support Desk:</strong> support@dineflow.io
              </div>
              <div>
                <strong>Toll-free Hotline:</strong> 1800-419-3463
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
