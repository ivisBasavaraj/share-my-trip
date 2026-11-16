import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, Mail, Lock } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

interface LoginScreenProps {
  onSuccess: () => void;
  onBackToHome: () => void;
  onGoToRegister?: () => void;
  initialMessage?: string;
  initialEmail?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onBackToHome,
  onGoToRegister,
  initialMessage,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(initialMessage || '');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSuccess();
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setError('Invalid email or password. Please verify and try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment before trying again.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email sign-in is not enabled. Please contact support.');
      } else {
        setError(err?.message || 'Sign in failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle =
    'w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-orange-400 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/40 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Nav Back */}
      <div className="max-w-md w-full mx-auto mb-4">
        <button
          onClick={onBackToHome}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      <div className="max-w-md w-full mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <h1 className="font-brand text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart Ride Sharing
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Sign in with your email and password to access your dashboard
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-orange-100/80 p-6 sm:p-8 backdrop-blur-sm">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-900">Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your login credentials to continue
            </p>
          </div>

          {/* Success / Info Message (e.g., after registration) */}
          {infoMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (infoMessage) setInfoMessage('');
                  }}
                  className={inputStyle}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputStyle} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white text-sm font-bold rounded-2xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account yet?{' '}
              {onGoToRegister ? (
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="font-bold text-orange-600 hover:text-orange-700 transition-colors ml-0.5"
                >
                  Sign up here
                </button>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
