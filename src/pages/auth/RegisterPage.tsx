import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ChiliLogoIcon, CheckIcon } from '../../components/common/Icons';

interface RegisterPageProps {
  onNavigateLogin: () => void;
  onNavigateTerms: () => void;
  onNavigatePrivacy: () => void;
}

const RESTAURANT_TYPES = [
  'Restaurant',
  'Cafe',
  'Bakery',
  'Fast Food',
  'Hotel',
  'Cloud Kitchen',
  'Food Truck',
  'Juice Shop',
  'Ice Cream Shop',
  'Multi-Cuisine Restaurant',
];

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateLogin,
  onNavigateTerms,
  onNavigatePrivacy,
}) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [restaurantType, setRestaurantType] = useState('Restaurant');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantName.trim() || !ownerName.trim() || !email.trim() || !password || !phone.trim() || !address.trim()) {
      showToast('Please complete all required fields', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (!agreedToTerms) {
      showToast('Please accept the Terms and Privacy Policy to continue', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        restaurantName: restaurantName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        address: address.trim(),
        restaurantType,
        gstNumber: gstNumber.trim() || undefined,
        fssaiNumber: fssaiNumber.trim() || undefined,
      });
      showToast('Restaurant workspace created successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F5] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center items-center gap-3">
          <ChiliLogoIcon className="w-10 h-10 shadow-sm" size={40} />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#171B18]">CHILI POS</h1>
            <p className="text-xs text-[#777F79]">New Restaurant Onboarding</p>
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-extrabold text-[#171B18]">
          Launch Your Restaurant POS Workspace
        </h2>
        <p className="mt-1 text-center text-xs text-[#777F79]">
          Initializes your dedicated database, billing sequence, default menu categories, and owner account.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E7EBE8] rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Restaurant Name & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="e.g. The Rustic Oven"
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  Restaurant Type *
                </label>
                <select
                  value={restaurantType}
                  onChange={(e) => setRestaurantType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] bg-white focus:outline-none focus:border-[#078F36]"
                >
                  {RESTAURANT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Owner Name & Contact Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
                />
              </div>
            </div>

            {/* Email Account */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                Owner Email (Login Account) *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@restaurant.com"
                className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
              />
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
                />
              </div>
            </div>

            {/* GSTIN and FSSAI License Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  GSTIN No (Tax ID)
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36] uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                  FSSAI License No
                </label>
                <input
                  type="text"
                  value={fssaiNumber}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  placeholder="e.g. 11223344556677 (14 digits)"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36] font-mono"
                />
              </div>
            </div>

            {/* Physical Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                Full Physical Address *
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 14, High Street Market, City - 560001"
                className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
              />
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer text-xs text-[#777F79]">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[#E7EBE8] text-[#078F36] focus:ring-[#078F36]"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={onNavigateTerms}
                    className="text-[#078F36] underline font-semibold"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={onNavigatePrivacy}
                    className="text-[#078F36] underline font-semibold"
                  >
                    Privacy Policy
                  </button>
                  . I understand my restaurant data is isolated and strictly confidential.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#078F36] hover:bg-[#087A32] text-white text-sm font-bold rounded-xl shadow-md shadow-[#078F36]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {isSubmitting ? (
                <span>Provisioning Restaurant Workspace...</span>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 text-white" />
                  <span>Register & Launch Workspace</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E7EBE8] text-center">
            <p className="text-sm text-[#777F79]">
              Already registered?{' '}
              <button
                type="button"
                onClick={onNavigateLogin}
                className="font-bold text-[#078F36] hover:underline"
              >
                Sign in to your account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
