import React from 'react';
import { useAuth } from '../context/useAuth';
import { LogIn, UserPlus, ShieldCheck, Plus } from 'lucide-react';

type AppView = 'home' | 'workspace' | 'trip-workspace' | 'login' | 'register';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  onOpenCreateTrip: () => void;
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  setCurrentView,
  onOpenCreateTrip,
  onOpenLogin,
  onOpenRegister,
}) => {
  const { currentUser, firebaseUser } = useAuth();
  const isLoggedIn = !!firebaseUser;

  return (
    <header className="bg-white/95 shadow-sm sticky top-0 z-40 backdrop-blur-md border-b border-orange-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Brand Logo */}
          <button
            onClick={() => setCurrentView('home')}
            className="font-brand text-2xl sm:text-3xl text-gray-950 hover:text-orange-600 transition-colors text-left"
            aria-label="Smart Ride Sharing Platform home"
          >
            Smart Ride Sharing Platform
          </button>

          {/* Desktop Actions */}
          <div className="hidden md:flex md:items-center md:gap-3">
            {isLoggedIn ? (
              /* User pill */
              <div
                onClick={() => setCurrentView('workspace')}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl cursor-pointer transition-colors"
                title="Go to Dashboard"
              >
                <img
                  src={currentUser.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
                  alt={currentUser.displayName}
                  className="w-6 h-6 rounded-full object-cover border border-orange-200"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-semibold text-gray-800 max-w-[120px] truncate">
                  {currentUser.displayName}
                </span>
                {currentUser.verificationStatus === 'verified' && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  Login
                </button>
                {onOpenRegister && (
                  <button
                    onClick={onOpenRegister}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-rose-600 shadow-sm transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('workspace')}
                  className="w-7 h-7 rounded-full overflow-hidden border border-orange-200"
                >
                  <img
                    src={currentUser.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            ) : (
              <>
                <button onClick={onOpenLogin} className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
                  Login
                </button>
                {onOpenRegister && (
                  <button onClick={onOpenRegister} className="px-2.5 py-1.5 text-xs font-bold text-white bg-orange-500 rounded-lg">
                    Register
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
