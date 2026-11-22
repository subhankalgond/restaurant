import React from 'react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#FBF9F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white border border-[#E5E0D8] rounded p-6 sm:p-10 shadow-sm">
        <div className="mb-6 pb-4 border-b border-[#E5E0D8] flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2421]">Terms & Conditions</h1>
            <p className="text-xs text-[#6C757D]">Effective Date: November 2026</p>
          </div>
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-[#E5E0D8] rounded text-xs font-semibold text-[#1F2421] hover:bg-[#FBF9F5]"
          >
            Back to Application
          </button>
        </div>

        <div className="prose prose-sm text-[#1F2421] space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[#1F2421] mb-2">1. Master Service Agreement</h2>
            <p>
              These Terms of Service govern your use of the DineFlow Multi-Restaurant Point of Sale and Billing Platform. By registering an account, provisioning a restaurant workspace, or allowing your staff to process transactions, you enter into a legally binding agreement.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1F2421] mb-2">2. Multi-Tenant Separation & Data Ownership</h2>
            <p>
              Each registered restaurant operates within an isolated tenant partition. Your recipes, menu pricing, bill histories, customer phone records, and revenue statistics are exclusively owned by you. Platform administrators do not inspect, monetize, or disclose your confidential trading records.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1F2421] mb-2">3. Billing, Invoicing & Tax Compliance</h2>
            <p>
              You acknowledge that the calculation of taxes (including Goods and Services Tax, VAT, or local levies) is executed based upon the tax percentage configurations specified in your Restaurant Settings. You are solely responsible for ensuring your GSTIN, FSSAI registration numbers, and invoice numbering sequences comply with local statutory tax mandates.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1F2421] mb-2">4. Thermal Hardware & Peripheral Integration</h2>
            <p>
              The platform provides browser-native thermal print outputs formatted for standard ESC/POS 80mm and 58mm thermal receipt printers. Hardware performance, USB/Bluetooth communication, and paper feed alignment remain dependent on your local operating environment and printer manufacturer specifications.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1F2421] mb-2">5. Staff Accountability & Void Auditing</h2>
            <p>
              All voided items, cancelled bills, and cash drawer reconciliations are logged with operator timestamps. Restaurant owners remain responsible for access privileges delegated to Cashiers and Kitchen Staff.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1F2421] mb-2">6. Limitation of Liability</h2>
            <p>
              In no event shall the platform providers be liable for indirect, incidental, or consequential damages resulting from local network interruptions, local hardware malfunctions, or cashier misentry during rush operating hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
