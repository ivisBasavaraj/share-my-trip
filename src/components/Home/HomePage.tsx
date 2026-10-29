import React, { useState, useMemo, useEffect } from 'react';
import { Trip } from '../../types';
import { useAuth } from '../../context/useAuth';
import { sendCompanionRequestApi } from '../../services/tripService';
import {
  MapPin, ArrowRight, Plus, Search, Star, ShieldCheck,
  IndianRupee, Calendar, Users, UserCheck, Clock, CheckCircle2,
  Loader2, User, Compass, Navigation, Car, AlertCircle, RefreshCw, X,
  Filter, Sparkles
} from 'lucide-react';

interface HomePageProps {
  trips: Trip[];
  onOpenTrip: (tripId: string) => void;
  onGoToLogin: () => void;
  onStartPlanning: () => void;
  onHostTrip: () => void;
  onViewTripDetail: (trip: Trip) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  trips, onOpenTrip, onGoToLogin, onStartPlanning, onHostTrip, onViewTripDetail,
}) => {
  const { currentUser, firebaseUser, allUsers } = useAuth();
  const isLoggedIn = !!firebaseUser;

  // Multi-criteria search inputs: Source, Destination, and Places
  const [sourceQuery, setSourceQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('all');

  // Loading, Empty, and Error states
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [joinState, setJoinState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});
  const [joinError, setJoinError] = useState<Record<string, string>>({});

  // Dynamic popular places extracted from actual trips in database (no hardcoding / no paid APIs)
  const popularPlaces = useMemo(() => {
    const places = new Set<string>();
    trips.forEach(t => {
      if (t.destination) places.add(t.destination.split(',')[0].trim());
      if (t.origin) places.add(t.origin.split(',')[0].trim());
      (t.spotsToVisit || []).forEach(s => places.add(s.trim()));
    });
    return Array.from(places).filter(Boolean).slice(0, 8);
  }, [trips]);

  // Debounce search state to display smooth loading feedback
  useEffect(() => {
    setIsSearching(true);
    setSearchError('');
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 180);
    return () => clearTimeout(timer);
  }, [sourceQuery, destinationQuery, placeQuery, selectedStyle]);

  // Filtered trips logic
  const filteredTrips = useMemo(() => {
    try {
      const src = sourceQuery.trim().toLowerCase();
      const dest = destinationQuery.trim().toLowerCase();
      const place = placeQuery.trim().toLowerCase();

      return trips.filter(t => {
        const styleOk = selectedStyle === 'all' || t.travelStyle === selectedStyle;

        // Source matching
        const sourceOk = !src || (t.origin || '').toLowerCase().includes(src);

        // Destination matching
        const destOk = !dest || (t.destination || '').toLowerCase().includes(dest);

        // Places / spots along the way matching
        const placeOk = !place ||
          (t.spotsToVisit || []).some(sp => sp.toLowerCase().includes(place)) ||
          (t.itinerary || []).some(w => w.locationName?.toLowerCase().includes(place) || w.title?.toLowerCase().includes(place)) ||
          t.title.toLowerCase().includes(place) ||
          t.destination.toLowerCase().includes(place);

        return styleOk && sourceOk && destOk && placeOk;
      });
    } catch (err: any) {
      setSearchError('Error applying search filter. Please check your query.');
      return trips;
    }
  }, [trips, sourceQuery, destinationQuery, placeQuery, selectedStyle]);

  // Helper: resolve organiser display name from allUsers
  const organiserName = (trip: Trip) => {
    const u = allUsers.find(u => u.id === trip.ownerId);
    return u?.displayName || trip.ownerName || 'Host';
  };

  const organiserProfile = (trip: Trip) => {
    return allUsers.find(u => u.id === trip.ownerId);
  };

  // Format hosted date
  const hostedAt = (trip: Trip) => {
    try { return new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return trip.startDate; }
  };

  const clearAllFilters = () => {
    setSourceQuery('');
    setDestinationQuery('');
    setPlaceQuery('');
    setSelectedStyle('all');
    setSearchError('');
  };

  const hasActiveFilters = !!(sourceQuery || destinationQuery || placeQuery || selectedStyle !== 'all');

  // Request to join with capacity & duplicate prevention
  const handleRequestJoin = async (trip: Trip) => {
    if (!isLoggedIn) { onGoToLogin(); return; }
    if (trip.memberIds.includes(currentUser.id)) return;
    if (joinState[trip.id] === 'sent' || joinState[trip.id] === 'sending') return;

    const availableSeats = trip.totalSeats != null
      ? Math.max(0, trip.totalSeats - trip.memberIds.length)
      : null;
    if (availableSeats === 0) {
      setJoinError(prev => ({ ...prev, [trip.id]: 'All seats are filled.' }));
      return;
    }

    setJoinState(s => ({ ...s, [trip.id]: 'sending' }));
    setJoinError(prev => ({ ...prev, [trip.id]: '' }));

    const res = await sendCompanionRequestApi({
      tripId:            trip.id,
      tripTitle:         trip.title,
      requesterId:       currentUser.id,
      requesterName:     currentUser.displayName,
      requesterAvatar:   currentUser.photoURL,
      targetUserId:      trip.ownerId,
      tripOwnerId:       trip.ownerId,
      message:           `Hi ${trip.ownerName}! I would love to join your journey to ${trip.destination}. Please consider my request.`,
      compatibilityScore: 82,
      requesterProfile: {
        bio: currentUser.bio,
        travelStyle: currentUser.travelStyle,
        verificationStatus: currentUser.verificationStatus,
        rating: currentUser.rating,
        tripsCount: currentUser.tripsCount,
      }
    });

    if (res.success) {
      setJoinState(s => ({ ...s, [trip.id]: 'sent' }));
    } else {
      setJoinState(s => ({ ...s, [trip.id]: 'idle' }));
      setJoinError(prev => ({ ...prev, [trip.id]: res.error || 'Failed to send request.' }));
    }
  };

  return (
    <div className="pb-16">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <svg className="hidden lg:block absolute right-0 inset-y-0 h-full w-48 text-white transform translate-x-1/2"
              fill="currentColor" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polygon points="50,0 100,0 50,100 0,100" />
            </svg>

            <div className="pt-10 mx-auto max-w-7xl px-4 sm:pt-12 sm:px-6 md:pt-16 lg:pt-20 lg:px-8 xl:pt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl leading-tight">
                  <span className="block xl:inline pop-animate">Travel Together,</span>{' '}
                  <span className="block text-orange-500 xl:inline pop-animate">Save Together.</span>
                </h1>
                <p className="mt-4 text-base text-gray-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0 font-brand">
                  Don't just travel, vibe your way through the roads! Find people heading the same way, share the ride, split the cost.
                </p>

                <div className="mt-6 sm:mt-8 flex flex-wrap gap-3 sm:justify-center lg:justify-start">
                  <button
                    onClick={onStartPlanning}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-white font-semibold text-base bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-200/60 transition-all md:py-4 md:text-lg md:px-10"
                  >
                    Find a Trip <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Host trip — only when logged in */}
                  {isLoggedIn ? (
                    <button
                      onClick={onHostTrip}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 font-semibold text-base shadow-sm transition-all md:py-4 md:text-lg md:px-10"
                    >
                      <Plus className="w-4 h-4" /> Create a Trip
                    </button>
                  ) : (
                    <button
                      onClick={onGoToLogin}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-sky-700 bg-sky-50 hover:bg-sky-100 font-semibold text-base border border-sky-200 shadow-sm transition-all md:py-4 md:text-lg md:px-10"
                    >
                      Sign In to Host a Trip
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
            src="/src/assets/images/hero_travel_journey_1791735781773.jpg"
            alt="Scenic travel route"
          />
        </div>
      </div>

      {/* ── TAGLINE BANNER ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 mt-6">
        <div className="tagline-banner py-5 px-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            "Plan madu • Ride link madu • Travel madu • Oota madu!"
          </h2>
          <p className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-widest opacity-95">
            Plan • Connect • Travel • Eat
          </p>
        </div>
      </div>

      {/* ── ENHANCED SEARCH PLACES SECTION (Source, Destination, Places) ── */}
      <div className="max-w-7xl mx-auto px-4 mt-10">
        <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                Find Your Ride &amp; Explore Routes
              </p>
              <h3 className="text-xl font-extrabold text-gray-900">Search by Source, Destination &amp; Places</h3>
            </div>
            
            {/* Travel Style Chips */}
            <div className="flex items-center gap-1.5 bg-orange-50 p-1 rounded-xl text-xs overflow-x-auto scrollbar-none">
              {['all','adventure','cultural','relaxed','budget'].map(style => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-3 py-1 font-medium rounded-lg capitalize transition-colors whitespace-nowrap ${
                    selectedStyle === style ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-orange-700'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {searchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {searchError}
              </span>
              <button onClick={() => setSearchError('')} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Three Dedicated Search Fields: Source, Destination, Places */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Source (Origin) */}
            <div className="relative">
              <MapPin className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="From / Source (e.g. Bengaluru, Delhi)..."
                value={sourceQuery}
                onChange={e => setSourceQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-3 text-xs sm:text-sm bg-orange-50/60 border border-orange-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium text-gray-900 placeholder:text-slate-400"
              />
              {sourceQuery && (
                <button
                  onClick={() => setSourceQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base"
                >×</button>
              )}
            </div>

            {/* 2. Destination */}
            <div className="relative">
              <Compass className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="To / Destination (e.g. Coorg, Leh, Goa)..."
                value={destinationQuery}
                onChange={e => setDestinationQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-3 text-xs sm:text-sm bg-orange-50/60 border border-orange-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium text-gray-900 placeholder:text-slate-400"
              />
              {destinationQuery && (
                <button
                  onClick={() => setDestinationQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base"
                >×</button>
              )}
            </div>

            {/* 3. Places / Waypoints / Attractions */}
            <div className="relative">
              <Search className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Places / Stops (e.g. Abbi Falls, Rohtang)..."
                value={placeQuery}
                onChange={e => setPlaceQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-3 text-xs sm:text-sm bg-orange-50/60 border border-orange-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium text-gray-900 placeholder:text-slate-400"
              />
              {placeQuery && (
                <button
                  onClick={() => setPlaceQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base"
                >×</button>
              )}
            </div>
          </div>

          {/* Popular places quick chips */}
          {popularPlaces.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-400" />
                Popular:
              </span>
              {popularPlaces.map(place => (
                <button
                  key={place}
                  type="button"
                  onClick={() => {
                    setDestinationQuery(place);
                  }}
                  className="text-xs bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-600 px-2.5 py-1 rounded-lg transition-colors font-medium"
                >
                  {place}
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}

          {/* Active Search Summary */}
          {hasActiveFilters && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              {isSearching ? (
                <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating matching trips…
                </span>
              ) : (
                <span>
                  Found <strong>{filteredTrips.length}</strong> trip{filteredTrips.length !== 1 ? 's' : ''} matching criteria.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── AVAILABLE TRIPS GRID ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Matching Trips ({filteredTrips.length})
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isLoggedIn
                ? 'Request to join any trip below. Once the host accepts, you will be confirmed into the journey.'
                : 'Sign in to send join requests to trip hosts.'}
            </p>
          </div>
          {isLoggedIn && (
            <button
              onClick={onHostTrip}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:from-orange-600 hover:to-rose-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> + Create New Trip
            </button>
          )}
        </div>

        {/* LOADING STATE */}
        {isSearching ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-orange-100 space-y-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Searching routes &amp; destinations…</p>
            <p className="text-xs text-slate-400">Filtering trip origins, stops, and waypoints</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* EMPTY RESULT STATE */
          <div className="p-12 text-center bg-white rounded-3xl border border-orange-100 space-y-4">
            <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">No matching trips found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No trips currently match your search criteria {sourceQuery ? `from "${sourceQuery}"` : ''} {destinationQuery ? `to "${destinationQuery}"` : ''} {placeQuery ? `near "${placeQuery}"` : ''}.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Clear All Filters
                </button>
              )}
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={onHostTrip}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Host this Route
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  Sign In to Host this Trip
                </button>
              )}
            </div>
          </div>
        ) : (
          /* TRIPS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map(trip => {
              const isMember = trip.memberIds.includes(currentUser.id);
              const isOwner = trip.ownerId === currentUser.id;
              const reqStatus = joinState[trip.id] || 'idle';
              const reqErr = joinError[trip.id];

              const availableSeats = trip.totalSeats != null
                ? Math.max(0, trip.totalSeats - trip.memberIds.length)
                : null;
              const isFull = availableSeats !== null && availableSeats <= 0;
              const hostUser = organiserProfile(trip);

              return (
                <div key={trip.id} className="trip-card rounded-2xl overflow-hidden flex flex-col justify-between group bg-white border border-orange-100 shadow-sm hover:shadow-md transition-all">
                  <div>
                    {/* Cover image */}
                    <div className="relative aspect-[16/9] bg-orange-50 overflow-hidden cursor-pointer" onClick={() => onViewTripDetail(trip)}>
                      <img
                        src={trip.coverImage || '/src/assets/images/hero_travel_journey_1791735781773.jpg'}
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-gray-900/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg capitalize">
                        {trip.travelStyle}
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="text-xs bg-gradient-to-r from-orange-500 to-rose-500 text-white px-2 py-0.5 rounded font-semibold uppercase">
                          {trip.status}
                        </span>
                        {trip.vehicle && (
                          <span className="text-xs bg-gray-900/80 text-white px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <Car className="w-3 h-3 text-orange-400" />
                            {trip.vehicle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <h3
                        onClick={() => onViewTripDetail(trip)}
                        className="font-bold text-gray-900 text-base leading-snug cursor-pointer hover:text-orange-600 transition-colors"
                      >
                        {trip.title}
                      </h3>

                      {/* Route (Origin → Destination) */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-800 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{trip.origin}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-orange-600 truncate max-w-[140px]">{trip.destination}</span>
                      </div>

                      {/* Date / Seats left / Cost per seat */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {trip.startDate}
                        </span>
                        {trip.totalSeats != null && (
                          <span className={`flex items-center gap-1 font-bold ${isFull ? 'text-red-500' : 'text-emerald-600'}`}>
                            <Users className="w-3.5 h-3.5" />
                            {isFull ? 'Seats Full' : `${availableSeats} seats left`}
                          </span>
                        )}
                        {trip.costPerPerson && (
                          <span className="font-bold text-orange-600 flex items-center gap-0.5">
                            <IndianRupee className="w-3 h-3" />₹{trip.costPerPerson.toLocaleString('en-IN')}/seat
                          </span>
                        )}
                      </div>

                      {/* Host information */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={hostUser?.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover border border-orange-200"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-semibold text-slate-800">{organiserName(trip)}</span>
                          {hostUser?.verificationStatus === 'verified' && (
                            <span title="Verified Host">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">Posted {hostedAt(trip)}</span>
                      </div>

                      {/* Spots */}
                      {trip.spotsToVisit.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {trip.spotsToVisit.slice(0, 3).map((sp, i) => (
                            <span key={i} className="text-[10px] bg-orange-50 text-orange-800 border border-orange-100 px-2 py-0.5 rounded font-medium">
                              {sp}
                            </span>
                          ))}
                          {trip.spotsToVisit.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{trip.spotsToVisit.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Join error if any */}
                      {reqErr && (
                        <p className="text-[11px] text-rose-600 font-medium">{reqErr}</p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer with Details and Action */}
                  <div className="px-4 pb-4 border-t border-orange-50 flex items-center justify-between pt-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Budget</div>
                      <div className="text-sm font-bold font-mono text-gray-900 tabular-nums flex items-center gap-0.5">
                        <IndianRupee className="w-3.5 h-3.5 text-orange-500" />
                        {trip.budget.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onViewTripDetail(trip)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        Details
                      </button>

                      {isOwner ? (
                        <button
                          onClick={() => onOpenTrip(trip.id)}
                          className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          Manage <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : isMember ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Joined
                        </div>
                      ) : reqStatus === 'sent' ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Sent
                        </div>
                      ) : isFull ? (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-xl border border-red-200">
                          Full
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestJoin(trip)}
                          disabled={reqStatus === 'sending'}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          {reqStatus === 'sending' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Join</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── WHY CHOOSE US ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 mt-16">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">Why Choose Us?</p>
          <h2 className="text-3xl font-extrabold text-gray-900">A better way to travel</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
            Connect with like-minded travelers, share rides, cut costs, and create stories worth remembering — all while caring for the planet.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Cost Saving',     icon: '💰', color: 'shadow-orange-100/60', desc: 'Split fuel and toll costs. Traveling to the same destination becomes significantly cheaper for everyone.' },
            { title: 'Eco Friendly',    icon: '🌿', color: 'shadow-emerald-100/60', desc: 'Fewer cars on the road means less pollution. Do your part for the environment with every shared trip.' },
            { title: 'Build Community', icon: '🤝', color: 'shadow-sky-100/60', desc: 'Meet new people, make friends, and build a trusted community of fellow travelers and commuters.' },
          ].map(f => (
            <div key={f.title} className={`feature-card p-6 rounded-2xl shadow-lg ${f.color}`}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── VERIFIED TRAVELERS ───────────────────────────────── */}
      {allUsers.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-16 space-y-5">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Meet Verified Co-Travelers</h2>
            <p className="text-xs text-slate-500 mt-1">Travelers ready to share rides, lodgings, and adventures</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {allUsers.slice(0, 8).map(user => (
              <div key={user.id} className="bg-white rounded-2xl border border-orange-100 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-orange-100"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-1">
                        {user.displayName}
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="text-[11px] text-slate-500 capitalize flex items-center gap-1">
                        {user.travelStyle} ·
                        <span className="flex items-center gap-0.5 text-orange-600 font-semibold">
                          <Star className="w-3 h-3 fill-orange-400 text-orange-400" />{user.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-3">{user.bio}</p>
                </div>
                <div className="pt-2 border-t border-orange-50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">{user.tripsCount} journeys</span>
                  <button onClick={onStartPlanning} className="text-orange-600 font-semibold hover:text-orange-800 text-[11px] flex items-center gap-1">
                    Connect <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA BANNER ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 mt-14">
        <div className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to plan your next journey?</h2>
            <p className="text-orange-100 text-sm mt-2">
              {isLoggedIn
                ? 'Create a trip, invite companions, and let our interactive map handle the route.'
                : 'Sign in to create trips, request to join, and connect with travelers.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {isLoggedIn ? (
              <button
                onClick={onHostTrip}
                className="px-6 py-3.5 bg-white hover:bg-orange-50 text-orange-700 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create a Trip
              </button>
            ) : (
              <button
                onClick={onGoToLogin}
                className="px-6 py-3.5 bg-white hover:bg-orange-50 text-orange-700 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                Sign In to Get Started
              </button>
            )}
            <button
              onClick={onStartPlanning}
              className="px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
            >
              Browse Trips
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
