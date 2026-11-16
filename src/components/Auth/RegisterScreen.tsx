import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { RegisterPayload } from '../../context/AuthContext';
import {
  ArrowLeft, Eye, EyeOff, AlertCircle, Loader2,
  CheckCircle2, User, Mail, Phone, Lock, Car, Users, ShieldAlert,
} from 'lucide-react';

interface Props {
  onSuccess: (registeredEmail?: string) => void;
  onBackToLogin: () => void;
}

export const RegisterScreen: React.FC<Props> = ({ onSuccess, onBackToLogin }) => {
  const { registerWithEmail } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'driver' | 'user'>('user');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full name (at least 2 characters).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    const cleanedPhone = phone.replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!role) {
      errs.role = 'Please select whether you are a Driver or User.';
    }

    const cleanedEmergency = emergencyContact.replace(/\D/g, '');
    if (!cleanedEmergency || cleanedEmergency.length < 10) {
      errs.emergencyContact = 'Please enter a valid 10-digit emergency contact number.';
    }

    if (!password || password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await registerWithEmail({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role,
        emergencyContact: emergencyContact.trim(),
      } as RegisterPayload);

      onSuccess(email.trim());
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setSubmitError('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setSubmitError('Password is too weak. Please use at least 6 characters.');
      } else if (code === 'auth/network-request-failed') {
        setSubmitError('Network error. Please check your connection and try again.');
      } else {
        setSubmitError(err?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (hasError?: boolean) =>
    `w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border ${
      hasError
        ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-400'
        : 'border-slate-200 bg-slate-50/60 text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-orange-400'
    } placeholder-slate-400 focus:outline-none focus:ring-2 transition-all`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/40 to-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Nav Back */}
      <div className="max-w-md w-full mx-auto mb-4">
        <button
          onClick={onBackToLogin}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </button>
      </div>

      <div className="max-w-md w-full mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <h1 className="font-brand text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart Ride Sharing
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Create your account to start sharing rides or traveling together
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-orange-100/80 p-6 sm:p-8 backdrop-blur-sm">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-900">Sign Up</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in your details to create a verified traveler profile
            </p>
          </div>

          {submitError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={inputStyle(!!errors.fullName)}
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.fullName}
                </p>
              )}
            </div>

            {/* 2. Email Address */}
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
                  onChange={e => setEmail(e.target.value)}
                  className={inputStyle(!!errors.email)}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.email}
                </p>
              )}
            </div>

            {/* 3. Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={inputStyle(!!errors.phone)}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">
                Mandatory for ride coordination &amp; driver-passenger calls.
              </p>
              {errors.phone && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.phone}
                </p>
              )}
            </div>

            {/* 4. Role Selection (Driver or User only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Your Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Driver */}
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    role === 'driver'
                      ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-400/50 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className={`p-2 rounded-xl ${role === 'driver' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Car className="w-4 h-4" />
                    </div>
                    {role === 'driver' && (
                      <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">Driver</div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      I have a car &amp; offer rides
                    </div>
                  </div>
                </button>

                {/* User / Passenger */}
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    role === 'user'
                      ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-400/50 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className={`p-2 rounded-xl ${role === 'user' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    {role === 'user' && (
                      <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">User</div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      I want to travel &amp; book seats
                    </div>
                  </div>
                </button>
              </div>
              {errors.role && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.role}
                </p>
              )}
            </div>

            {/* 5. Emergency Contact */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Emergency Contact <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9123456780 (Parent / Guardian)"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                  className={inputStyle(!!errors.emergencyContact)}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">
                Notified with live GPS if Emergency SOS is triggered.
              </p>
              {errors.emergencyContact && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.emergencyContact}
                </p>
              )}
            </div>

            {/* 6. Password */}
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
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputStyle(!!errors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.password}
                </p>
              )}
            </div>

            {/* 7. Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`${inputStyle(!!errors.confirmPassword)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white text-sm font-bold rounded-2xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account…</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onBackToLogin}
                className="font-bold text-orange-600 hover:text-orange-700 transition-colors ml-0.5"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
