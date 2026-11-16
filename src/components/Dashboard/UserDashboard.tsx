import React, { useState, useEffect } from 'react';
import { Trip, UserProfile, CompanionRequest } from '../../types';
import { useAuth } from '../../context/useAuth';
import { subscribeToCompanionRequests, syncTripsWithBackend, syncCompanionRequestsWithBackend } from '../../services/tripService';
import {
  Car, Users, MapPin, Calendar, Clock, IndianRupee,
  MessageSquare, Navigation, ArrowRight, ShieldCheck,
  CheckCircle2, AlertCircle, X, Search, History,
  LogOut, Camera, ChevronRight, Phone, Sparkles, Package, RotateCcw,
} from 'lucide-react';

interface UserDashboardProps {
  trips: Trip[];
  onOpenTrip: (tripId: string, initialTab?: 'itinerary' | 'channel' | 'expenses' | 'packing') => void;
  onViewTripDetail: (trip: Trip) => void;
  onGoToHome?: () => void;
}

type SidebarSection = 'rides' | 'requests' | 'find' | 'history';

const DEFAULT_CAR_PHOTOS = [
  { label: 'Front View', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80' },
  { label: 'Side Profile', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  { label: 'Rear View', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Interior Seats', url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
];

export const UserDashboard: React.FC<UserDashboardProps> = ({
  trips,
  onOpenTrip,
  onViewTripDetail,
  onGoToHome,
}) => {
  const { currentUser, logout, allUsers } = useAuth();
  const [activeSection, setActiveSection] = useState<SidebarSection>('rides');
  const [myRequests, setMyRequests] = useState<CompanionRequest[]>([]);
  const [inspectingCarTrip, setInspectingCarTrip] = useState<Trip | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      onGoToHome?.();
    }
  };

  // Search state inside Find a Ride tab
  const [sourceFilter, setSourceFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncTripsWithBackend();
      if (currentUser?.id) {
        await syncCompanionRequestsWithBackend({ requesterId: currentUser.id });
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Subscribe to companion requests where currentUser is requester
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeToCompanionRequests({ requesterId: currentUser.id }, reqs => {
      setMyRequests(reqs);
    });
    return () => unsub();
  }, [currentUser?.id]);

  // Booked rides: trips where user is a confirmed member (but not owner)
  const bookedRides = trips.filter(
    t => t.memberIds.includes(currentUser.id) && t.ownerId !== currentUser.id && t.status !== 'completed'
  );

  // Completed/past trips
  const pastRides = trips.filter(
    t => t.memberIds.includes(currentUser.id) && (t.status === 'completed' || new Date(t.endDate || t.startDate) < new Date())
  );

  // Pending requests count
  const pendingRequests = myRequests.filter(r => r.status === 'pending');

  // Search filtered available rides: matches updated origin, destination, vehicle, title or spots
  const availableRides = trips.filter(t => {
    const isOwner = t.ownerId === currentUser.id;
    const isMember = t.memberIds.includes(currentUser.id);
    if (isOwner) return false;

    const qSource = sourceFilter.trim().toLowerCase();
    const qDest = destFilter.trim().toLowerCase();

    if (qSource && qDest) {
      const matchS = (t.origin || '').toLowerCase().includes(qSource) || (t.title || '').toLowerCase().includes(qSource);
      const matchD = (t.destination || '').toLowerCase().includes(qDest) ||
                     (t.title || '').toLowerCase().includes(qDest) ||
                     (t.vehicleModel || '').toLowerCase().includes(qDest) ||
                     (t.spotsToVisit || []).some(s => s.toLowerCase().includes(qDest));
      return !isMember && matchS && matchD;
    }

    if (qSource) {
      const matchAny = (t.origin || '').toLowerCase().includes(qSource) ||
                       (t.destination || '').toLowerCase().includes(qSource) ||
                       (t.title || '').toLowerCase().includes(qSource) ||
                       (t.vehicleModel || '').toLowerCase().includes(qSource) ||
                       (t.spotsToVisit || []).some(s => s.toLowerCase().includes(qSource));
      return !isMember && matchAny;
    }

    if (qDest) {
      const matchAny = (t.origin || '').toLowerCase().includes(qDest) ||
                       (t.destination || '').toLowerCase().includes(qDest) ||
                       (t.title || '').toLowerCase().includes(qDest) ||
                       (t.vehicleModel || '').toLowerCase().includes(qDest) ||
                       (t.spotsToVisit || []).some(s => s.toLowerCase().includes(qDest));
      return !isMember && matchAny;
    }

    return !isMember;
  });

  const getDriver = (trip: Trip): UserProfile | undefined => {
    return allUsers.find(u => u.id === trip.ownerId);
  };

  const getCarPhotos = (trip: Trip) => {
    if (trip.carPhotos && trip.carPhotos.length >= 4) {
      return trip.carPhotos.map((url, i) => ({
        label: i === 0 ? 'Front View' : i === 1 ? 'Side Profile' : i === 2 ? 'Rear View' : 'Interior Seats',
        url,
      }));
    }
    return DEFAULT_CAR_PHOTOS;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* ── LEFT MINIMAL SIDEBAR ─────────────────────────────────────── */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <button
                onClick={onGoToHome}
                className="font-brand text-xl font-black text-slate-950 hover:text-orange-600 transition-colors block text-left"
              >
                Smart Ride Sharing
              </button>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  Passenger Hub
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {/* 1. My Rides */}
            <button
              onClick={() => setActiveSection('rides')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSection === 'rides'
                  ? 'bg-orange-50 text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Car className="w-4 h-4 text-orange-500 shrink-0" />
              <span>My Rides</span>
            </button>

            {/* 2. Requests */}
            <button
              onClick={() => setActiveSection('requests')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSection === 'requests'
                  ? 'bg-orange-50 text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Requests</span>
            </button>

            {/* 3. Find a Ride */}
            <button
              onClick={() => setActiveSection('find')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSection === 'find'
                  ? 'bg-orange-50 text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Find a Ride</span>
            </button>

            {/* 4. History */}
            <button
              onClick={() => setActiveSection('history')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSection === 'history'
                  ? 'bg-orange-50 text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-purple-500 shrink-0" />
              <span>History</span>
            </button>
          </nav>
        </div>

        {/* User Account bottom card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentUser.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
              alt={currentUser.displayName}
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser.displayName}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Passenger</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors border border-rose-100 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-8 max-w-5xl overflow-y-auto">
        {/* Header greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Hello, {currentUser.displayName.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {activeSection === 'rides' && 'Your upcoming confirmed bookings and boarding passes'}
              {activeSection === 'requests' && 'Status of ride requests sent to vehicle hosts'}
              {activeSection === 'find' && 'Search verified intercity carpools and road trips'}
              {activeSection === 'history' && 'Completed road trips and shared memories'}
            </p>
          </div>

          {activeSection !== 'find' && (
            <button
              onClick={() => setActiveSection('find')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Search className="w-3.5 h-3.5" />
              Find a Ride
            </button>
          )}
        </div>

        {/* ── 1. MY RIDES SECTION ───────────────────────────────────── */}
        {activeSection === 'rides' && (
          <div className="space-y-4">
            {bookedRides.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No active bookings</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You haven't joined any upcoming road trips yet. Explore available verified routes and request a seat.
                </p>
                <button
                  onClick={() => setActiveSection('find')}
                  className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  Explore Trips
                </button>
              </div>
            ) : (
              bookedRides.map(trip => {
                const driver = getDriver(trip);
                const departureFormatted = trip.departureTime
                  ? new Date(trip.departureTime).toLocaleString('en-IN', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : trip.startDate;

                return (
                  <div
                    key={trip.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 sm:p-6"
                  >
                    {/* Top strip: Route & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 text-base font-black text-slate-900">
                          <span>{trip.origin}</span>
                          <ArrowRight className="w-4 h-4 text-orange-500" />
                          <span className="text-orange-600">{trip.destination}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{departureFormatted}</span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmed Seat
                      </span>
                    </div>

                    {/* Middle: Vehicle details strip */}
                    <div className="py-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Vehicle specs */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Vehicle Details
                          </p>
                          <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                            {trip.vehicleModel || trip.vehicle || 'Car'}
                          </p>
                          <p className="font-mono text-slate-500 text-xs mt-0.5 uppercase">
                            {trip.vehicleNumber || 'KA-01-AB-1234'}
                          </p>
                        </div>

                        {/* 📷 View 4 Photos button */}
                        <button
                          type="button"
                          onClick={() => setInspectingCarTrip(trip)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 text-orange-600 border border-slate-200 hover:border-orange-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>4 Photos</span>
                        </button>
                      </div>

                      {/* Driver & Fare */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Driver / Host
                          </p>
                          <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                            {driver?.displayName || trip.ownerName}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            ★ {driver?.rating || 5.0} · {driver?.phone || 'Verified Host'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Seat Fare
                          </p>
                          <p className="font-extrabold text-emerald-600 text-base">
                            ₹{trip.costPerPerson ? trip.costPerPerson.toLocaleString('en-IN') : trip.budget.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Action buttons */}
                    <div className="pt-4 flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => onOpenTrip(trip.id, 'channel')}
                        className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                        Open Chat
                      </button>

                      <button
                        onClick={() => onOpenTrip(trip.id, 'itinerary')}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-slate-600" />
                        View Route
                      </button>

                      <button
                        onClick={() => onOpenTrip(trip.id, 'expenses')}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <IndianRupee className="w-3.5 h-3.5 text-slate-600" />
                        Expenses
                      </button>

                      <button
                        onClick={() => onOpenTrip(trip.id, 'packing')}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-slate-600" />
                        Packing
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── 2. SENT REQUESTS TRACKER ───────────────────────────────── */}
        {activeSection === 'requests' && (
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No sent requests</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When you request to join trips, the live driver approval status will appear here.
                </p>
                <button
                  onClick={() => setActiveSection('find')}
                  className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  Find Rides
                </button>
              </div>
            ) : (
              myRequests.map(req => {
                const targetTrip = trips.find(t => t.id === req.tripId);

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {req.tripTitle || targetTrip?.title || 'Trip Request'}
                        </h4>
                      </div>
                      {targetTrip && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {targetTrip.origin} ➔ {targetTrip.destination}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        "{req.message}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {req.status === 'pending' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Waiting for Host
                        </span>
                      )}
                      {req.status === 'accepted' && (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3" /> Accepted!
                          </span>
                          <button
                            onClick={() => onOpenTrip(req.tripId, 'itinerary')}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Open Trip →
                          </button>
                        </div>
                      )}
                      {req.status === 'declined' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3" /> Declined
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── 3. FIND A RIDE SECTION ─────────────────────────────────── */}
        {activeSection === 'find' && (
          <div className="space-y-6">
            {/* Search Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    From (Origin)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-orange-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={sourceFilter}
                      onChange={e => setSourceFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    To (Destination)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Coorg"
                      value={destFilter}
                      onChange={e => setDestFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Available Rides ({availableRides.length})
                </h3>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="text-xs font-semibold text-slate-500 hover:text-orange-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Sync latest rides from drivers"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
                  <span>Refresh Rides</span>
                </button>
              </div>

              {availableRides.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">No rides match your route search.</p>
                  <button
                    onClick={() => { setSourceFilter(''); setDestFilter(''); }}
                    className="mt-2 text-xs font-bold text-orange-600 hover:underline"
                  >
                    Clear search filters
                  </button>
                </div>
              ) : (
                availableRides.map(trip => {
                  const availableSeats = trip.totalSeats
                    ? Math.max(0, trip.totalSeats - trip.memberIds.length)
                    : 4;

                  return (
                    <div
                      key={trip.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-orange-300 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                          <span>{trip.origin}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-orange-600">{trip.destination}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>📅 {trip.startDate}</span>
                          <span>🚘 {trip.vehicleModel || trip.vehicle || 'Car'}</span>
                          <span className={availableSeats > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            💺 {availableSeats} seats left
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-medium">Cost / seat</p>
                          <p className="font-black text-slate-900 text-sm">
                            ₹{trip.costPerPerson ? trip.costPerPerson.toLocaleString('en-IN') : '500'}
                          </p>
                        </div>
                        <button
                          onClick={() => onViewTripDetail(trip)}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          View &amp; Request
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── 4. HISTORY SECTION ─────────────────────────────────────── */}
        {activeSection === 'history' && (
          <div className="space-y-4">
            {pastRides.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No past journeys</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Completed road trips and shared photo memories will be saved in your travel archive.
                </p>
              </div>
            ) : (
              pastRides.map(trip => (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{trip.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{trip.origin} ➔ {trip.destination}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Traveled on {trip.startDate}</p>
                  </div>
                  <button
                    onClick={() => onOpenTrip(trip.id, 'itinerary')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                  >
                    View Archive
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ── 4 CAR PHOTOS INSPECTION MODAL ────────────────────────────── */}
      {inspectingCarTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in duration-200">
            <button
              onClick={() => setInspectingCarTrip(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                Vehicle Inspection
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                {inspectingCarTrip.vehicleModel || inspectingCarTrip.vehicle || 'Vehicle Details'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Registration: {inspectingCarTrip.vehicleNumber || 'KA-01-AB-1234'} · 4 Photos Verified
              </p>
            </div>

            {/* 4 Photos Grid */}
            <div className="grid grid-cols-2 gap-3">
              {getCarPhotos(inspectingCarTrip).map((photo, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden bg-slate-100 aspect-4/3 border border-slate-200">
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-[11px] font-bold">
                    {photo.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Verified passenger inspection photos for safe boarding.
              </p>
              <button
                type="button"
                onClick={() => setInspectingCarTrip(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
