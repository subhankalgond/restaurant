import React from 'react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#111622] border border-[#1E2638] rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="mb-6 pb-4 border-b border-[#1E2638] flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
            <p className="text-xs text-gray-400">Last Updated: November 2026</p>
          </div>
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 border border-[#1E2638] rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#161C2A] transition-colors"
          >
            Back to Application
          </button>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Scope of Data Collection</h2>
            <p>
              RestroPOS collects only the minimal operational data necessary to process dining orders, generate legal tax invoices, manage kitchen prep tickets, and compile restaurant sales metrics.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Information We Process</h2>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
              <li><strong className="text-gray-200">Restaurant Entity Profile:</strong> Legal restaurant name, address, owner contact credentials, GST and FSSAI identifiers.</li>
              <li><strong className="text-gray-200">Transaction Records:</strong> Sequential invoice tallies, itemized dish breakdowns, payment tenders (Cash, Card, UPI), and timestamped order states.</li>
              <li><strong className="text-gray-200">Patron Data:</strong> Optional customer name and phone numbers recorded exclusively at checkout for invoice generation.</li>
              <li><strong className="text-gray-200">Staff Operations:</strong> Operator login credentials, role assignments, and bill cancellation audit remarks.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Multi-Tenant Cryptographic Boundaries</h2>
            <p>
              The platform strictly enforces tenant isolation. No data belonging to Restaurant A can be accessed, queried, or aggregated by Restaurant B. All passwords undergo client and server SHA-256 cryptographic hashing prior to storage.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Third-Party Sharing and Marketing</h2>
            <p>
              We do not sell, rent, monetize, or distribute customer contact details or restaurant sales histories to third-party marketing entities or food aggregator networks.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Data Retention & Backups</h2>
            <p>
              Your transaction ledgers and inventory journals remain within your tenant workspace. Restaurant owners may export complete historical sales reports to standard CSV format at any time from the Reports module.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
