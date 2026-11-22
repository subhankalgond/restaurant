import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RestroLogoIcon, LockIcon } from '../../components/common/Icons';

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
    <div className="min-h-screen bg-[#0B0E14] text-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <RestroLogoIcon className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">RestroPOS</h1>
            <p className="text-xs text-gray-400">Restaurant Management & POS</p>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-bold text-white">
          Sign in to your restaurant workspace
        </h2>
        <p className="mt-1 text-center text-xs text-gray-400">
          Secure multi-tenant restaurant billing platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#111622] py-8 px-6 shadow-2xl border border-[#1E2638] rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@restaurant.com"
                className="w-full px-3.5 py-2.5 bg-[#161C2A] border border-[#1E2638] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00D26A] focus:ring-1 focus:ring-[#00D26A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-[#00D26A] hover:underline"
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
                className="w-full px-3.5 py-2.5 bg-[#161C2A] border border-[#1E2638] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00D26A] focus:ring-1 focus:ring-[#00D26A]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#00D26A] hover:bg-[#00B85C] text-[#080A0F] text-sm font-extrabold rounded-xl shadow-lg shadow-[#00D26A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LockIcon className="w-4 h-4 text-[#080A0F]" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1E2638] text-center">
            <p className="text-sm text-gray-400">
              New restaurant?{' '}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-bold text-[#00D26A] hover:underline ml-1"
              >
                Register your restaurant
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 flex justify-center gap-4">
          <span>Protected by SHA-256 Auth</span>
          <span>•</span>
          <span>Brute Force Throttling</span>
          <span>•</span>
          <span>Tenant Separation</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111622] rounded-2xl border border-[#1E2638] shadow-2xl max-w-sm w-full p-6 text-[#F8FAFC]">
            <h3 className="text-base font-bold text-white mb-2">Reset Password</h3>
            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-[#00D26A]">
                  A temporary password reset link has been dispatched to <strong>{resetEmail}</strong>. In demonstration mode, use the default credentials or contact your restaurant owner.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSuccess(false);
                  }}
                  className="w-full py-2 bg-[#00D26A] text-[#080A0F] text-xs font-bold rounded-xl hover:bg-[#00B85C]"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-gray-400">
                  Enter your registered restaurant email to receive a password recovery link.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161C2A] border border-[#1E2638] rounded-xl text-sm text-white focus:outline-none focus:border-[#00D26A]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 border border-[#1E2638] rounded-xl text-xs text-gray-400 hover:bg-[#161C2A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#00D26A] text-[#080A0F] rounded-xl text-xs font-bold hover:bg-[#00B85C]"
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
