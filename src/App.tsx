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
  UserCheck, Clock, Car, Info, X, Siren, LifeBuoy,
} from 'lucide-react';

type AppView = 'home' | 'workspace' | 'login' | 'register';
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

  if (currentView === 'login')    return <LoginScreen    onSuccess={() => setCurrentView('workspace')} onBackToHome={() => setCurrentView('home')} onGoToRegister={() => setCurrentView('register')} />;
  if (currentView === 'register') return <RegisterScreen onSuccess={() => setCurrentView('workspace')} onBackToLogin={() => setCurrentView('login')} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* Header */}
      <Header
        currentView={currentView} setCurrentView={setCurrentView}
        activeTab={activeTab} setActiveTab={setActiveTab}
        onOpenCreateTrip={() => { setCurrentView('workspace'); setShowCreateTripModal(true); }}
        onOpenSafetyModal={() => setShowSafetyModal(true)}
        onOpenLogin={() => setCurrentView('login')}
        onOpenRegister={() => setCurrentView('register')}
        onOpenServicesModal={() => setShowServicesModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenSosModal={() => setShowSosModal(true)}
        onOpenHelpSupport={() => setShowHelpSupportModal(true)}
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

      {/* ── DASHBOARD / WORKSPACE ────────────────── */}
      {currentView === 'workspace' && (
        <>
          {/* Welcome banner */}
          <div className="bg-white border-b border-orange-100 py-4 px-4 sm:px-6 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setCurrentView('home')} className="text-xs font-semibold text-slate-500 hover:text-orange-600 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Home
                </button>
                <div>
                  <h1 className="text-xl font-extrabold text-gray-900">
                    Welcome, <span className="text-orange-600">{currentUser.displayName}!</span>
                  </h1>
                  <button onClick={copyUid} className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 mt-0.5">
                    {copiedUid ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Your ID: {currentUser.id.slice(0, 20)}…</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs flex-wrap">
                {/* Trip selector */}
                <div className="relative">
                  <select
                    value={activeTrip?.id || ''}
                    onChange={e => setSelectedTripId(e.target.value)}
                    className="appearance-none bg-orange-50 border border-orange-200 text-gray-900 font-bold text-xs py-2 pl-3 pr-7 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                  >
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-orange-400 absolute right-2 top-2.5 pointer-events-none" />
                </div>

                <button onClick={() => setShowWeatherDrawer(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-colors ${showWeatherDrawer ? 'bg-orange-500 text-white border-orange-600' : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'}`}>
                  <CloudSun className="w-3.5 h-3.5" /> Weather
                </button>

                <button onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-colors shadow-sm">
                  <Share2 className="w-3.5 h-3.5" /> Share Plan
                </button>

                {activeTrip?.ownerId === currentUser.id && (
                  <button onClick={() => setShowEditTripModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-white hover:bg-orange-50 text-gray-700 border border-orange-200 transition-colors shadow-sm">
                    <Edit3 className="w-3.5 h-3.5 text-orange-500" /> Manage Trip
                  </button>
                )}

                <button onClick={() => setShowCreateTripModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white transition-all shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> + Create New Trip
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard 3-tab bar (Available / My Trips / Joined Trips) */}
          <div className="bg-white border-b border-orange-100 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex text-sm font-medium border-b border-gray-200 -mb-px overflow-x-auto scrollbar-none">
                {([
                  { id: 'available', label: `Available Trips (${availableTrips.length})` },
                  { id: 'my',        label: `My Trips (${myTrips.length})` },
                  { id: 'joined',    label: `Joined Trips (${joinedTrips.length})` },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDashTab(tab.id)}
                    className={`mr-4 py-3 border-b-2 transition-colors whitespace-nowrap font-semibold ${
                      dashTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-orange-500 hover:border-orange-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard trip grid */}
          {(dashTab === 'available' || dashTab === 'my' || dashTab === 'joined') && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
              {dashTab === 'available' && availableTrips.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">No available trips at the moment.</p>
                  <button onClick={() => setShowCreateTripModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-bold shadow-sm">
                    <Plus className="w-4 h-4" /> Create the First Trip
                  </button>
                </div>
              )}
              {dashTab === 'my' && myTrips.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">You haven't created any trips yet.</p>
                  <button onClick={() => setShowCreateTripModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-bold shadow-sm">
                    <Plus className="w-4 h-4" /> Create Your First Trip
                  </button>
                </div>
              )}
              {dashTab === 'joined' && joinedTrips.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">You haven't joined any trips yet.</p>
                  <button onClick={() => setDashTab('available')}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-100 text-orange-700 rounded-xl text-sm font-bold">
                    Browse Available Trips
                  </button>
                </div>
              )}

              {/* Trip cards for each tab */}
              {(() => {
                const list = dashTab === 'available' ? availableTrips : dashTab === 'my' ? myTrips : joinedTrips;
                return list.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {list.map(trip => {
                      const organiser      = allUsers.find(u => u.id === trip.ownerId);
                      const availableSeats = Math.max(0, (trip.totalSeats ?? 0) - trip.memberIds.length);
                      const postedDate     = (() => { try { return new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return trip.startDate; } })();

                      return (
                        <div key={trip.id} className="trip-card rounded-2xl overflow-hidden flex flex-col justify-between group">
                          <div>
                            <div className="relative aspect-[16/9] bg-orange-50 overflow-hidden">
                              <img src={trip.coverImage || '/src/assets/images/hero_travel_journey_1791735781773.jpg'}
                                alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-2.5 right-2.5 bg-gray-900/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg capitalize">
                                {trip.travelStyle}
                              </div>
                              <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 flex-wrap">
                                <span className="text-xs bg-gradient-to-r from-orange-500 to-rose-500 text-white px-2 py-0.5 rounded font-semibold uppercase">{trip.status}</span>
                                {dashTab === 'joined' && (
                                  <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded font-semibold flex items-center gap-1 shadow-xs">
                                    <CheckCircle2 className="w-3 h-3" /> Confirmed Member
                                  </span>
                                )}
                                {trip.vehicle && (
                                  <span className="text-xs bg-gray-900/70 text-white px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    <Car className="w-3 h-3" />{trip.vehicle}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-bold text-gray-900 text-base mb-1 leading-snug">{trip.title}</h3>
                              {/* Route */}
                              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium mb-1">
                                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                <span>{trip.origin}</span>
                                <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="text-orange-600">{trip.destination}</span>
                              </div>
                              {/* Date / seats / cost */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mb-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {trip.departureTime
                                    ? new Date(trip.departureTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : trip.startDate}
                                </span>
                                {trip.totalSeats && (
                                  <span className={`flex items-center gap-1 font-semibold ${availableSeats === 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    <Users className="w-3 h-3" />{availableSeats === 0 ? 'Full' : `${availableSeats} seats left`}
                                  </span>
                                )}
                                {trip.costPerPerson && (
                                  <span className="font-semibold text-orange-600 flex items-center gap-0.5">
                                    <IndianRupee className="w-3 h-3" />₹{trip.costPerPerson.toLocaleString('en-IN')}/seat
                                  </span>
                                )}
                              </div>
                              {/* Organiser + posted */}
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                {organiser ? (
                                  <span className="flex items-center gap-1">
                                    <img src={organiser.photoURL} alt="" className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                                    <span className="font-semibold text-orange-600">{organiser.displayName}</span>
                                  </span>
                                ) : (
                                  <span className="font-semibold text-orange-600">{trip.ownerName}</span>
                                )}
                                <span>· Posted {postedDate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 pb-4 border-t border-orange-50 flex items-center justify-between pt-3">
                            <div>
                              <div className="text-[11px] text-slate-400">Budget</div>
                              <div className="text-sm font-bold text-gray-900">₹{trip.budget.toLocaleString('en-IN')}</div>
                            </div>
                            <div className="flex gap-2">
                              {dashTab === 'my' || dashTab === 'joined' ? (
                                <button onClick={() => { setSelectedTripId(trip.id); setActiveTab('itinerary'); }}
                                  className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                                  Open Trip <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button onClick={() => setDetailTrip(trip)}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                                  <Info className="w-3.5 h-3.5" /> View &amp; Join
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* ── Workspace Sub-tabs ─────────────────── */}
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
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
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

          {/* ── Workspace Body ─────────────────────── */}
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
                      <ItineraryEditor trip={activeTrip} waypoints={waypoints}
                        activeWaypointId={activeWaypoint?.id}
                        onSelectWaypoint={wp => setActiveWaypoint(wp)}
                        pendingPinCoordinates={pendingPinCoords}
                        onClearPendingPin={() => setPendingPinCoords(null)} />
                    )}
                  </div>
                  <div className="lg:col-span-7 h-[620px]" style={{ isolation: 'isolate' }}>
                    <TravelMap waypoints={waypoints} activeWaypointId={activeWaypoint?.id}
                      onSelectWaypoint={wp => setActiveWaypoint(wp)}
                      onMapClick={(lat, lng) => { setPendingPinCoords({ lat, lng }); setActiveTab('itinerary'); }}
                      center={activeWaypoint ? { lat: activeWaypoint.lat, lng: activeWaypoint.lng } : undefined} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      Trip Group Channel
                    </h3>
                    <button onClick={() => setActiveTab('channel')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-800 flex items-center gap-1">
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

            {activeTab === 'packing'    && activeTrip && <PackingChecklist trip={activeTrip} />}
            {activeTab === 'companions' && (
              <CompanionMatching currentTrip={activeTrip}
                onInviteCompanion={user => {
                  if (activeTrip && !activeTrip.memberIds.includes(user.id))
                    handleTripUpdated({ ...activeTrip, memberIds: [...activeTrip.memberIds, user.id] });
                }}
                onTripUpdated={handleTripUpdated} />
            )}
            {activeTab === 'expenses' && activeTrip && <ExpenseTracker trip={activeTrip} />}
            {activeTab === 'memories'  && <MemoryWall trip={activeTrip} />}
          </main>
        </>
      )}

      {/* ── FOOTER ───────────────────────────────── */}
      <footer className="bg-gray-800 text-gray-300 mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-semibold">
            &copy; 2025 Smart Ride Sharing Platform. All rights reserved.
          </p>
          <p className="mt-2 text-sm text-gray-400">Travel Together, Save Together.</p>
          <p className="mt-1 text-xs text-gray-500">
            {isOnline
              ? <span className="text-emerald-400 font-semibold">● Online</span>
              : <span className="text-rose-400 font-semibold">● Offline — cached data</span>}
            {' '}· Firestore Realtime · Google Maps & Vector Routing
          </p>
        </div>
      </footer>

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
