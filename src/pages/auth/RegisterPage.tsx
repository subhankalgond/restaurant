import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AppIcons } from '../../components/common/Icons';

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
      });
      showToast('Restaurant workspace created successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 rounded bg-[#1B4332] text-white flex items-center justify-center font-bold text-xl shadow-sm">
            DF
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1F2421]">DineFlow</h1>
            <p className="text-xs text-[#6C757D]">New Restaurant Onboarding</p>
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold text-[#1F2421]">
          Launch Your Restaurant POS Workspace
        </h2>
        <p className="mt-1 text-center text-xs text-[#6C757D]">
          Initializes your dedicated database, billing sequence, default menu categories, and owner account.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E5E0D8] rounded sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="e.g. The Rustic Oven"
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                  Restaurant Type *
                </label>
                <select
                  value={restaurantType}
                  onChange={(e) => setRestaurantType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] bg-white focus:outline-none focus:border-[#1B4332]"
                >
                  {RESTAURANT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                Owner Email (Login Account) *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@restaurant.com"
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                Full Physical Address *
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 14, High Street Market, City - 560001"
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer text-xs text-[#6C757D]">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[#E5E0D8] text-[#1B4332] focus:ring-[#1B4332]"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={onNavigateTerms}
                    className="text-[#1B4332] underline font-medium"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={onNavigatePrivacy}
                    className="text-[#1B4332] underline font-medium"
                  >
                    Privacy Policy
                  </button>
                  . I understand my restaurant data is isolated and strictly confidential.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-semibold rounded shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {isSubmitting ? (
                <span>Provisioning Restaurant Workspace...</span>
              ) : (
                <>
                  <AppIcons.Check />
                  <span>Register & Launch Workspace</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E5E0D8] text-center">
            <p className="text-sm text-[#6C757D]">
              Already registered?{' '}
              <button
                type="button"
                onClick={onNavigateLogin}
                className="font-semibold text-[#1B4332] hover:underline"
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
