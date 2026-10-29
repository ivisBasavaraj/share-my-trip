import React from 'react';
import { useAuth } from '../context/useAuth';
import { LogIn, LogOut, UserPlus, ShieldCheck, Plus, Siren, LifeBuoy } from 'lucide-react';

type AppView = 'home' | 'workspace' | 'login' | 'register';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenCreateTrip: () => void;
  onOpenSafetyModal: () => void;
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
  onOpenServicesModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenSosModal?: () => void;
  onOpenHelpSupport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onOpenCreateTrip,
  onOpenLogin,
  onOpenRegister,
  onOpenSafetyModal,
  onOpenSosModal,
  onOpenHelpSupport,
}) => {
  const { currentUser, firebaseUser, logout } = useAuth();
  const isLoggedIn = !!firebaseUser;

  return (
    <header className="bg-white/95 shadow-md sticky top-0 z-40 backdrop-blur-sm border-b border-orange-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Brand */}
          <button
            onClick={() => setCurrentView('home')}
            className="font-brand text-2xl sm:text-3xl text-gray-950 hover:text-orange-600 transition-colors"
            aria-label="Smart Ride Sharing Platform home"
          >
            Smart Ride Sharing Platform
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-1">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'home' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:text-orange-600'}`}
            >
              Home
            </button>

            <button
              onClick={() => setCurrentView('workspace')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'workspace' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:text-orange-600'}`}
            >
              Dashboard
            </button>

            {/* Help & Support Button */}
            {onOpenHelpSupport && (
              <button
                onClick={onOpenHelpSupport}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
              >
                <LifeBuoy className="w-4 h-4 text-orange-500" />
                <span>Help &amp; Support</span>
              </button>
            )}

            {/* Safety & Trust */}
            <button
              onClick={onOpenSafetyModal}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Safety</span>
            </button>

            {/* SOS Emergency Button */}
            {onOpenSosModal && (
              <button
                onClick={onOpenSosModal}
                className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all"
                title="Trigger Emergency SOS"
              >
                <Siren className="w-3.5 h-3.5 animate-pulse" />
                <span>SOS</span>
              </button>
            )}

            {/* Create Trip — ONLY when logged in */}
            {isLoggedIn && (
              <button
                onClick={onOpenCreateTrip}
                className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Trip
              </button>
            )}

            {isLoggedIn ? (
              <>
                {/* User pill */}
                <div className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl">
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-6 h-6 rounded-full object-cover border border-orange-200"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xs font-semibold text-gray-800 max-w-[110px] truncate">
                    {currentUser.displayName}
                  </span>
                  {currentUser.verificationStatus === 'verified' && (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>

                <button
                  onClick={logout}
                  className="ml-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onOpenLogin}
                  className="ml-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login
                </button>
                {onOpenRegister && (
                  <button
                    onClick={onOpenRegister}
                    className="ml-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            {onOpenSosModal && (
              <button
                onClick={onOpenSosModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-red-600 text-white"
              >
                <Siren className="w-3.5 h-3.5" /> SOS
              </button>
            )}
            {onOpenHelpSupport && (
              <button onClick={onOpenHelpSupport} className="p-1.5 text-slate-600">
                <LifeBuoy className="w-4 h-4 text-orange-500" />
              </button>
            )}
            {isLoggedIn && (
              <button
                onClick={onOpenCreateTrip}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-rose-500"
              >
                <Plus className="w-3.5 h-3.5" /> Trip
              </button>
            )}
            {isLoggedIn ? (
              <button onClick={logout} className="p-1.5 text-red-500">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onOpenLogin} className="p-1.5 text-sky-600">
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
