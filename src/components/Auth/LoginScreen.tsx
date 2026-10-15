import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

interface LoginScreenProps {
  onSuccess: () => void;
  onBackToHome: () => void;
  onGoToRegister?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onBackToHome, onGoToRegister }) => {
  const { loginWithGoogle, loginAnonymously, switchProfile, currentUser, allUsers } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error,    setError]    = useState('');

  const ic = 'appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm bg-white';

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSuccess();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        setError('Invalid email or password. Please try again.');
      else if (code === 'auth/too-many-requests')
        setError('Too many attempts. Please wait a moment and try again.');
      else if (code === 'auth/operation-not-allowed')
        setError('Email login is not enabled. Please enable it in Firebase Console → Authentication.');
      else
        setError(err?.message || 'Sign-in failed. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError(''); setIsLoading(true);
    try { await loginWithGoogle(); onSuccess(); }
    catch (err: any) {
      const code = err?.code || '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
        setError(err?.message || 'Google sign-in failed.');
    } finally { setIsLoading(false); }
  };

  const handleGuestLogin = async () => {
    setError(''); setIsLoading(true);
    try { await loginAnonymously(); onSuccess(); }
    catch (err: any) { setError(err?.message || 'Guest sign-in failed.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-emerald-50 flex flex-col">
      <div className="max-w-md mx-auto w-full px-4 pt-8 pb-4">
        <button onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      <div className="max-w-md mx-auto w-full px-4 pb-16">
        {/* Brand */}
        <div className="text-center mb-6">
          <h1 className="font-brand text-3xl text-gray-950">Smart Ride Sharing Platform</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue your journey</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-orange-100 p-8">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-6">Sign in to your account</h2>

          {/* Google */}
          <button onClick={handleGoogleLogin} disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 shadow-sm transition-colors mb-4 disabled:opacity-60">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or sign in with email</span></div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="-space-y-px rounded-md shadow-sm">
              <input type="email" required placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)}
                className={`${ic} rounded-t-md rounded-b-none`} />
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${ic} rounded-t-none rounded-b-md pr-10`} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 transition-all">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            </button>
          </form>

          {/* Real users from Firestore — only show if there are any */}
          {allUsers.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
                Recent Travelers
              </p>
              <div className="grid grid-cols-2 gap-2">
                {allUsers.slice(0, 4).map(user => (
                  <button key={user.id} onClick={() => { switchProfile(user.id); onSuccess(); }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      currentUser.id === user.id ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-400' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}>
                    <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-gray-900 truncate">{user.displayName}</div>
                      <div className="text-[10px] text-gray-500 capitalize truncate">{user.travelStyle} · ★{user.rating}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Guest */}
          <button onClick={handleGuestLogin} disabled={isLoading}
            className="w-full mt-4 py-2 text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors">
            Continue as Guest (no account needed)
          </button>
        </div>

        <p className="text-center text-sm mt-4 text-gray-600">
          Don't have an account?{' '}
          {onGoToRegister ? (
            <button onClick={onGoToRegister} className="font-semibold text-sky-600 hover:text-sky-700">Sign up here.</button>
          ) : null}
        </p>
      </div>
    </div>
  );
};
