/**
 * Smart Ride Sharing Platform — Main Application
 * Travel Together, Save Together.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Trip, Waypoint } from './types';
import {
  subscribeToTrips, subscribeToItinerary,
  getLocalTrips, saveLocalTrips,
  sendCompanionRequestApi,
  subscribeToCompanionRequests,
} from './services/tripService';
import { testConnection } from './firebase';
import { Header } from './components/Header';
import { HomePage } from './components/Home/HomePage';
import { LoginScreen } from './components/Auth/LoginScreen';
import { RegisterScreen } from './components/Auth/RegisterScreen';
import { UserDashboard } from './components/Dashboard/UserDashboard';
import { DriverDashboard } from './components/Dashboard/DriverDashboard';
import { TravelMap } from './components/Map/TravelMap';
import { ItineraryEditor } from './components/Itinerary/ItineraryEditor';
import { CompanionMatching } from './components/Companion/CompanionMatching';
import { ExpenseTracker } from './components/Expenses/ExpenseTracker';
import { OrganizerDashboard } from './components/Organizer/OrganizerDashboard';
import { EncryptedChat } from './components/Chat/EncryptedChat';
import { MemoryWall } from './components/Memories/MemoryWall';
import { SafetyModal } from './components/Safety/SafetyModal';
import { CreateTripModal } from './components/TripModal/CreateTripModal';
import { TripDetailModal } from './components/TripModal/TripDetailModal';
import { ServicesModal } from './components/ServicesModal';
import { PackingChecklist } from './components/Packing/PackingChecklist';
import { TripWeatherWidget } from './components/Weather/TripWeatherWidget';
import { TripExportModal } from './components/Export/TripExportModal';
import { EditTripModal } from './components/TripModal/EditTripModal';
import { SosAlertModal } from './components/Safety/SosAlertModal';
import { HelpSupportModal } from './components/Support/HelpSupportModal';
import {
  Calendar, MapPin, IndianRupee, Sparkles, Navigation,
  ChevronDown, ArrowRight, ArrowLeft, MessageSquare, Package,
  CloudSun, Share2, Edit3, Users, Plus, Copy, CheckCircle2,
  UserCheck, Clock, Car, Info, X, Siren, LifeBuoy, ShieldCheck,
} from 'lucide-react';

type AppView = 'home' | 'workspace' | 'trip-workspace' | 'login' | 'register';
type WorkspaceTab = 'itinerary' | 'channel' | 'companions' | 'expenses' | 'memories' | 'packing' | 'organizer';
type DashboardTab = 'available' | 'my' | 'joined';

function MainApp() {
  const { currentUser, firebaseUser, isOnline, allUsers } = useAuth();

  const [currentView, setCurrentView]   = useState<AppView>('home');
  const [trips, setTrips]               = useState<Trip[]>(() => getLocalTrips());
  const [selectedTripId, setSelectedTripId] = useState<string>(() => getLocalTrips()[0]?.id || '');
  const [activeTab, setActiveTab]       = useState<WorkspaceTab>('itinerary');
  const [dashTab, setDashTab]           = useState<DashboardTab>('available');
  const [activeWaypoint, setActiveWaypoint] = useState<Waypoint | undefined>();
  const [pendingPinCoords, setPendingPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [waypoints, setWaypoints]       = useState<Waypoint[]>([]);
  const [copiedUid, setCopiedUid]       = useState(false);
  // TripDetailModal — shows full trip info when user clicks any trip card
  const [detailTrip, setDetailTrip]     = useState<Trip | null>(null);

  // Modals
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [showEditTripModal,   setShowEditTripModal]   = useState(false);
  const [showSafetyModal,     setShowSafetyModal]     = useState(false);
  const [showServicesModal,   setShowServicesModal]   = useState(false);
  const [showExportModal,     setShowExportModal]     = useState(false);
  const [showWeatherDrawer,   setShowWeatherDrawer]   = useState(false);
  const [showSosModal,         setShowSosModal]         = useState(false);
  const [showHelpSupportModal, setShowHelpSupportModal] = useState(false);
  const [loginMessage,        setLoginMessage]        = useState('');
  const [loginPrefillEmail,   setLoginPrefillEmail]   = useState('');

  // Accepted Join Request notifications for the traveler (Requirement 5)
  interface AcceptedJoinNotification {
    id: string;
    tripId: string;
    tripTitle?: string;
  }
  const [acceptedNotifications, setAcceptedNotifications] = useState<AcceptedJoinNotification[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeToCompanionRequests({ requesterId: currentUser.id }, requests => {
      try {
        const storedAcks: string[] = JSON.parse(localStorage.getItem('srsplatform_ack_accepted_reqs') || '[]');
        const newAccepted = requests
          .filter(r => r.status === 'accepted' && !storedAcks.includes(r.id))
          .map(r => ({ id: r.id, tripId: r.tripId, tripTitle: r.tripTitle }));
        setAcceptedNotifications(newAccepted);
      } catch { /* ignore */ }
    });
    return () => unsub();
  }, [currentUser?.id]);

  const dismissAcceptedNotif = (reqId: string) => {
    try {
      const storedAcks: string[] = JSON.parse(localStorage.getItem('srsplatform_ack_accepted_reqs') || '[]');
      localStorage.setItem('srsplatform_ack_accepted_reqs', JSON.stringify([...storedAcks, reqId]));
    } catch { /* ignore */ }
    setAcceptedNotifications(prev => prev.filter(n => n.id !== reqId));
  };

  useEffect(() => { testConnection(); }, []);

  useEffect(() => {
    const unsub = subscribeToTrips(updated => {
      setTrips(updated);
      setSelectedTripId(prev =>
        updated.find(t => t.id === prev) ? prev : (updated[0]?.id || '')
      );
    });
    return () => unsub();
  }, []);

  const activeTrip = trips.find(t => t.id === selectedTripId) || trips[0];

  useEffect(() => {
    if (!activeTrip?.id) return;
    const unsub = subscribeToItinerary(activeTrip.id, wps => {
      setWaypoints(wps);
      setActiveWaypoint(prev => prev ? wps.find(w => w.id === prev.id) ?? wps[0] : wps[0]);
    });
    return () => unsub();
  }, [activeTrip?.id]);

  const handleTripCreated = useCallback((t: Trip) => {
    setTrips(prev => { const n = [t, ...prev.filter(x => x.id !== t.id)]; saveLocalTrips(n); return n; });
    setSelectedTripId(t.id);
    setCurrentView('workspace');
    setActiveTab('itinerary');
  }, []);

  const handleOpenTripFromHome = useCallback((id: string) => {
    setSelectedTripId(id);
    setCurrentView('workspace');
    setActiveTab('itinerary');
  }, []);

  const handleTripUpdated = useCallback((t: Trip) => {
    setTrips(prev => { const n = prev.map(x => x.id === t.id ? t : x); saveLocalTrips(n); return n; });
  }, []);

  const handleTripDeleted = useCallback((id: string) => {
    setTrips(prev => {
      const r = prev.filter(t => t.id !== id);
      saveLocalTrips(r);
      if (r.length) setSelectedTripId(r[0].id);
      return r;
    });
  }, []);

  const copyUid = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Derived trip lists for dashboard tabs
  const availableTrips = trips.filter(t => !t.memberIds.includes(currentUser.id));
  const myTrips        = trips.filter(t => t.ownerId === currentUser.id);
  const joinedTrips    = trips.filter(t => t.memberIds.includes(currentUser.id) && t.ownerId !== currentUser.id);

  if (currentView === 'login') {
    return (
      <LoginScreen
        onSuccess={() => {
          setLoginMessage('');
          setCurrentView('workspace');
        }}
        onBackToHome={() => setCurrentView('home')}
        onGoToRegister={() => {
          setLoginMessage('');
          setCurrentView('register');
        }}
        initialMessage={loginMessage}
        initialEmail={loginPrefillEmail}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <RegisterScreen
        onSuccess={(registeredEmail) => {
          setLoginPrefillEmail(registeredEmail || '');
          setLoginMessage('Account created successfully! Please sign in with your email and password.');
          setCurrentView('login');
        }}
        onBackToLogin={() => {
          setLoginMessage('');
          setCurrentView('login');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenCreateTrip={() => { setCurrentView('workspace'); setShowCreateTripModal(true); }}
        onOpenLogin={() => setCurrentView('login')}
        onOpenRegister={() => setCurrentView('register')}
      />

      {/* ── THANK-YOU ACCEPTANCE BANNER (Requirement 5) ── */}
      {acceptedNotifications.map(notif => (
        <div
          key={notif.id}
          className="bg-emerald-600 text-white px-4 py-3 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>Your request has been accepted! You're now part of the trip{notif.tripTitle ? `: "${notif.tripTitle}"` : ''}.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedTripId(notif.tripId);
                setCurrentView('workspace');
                setDashTab('joined');
                setActiveTab('itinerary');
                dismissAcceptedNotif(notif.id);
              }}
              className="px-3.5 py-1.5 bg-white text-emerald-800 rounded-xl text-xs font-extrabold hover:bg-emerald-50 transition-colors shadow-xs"
            >
              View Joined Trip →
            </button>
            <button
              onClick={() => dismissAcceptedNotif(notif.id)}
              className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-100 hover:text-white"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* ── HOME ─────────────────────────────────── */}
      {currentView === 'home' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1">
          <HomePage
            trips={trips}
            onOpenTrip={handleOpenTripFromHome}
            onGoToLogin={() => setCurrentView('login')}
            onStartPlanning={() => setCurrentView('workspace')}
            onHostTrip={() => { setCurrentView('workspace'); setShowCreateTripModal(true); }}
            onViewTripDetail={setDetailTrip}
          />
        </div>
      )}

      {/* ── USER & DRIVER DASHBOARD WORKSPACES ────────────────── */}
      {currentView === 'workspace' && (
        currentUser.role === 'driver' ? (
          <DriverDashboard
            currentUser={currentUser}
            trips={trips}
            onOpenTrip={(tripId) => {
              setSelectedTripId(tripId);
              setCurrentView('trip-workspace');
            }}
            onPublishTrip={() => setShowCreateTripModal(true)}
            onEditTrip={(trip) => {
              setSelectedTripId(trip.id);
              setShowEditTripModal(true);
            }}
            onViewTripDetail={setDetailTrip}
            onGoToHome={() => setCurrentView('home')}
          />
        ) : (
          <UserDashboard
            trips={trips}
            onOpenTrip={(tripId, initialTab) => {
              setSelectedTripId(tripId);
              if (initialTab) setActiveTab(initialTab);
              setCurrentView('trip-workspace');
            }}
            onViewTripDetail={setDetailTrip}
            onGoToHome={() => setCurrentView('home')}
          />
        )
      )}

      {/* ── DEDICATED TRIP WORKSPACE (Itinerary, Chat, Packing, Expenses) ── */}
      {currentView === 'trip-workspace' && (
        <div className="flex-1 bg-slate-50 flex flex-col">
          {/* Top back bar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <button
                onClick={() => setCurrentView('workspace')}
                className="text-xs font-bold text-slate-600 hover:text-orange-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> {currentUser.role === 'driver' ? 'Back to Driver Hub' : 'Back to Passenger Hub'}
              </button>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={activeTrip?.id || ''}
                    onChange={e => setSelectedTripId(e.target.value)}
                    className="appearance-none bg-orange-50 border border-orange-200 text-gray-900 font-bold text-xs py-1.5 pl-3 pr-7 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                  >
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-orange-400 absolute right-2 top-2 pointer-events-none" />
                </div>

                <button
                  onClick={() => setShowWeatherDrawer(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border text-xs transition-colors cursor-pointer ${
                    showWeatherDrawer
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'
                  }`}
                >
                  <CloudSun className="w-3.5 h-3.5" /> Weather
                </button>

                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Plan
                </button>

                {activeTrip?.ownerId === currentUser.id && (
                  <button
                    onClick={() => setShowEditTripModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-white hover:bg-orange-50 text-gray-700 border border-orange-200 text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-500" /> Manage Trip
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Workspace Sub-tabs */}
          <div className="bg-orange-50/80 border-t border-b border-orange-100 px-4 sm:px-6 py-2">
            <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
              {([
                ...(activeTrip?.ownerId === currentUser.id ? [{ id: 'organizer', icon: <Car className="w-3.5 h-3.5 text-amber-500" />, label: 'Organizer' }] : []),
                { id: 'itinerary',  icon: <Navigation className="w-3.5 h-3.5 text-orange-500" />, label: 'Itinerary & Route' },
                { id: 'channel',    icon: <MessageSquare className="w-3.5 h-3.5 text-orange-500" />, label: 'Group Channel', badge: true },
                { id: 'packing',    icon: <Package className="w-3.5 h-3.5 text-blue-500" />, label: 'Packing' },
                { id: 'companions', icon: <Users className="w-3.5 h-3.5 text-purple-500" />, label: 'Companions' },
                { id: 'expenses',   icon: <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />, label: 'Expenses' },
                { id: 'memories',   icon: <Sparkles className="w-3.5 h-3.5 text-rose-500" />, label: 'Memories' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-orange-700 hover:bg-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {'badge' in tab && tab.badge && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
              ))}
            </div>
          </div>

          {/* Workspace Body */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
            {showWeatherDrawer && activeTrip && <TripWeatherWidget trip={activeTrip} />}

            {activeTab === 'organizer' && activeTrip?.ownerId === currentUser.id && (
              <OrganizerDashboard trip={activeTrip} onTripUpdated={handleTripUpdated} />
            )}

            {activeTab === 'itinerary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5">
                    {activeTrip && (
                      <ItineraryEditor
                        trip={activeTrip}
                        waypoints={waypoints}
                        activeWaypointId={activeWaypoint?.id}
                        onSelectWaypoint={wp => setActiveWaypoint(wp)}
                        pendingPinCoordinates={pendingPinCoords}
                        onClearPendingPin={() => setPendingPinCoords(null)}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-7 h-[620px]" style={{ isolation: 'isolate' }}>
                    <TravelMap
                      waypoints={waypoints}
                      activeWaypointId={activeWaypoint?.id}
                      onSelectWaypoint={wp => setActiveWaypoint(wp)}
                      onMapClick={(lat, lng) => { setPendingPinCoords({ lat, lng }); setActiveTab('itinerary'); }}
                      center={activeWaypoint ? { lat: activeWaypoint.lat, lng: activeWaypoint.lng } : undefined}
                    />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      Trip Group Channel
                    </h3>
                    <button
                      onClick={() => setActiveTab('channel')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-800 flex items-center gap-1 cursor-pointer"
                    >
                      Full View <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {activeTrip && <EncryptedChat trip={activeTrip} />}
                </div>
              </div>
            )}

            {activeTab === 'channel' && activeTrip && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-orange-100 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-orange-500" />
                      {activeTrip.title} — Live Group Channel
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Real-time communication for all travelers in this journey.</p>
                  </div>
                </div>
                <EncryptedChat trip={activeTrip} />
              </div>
            )}

            {activeTab === 'packing' && activeTrip && <PackingChecklist trip={activeTrip} />}
            {activeTab === 'companions' && (
              <CompanionMatching
                currentTrip={activeTrip}
                onInviteCompanion={user => {
                  if (activeTrip && !activeTrip.memberIds.includes(user.id))
                    handleTripUpdated({ ...activeTrip, memberIds: [...activeTrip.memberIds, user.id] });
                }}
                onTripUpdated={handleTripUpdated}
              />
            )}
            {activeTab === 'expenses' && activeTrip && <ExpenseTracker trip={activeTrip} />}
            {activeTab === 'memories' && <MemoryWall trip={activeTrip} />}
          </main>
        </div>
      )}

      {/* ── FOOTER (Only visible on landing page) ── */}
      {currentView === 'home' && (
        <footer className="bg-slate-900 text-slate-300 mt-16 border-t border-slate-800">
          {/* Safety, Support & Emergency SOS Bar */}
          <div className="border-b border-slate-800/80 bg-slate-950/60 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-5 text-center sm:text-left">
                <span className="text-[11px] font-bold tracking-widest text-orange-400 uppercase">
                  Trust, Safety &amp; Assistance Center
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  Always protected during your journeys
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Safety & Guidelines */}
                <button
                  type="button"
                  onClick={() => setShowSafetyModal(true)}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-500/50 text-left transition-all group flex items-start gap-3.5 cursor-pointer"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Safety &amp; Verification
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Aadhaar ID checks, driver ratings, and safe travel protocols.
                    </p>
                  </div>
                </button>

                {/* 2. Help & Support */}
                <button
                  type="button"
                  onClick={() => setShowHelpSupportModal(true)}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-500/50 text-left transition-all group flex items-start gap-3.5 cursor-pointer"
                >
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Help &amp; Support
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      24/7 incident assistance, FAQs, and ticket reporting.
                    </p>
                  </div>
                </button>

                {/* 3. Emergency SOS */}
                <button
                  type="button"
                  onClick={() => setShowSosModal(true)}
                  className="p-4 rounded-2xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/60 hover:border-rose-500 text-left transition-all group flex items-start gap-3.5 cursor-pointer ring-1 ring-rose-500/20 hover:ring-rose-500/50"
                >
                  <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-lg shadow-rose-900/40 animate-pulse">
                    <Siren className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-rose-300 group-hover:text-white transition-colors">
                        Emergency SOS
                      </h4>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white">
                        Live
                      </span>
                    </div>
                    <p className="text-xs text-rose-200/80 mt-0.5 leading-relaxed">
                      One-click alert dispatching live GPS coordinates to contacts.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Brand Copyright & Status */}
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center sm:flex sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h4 className="font-brand text-xl font-bold text-white">
                Smart Ride Sharing Platform
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Travel Together, Save Together. &copy; {new Date().getFullYear()} All rights reserved.
              </p>
            </div>

            <div className="mt-4 sm:mt-0 text-xs text-slate-500 flex items-center justify-center sm:justify-end gap-2">
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Offline (cached)
                </span>
              )}
              <span>·</span>
              <span>Firestore Realtime Sync</span>
            </div>
          </div>
        </footer>
      )}

      {/* ── MODALS ───────────────────────────────── */}
      <CreateTripModal isOpen={showCreateTripModal} onClose={() => setShowCreateTripModal(false)} onTripCreated={handleTripCreated} />
      <SafetyModal     isOpen={showSafetyModal}     onClose={() => setShowSafetyModal(false)} onTriggerSos={() => setShowSosModal(true)} />
      <ServicesModal   isOpen={showServicesModal}   onClose={() => setShowServicesModal(false)} />
      <SosAlertModal   isOpen={showSosModal}        onClose={() => setShowSosModal(false)} activeTrip={activeTrip} />
      <HelpSupportModal isOpen={showHelpSupportModal} onClose={() => setShowHelpSupportModal(false)} trips={trips} activeTripId={activeTrip?.id} />
      {activeTrip && <TripExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} trip={activeTrip} waypoints={waypoints} />}
      {activeTrip && <EditTripModal  isOpen={showEditTripModal} trip={activeTrip} onClose={() => setShowEditTripModal(false)} onTripUpdated={handleTripUpdated} onTripDeleted={handleTripDeleted} />}
      {/* TripDetailModal — full trip info + Request to Join */}
      {detailTrip && (
        <TripDetailModal
          trip={detailTrip}
          organiser={allUsers.find(u => u.id === detailTrip.ownerId)}
          onClose={() => setDetailTrip(null)}
          onOpenTrip={(id) => {
            setSelectedTripId(id);
            setActiveTab('itinerary');
            setDetailTrip(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return <AuthProvider><MainApp /></AuthProvider>;
}
