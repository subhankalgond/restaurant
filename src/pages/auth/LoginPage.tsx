import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ChiliLogoIcon, LockIcon } from '../../components/common/Icons';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigateHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister }) => {
  const { login, requestPasswordReset, isSupabaseReady, authError } = useAuth();
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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Enter your registered email address', 'error');
      return;
    }
    try {
      await requestPasswordReset(resetEmail.trim());
      setResetSuccess(true);
      showToast('Password reset link sent to ' + resetEmail, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send password reset email.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <ChiliLogoIcon className="w-10 h-10 shadow-sm" size={40} />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#171B18]">CHILI POS</h1>
            <p className="text-xs text-[#777F79]">Multi-Restaurant POS & Billing Engine</p>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-extrabold text-[#171B18]">
          Sign in to your restaurant workspace
        </h2>
        <p className="mt-1 text-center text-xs text-[#777F79]">
          Isolated, encrypted multi-tenant billing platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {(!isSupabaseReady || authError) && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#D94A43] font-medium">
            {authError || 'Supabase environment variables are missing. Configure .env before signing in.'}
          </div>
        )}
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E7EBE8] rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@restaurant.com"
                className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#777F79]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-[#078F36] hover:underline"
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
                className="w-full px-3.5 py-2.5 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] placeholder-[#ADB5BD] focus:outline-none focus:border-[#078F36]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#078F36] hover:bg-[#087A32] text-white text-sm font-bold rounded-xl shadow-md shadow-[#078F36]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LockIcon className="w-4 h-4 text-white" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E7EBE8] text-center">
            <p className="text-sm text-[#777F79]">
              New restaurant?{' '}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-bold text-[#078F36] hover:underline"
              >
                Register your restaurant
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#777F79] flex justify-center gap-4">
          <span>Secured by Supabase Auth</span>
          <span>•</span>
          <span>Row-Level Security</span>
          <span>•</span>
          <span>Tenant Separation</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E7EBE8] shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-[#171B18] mb-2">Reset Password</h3>
            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-[#F0F8F3] border border-[#D8EFDF] rounded-xl text-xs text-[#078F36]">
                  A temporary password reset link has been dispatched to <strong>{resetEmail}</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSuccess(false);
                  }}
                  className="w-full py-2 bg-[#078F36] text-white text-xs font-bold rounded-xl hover:bg-[#087A32]"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-[#777F79]">
                  Enter your registered restaurant email to receive a password recovery link.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[#777F79] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7EBE8] rounded-xl text-sm text-[#171B18] focus:outline-none focus:border-[#078F36]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 border border-[#E7EBE8] rounded-xl text-xs text-[#777F79] hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#078F36] text-white rounded-xl text-xs font-bold hover:bg-[#087A32]"
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
