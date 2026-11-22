import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AppIcons } from '../../components/common/Icons';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigateHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      showToast('Signed in successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Enter your registered email address', 'error');
      return;
    }
    setResetSuccess(true);
    showToast('Password reset link sent to ' + resetEmail, 'success');
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 rounded bg-[#1B4332] text-white flex items-center justify-center font-bold text-xl shadow-sm">
            DF
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1F2421]">DineFlow</h1>
            <p className="text-xs text-[#6C757D]">Multi-Restaurant POS & Billing Engine</p>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-bold text-[#1F2421]">
          Sign in to your restaurant workspace
        </h2>
        <p className="mt-1 text-center text-sm text-[#6C757D]">
          Isolated, encrypted multi-tenant billing platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E5E0D8] rounded sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@restaurant.com"
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6C757D]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-[#2D6A4F] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] placeholder-[#ADB5BD] focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-semibold rounded shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <AppIcons.Lock />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E5E0D8] text-center">
            <p className="text-sm text-[#6C757D]">
              New restaurant?{' '}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-semibold text-[#1B4332] hover:underline"
              >
                Register your restaurant
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#6C757D] flex justify-center gap-4">
          <span>Protected by SHA-256 Auth</span>
          <span>•</span>
          <span>Brute Force Throttling</span>
          <span>•</span>
          <span>Tenant Separation</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-[#E5E0D8] shadow-lg max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-[#1F2421] mb-2">Reset Password</h3>
            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-[#EBF5EE] border border-[#C2E0C6] rounded text-xs text-[#1B4332]">
                  A temporary password reset link has been dispatched to <strong>{resetEmail}</strong>. In demonstration mode, use the default credentials or contact your restaurant owner.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSuccess(false);
                  }}
                  className="w-full py-2 bg-[#1B4332] text-white text-xs font-semibold rounded hover:bg-[#2D6A4F]"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-[#6C757D]">
                  Enter your registered restaurant email to receive a password recovery link.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[#6C757D] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm text-[#1F2421] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 border border-[#E5E0D8] rounded text-xs text-[#6C757D] hover:bg-[#FBF9F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#1B4332] text-white rounded text-xs font-semibold hover:bg-[#2D6A4F]"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
