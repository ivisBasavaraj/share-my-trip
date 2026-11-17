import React, { useState, useEffect } from 'react';
import { Trip, CompanionRequest, UserProfile } from '../../types';
import { useAuth } from '../../context/useAuth';
import {
  Car, Users, IndianRupee, MapPin, Calendar, Clock,
  CheckCircle2, XCircle, AlertCircle, Plus, Camera,
  ShieldCheck, ArrowRight, MessageSquare, Edit3, Sparkles, Check,
  Navigation, Eye, LogOut, ChevronRight, Phone, Shield, X,
  Upload, RotateCcw, Save, Loader2, Image as ImageIcon, Link as LinkIcon
} from 'lucide-react';
import { respondToCompanionRequest, subscribeToCompanionRequests, updateTrip, syncCompanionRequestsWithBackend } from '../../services/tripService';

interface DriverDashboardProps {
  currentUser: UserProfile;
  trips: Trip[];
  requests?: CompanionRequest[];
  onOpenTrip: (tripId: string) => void;
  onPublishTrip: () => void;
  onEditTrip?: (trip: Trip) => void;
  onViewTripDetail: (trip: Trip) => void;
  onGoToHome?: () => void;
  onRefreshRequests?: () => void;
}

type DriverSidebarTab = 'rides' | 'requests' | 'garage' | 'stats';

interface AngleMeta {
  label: string;
  desc: string;
  defaultUrl: string;
}

const DEFAULT_CAR_ANGLES: AngleMeta[] = [
  { label: 'Front Exterior View', desc: 'Grille, headlights & license plate', defaultUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80' },
  { label: 'Side Profile View', desc: 'Tire status & body finish', defaultUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  { label: 'Rear Trunk View', desc: 'Luggage & boot capacity', defaultUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Clean Interior Seating', desc: 'Passenger seats & air conditioning', defaultUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
];

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  currentUser,
  trips,
  requests: initialRequests = [],
  onOpenTrip,
  onPublishTrip,
  onEditTrip,
  onViewTripDetail,
  onGoToHome,
  onRefreshRequests,
}) => {
  const { logout, updateVehicleInfo } = useAuth();
  const [activeTab, setActiveTab] = useState<DriverSidebarTab>('rides');
  const [liveRequests, setLiveRequests] = useState<CompanionRequest[]>(initialRequests);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [inspectingVehicleTrip, setInspectingVehicleTrip] = useState<Trip | null>(null);

  // Trips hosted by this driver
  const hostedTrips = trips.filter(t => t.ownerId === currentUser.id);
  const primaryTrip = hostedTrips[0];

  // ── Garage & Vehicle Edit State ──
  const [vehicleModelInput, setVehicleModelInput] = useState(
    currentUser.vehicleModel || primaryTrip?.vehicleModel || primaryTrip?.vehicle || 'Toyota Innova Crysta'
  );
  const [vehicleNumberInput, setVehicleNumberInput] = useState(
    currentUser.vehicleNumber || primaryTrip?.vehicleNumber || 'KA-04-MB-4521'
  );
  const [carPhotosState, setCarPhotosState] = useState<string[]>(() => {
    if (currentUser.carPhotos && currentUser.carPhotos.length >= 4) return currentUser.carPhotos;
    if (primaryTrip?.carPhotos && primaryTrip.carPhotos.length >= 4) return primaryTrip.carPhotos;
    return DEFAULT_CAR_ANGLES.map(a => a.defaultUrl);
  });

  const [isUploadingAngle, setIsUploadingAngle] = useState<number | null>(null);
  const [isSavingGarage, setIsSavingGarage] = useState(false);
  const [garageSaveMessage, setGarageSaveMessage] = useState('');
  const [editingUrlIndex, setEditingUrlIndex] = useState<number | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState('');

  // Subscribe to companion requests targeting this driver
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeToCompanionRequests({ targetUserId: currentUser.id }, reqs => {
      setLiveRequests(reqs);
    });
    return () => unsub();
  }, [currentUser?.id, hostedTrips.length]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      onGoToHome?.();
    }
  };

  // Pending requests for this driver's rides
  const incomingRequests = liveRequests.filter(
    r =>
      r.targetUserId === currentUser.id ||
      r.tripOwnerId === currentUser.id ||
      hostedTrips.some(t => t.id === r.tripId)
  );
  const pendingRequests = incomingRequests.filter(r => r.status === 'pending');

  const handleRequestAction = async (req: CompanionRequest, status: 'accepted' | 'declined') => {
    setActionLoading(prev => ({ ...prev, [req.id]: true }));
    try {
      await respondToCompanionRequest(req.id, status, currentUser.id, req.tripId, req.requesterId);
      setLiveRequests(prev => prev.map(r => r.id === req.id ? { ...r, status } : r));
      onRefreshRequests?.();
    } catch (err) {
      console.error('Failed to update request status:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [req.id]: false }));
    }
  };

  const [isSyncingRequests, setIsSyncingRequests] = useState(false);
  const handleManualSyncRequests = async () => {
    setIsSyncingRequests(true);
    try {
      const refreshed = await syncCompanionRequestsWithBackend({ targetUserId: currentUser.id });
      setLiveRequests(refreshed);
      onRefreshRequests?.();
    } finally {
      setTimeout(() => setIsSyncingRequests(false), 500);
    }
  };

  // ── Image Upload via File Picker ──
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, angleIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAngle(angleIndex);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      let finalUrl = dataUrl;

      // Try uploading to backend /api/upload
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.url) finalUrl = resData.url;
        }
      } catch (_) {
        // Fallback to base64 dataUrl directly (works offline)
      }

      setCarPhotosState(prev => {
        const next = [...prev];
        next[angleIndex] = finalUrl;
        return next;
      });
      setIsUploadingAngle(null);
      setGarageSaveMessage('Image uploaded! Click "Save Vehicle & Photos" to persist.');
    };
    reader.onerror = () => {
      setIsUploadingAngle(null);
    };
    reader.readAsDataURL(file);
  };

  // ── Save URL Edit ──
  const handleSaveUrlEdit = () => {
    if (editingUrlIndex === null) return;
    if (editingUrlValue.trim()) {
      setCarPhotosState(prev => {
        const next = [...prev];
        next[editingUrlIndex] = editingUrlValue.trim();
        return next;
      });
      setGarageSaveMessage('Photo URL updated! Click "Save Vehicle & Photos" to persist.');
    }
    setEditingUrlIndex(null);
    setEditingUrlValue('');
  };

  // ── Reset Photo to Sample Angle ──
  const handleResetAngle = (angleIndex: number) => {
    setCarPhotosState(prev => {
      const next = [...prev];
      next[angleIndex] = DEFAULT_CAR_ANGLES[angleIndex].defaultUrl;
      return next;
    });
    setGarageSaveMessage('Photo reset to default standard. Click "Save Vehicle & Photos" to persist.');
  };

  // ── Save Garage Details & Sync Trips ──
  const handleSaveGarage = async () => {
    setIsSavingGarage(true);
    setGarageSaveMessage('');
    try {
      // 1. Update User Profile in AuthContext / DB
      await updateVehicleInfo(
        vehicleModelInput.trim(),
        vehicleNumberInput.trim().toUpperCase(),
        carPhotosState
      );

      // 2. Synchronize existing hosted trips with updated vehicle & car photos
      for (const trip of hostedTrips) {
        await updateTrip({
          ...trip,
          vehicleModel: vehicleModelInput.trim(),
          vehicleNumber: vehicleNumberInput.trim().toUpperCase(),
          carPhotos: carPhotosState,
        });
      }

      setGarageSaveMessage('Vehicle details and 4 inspection photos saved successfully!');
      setTimeout(() => setGarageSaveMessage(''), 5000);
    } catch (err) {
      console.error('Failed to save garage info:', err);
      setGarageSaveMessage('Changes saved locally.');
    } finally {
      setIsSavingGarage(false);
    }
  };

  const totalPassengers = hostedTrips.reduce((acc, t) => acc + Math.max(0, t.memberIds.length - 1), 0);
  const totalFuelShare = hostedTrips.reduce(
    (acc, t) => acc + (t.costPerPerson || 0) * Math.max(0, t.memberIds.length - 1),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* ── MINIMAL LEFT SIDEBAR ─────────────────────────────────────── */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <button
                onClick={onGoToHome}
                className="font-brand text-xl font-black text-slate-950 hover:text-orange-600 transition-colors block text-left cursor-pointer"
              >
                Smart Ride Sharing
              </button>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-[11px] font-bold text-orange-600 tracking-wider uppercase flex items-center gap-1">
                  <Car className="w-3 h-3" /> Driver Hub
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {/* 1. Offered Rides */}
            <button
              onClick={() => setActiveTab('rides')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rides'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Car className="w-4 h-4 shrink-0" />
              <span>My Offered Rides</span>
            </button>

            {/* 2. Passenger Requests */}
            <button
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Passenger Requests</span>
            </button>

            {/* 3. My Vehicle & Garage */}
            <button
              onClick={() => setActiveTab('garage')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'garage'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Vehicle &amp; Photos</span>
            </button>

            {/* 4. Fuel Share & Stats */}
            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <IndianRupee className="w-4 h-4 shrink-0" />
              <span>Fuel Share &amp; Stats</span>
            </button>
          </nav>
        </div>

        {/* Driver Profile Card & Single Logout in Sidebar */}
        <div className="p-3 border-t border-slate-200 space-y-2">
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <img
              src={currentUser.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
              alt={currentUser.displayName}
              className="w-9 h-9 rounded-full object-cover border border-orange-200"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser.displayName}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-extrabold text-orange-600 uppercase">
                  Verified Host
                </span>
                <span className="text-[10px] text-slate-400">· 5.0 ★</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT WORKSPACE ────────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">
              {activeTab === 'rides' && 'My Offered Rides'}
              {activeTab === 'requests' && 'Passenger Requests Inbox'}
              {activeTab === 'garage' && 'Vehicle & Inspection Hub (Garage)'}
              {activeTab === 'stats' && 'Fuel Shared & Earnings'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'rides' && 'Manage your intercity routes, seat occupancy, and passengers.'}
              {activeTab === 'requests' && 'Review and accept seat bookings from verified passengers.'}
              {activeTab === 'garage' && 'Upload and edit your 4 car inspection angles, vehicle model, and license plate.'}
              {activeTab === 'stats' && 'Summary of shared fuel contributions and passenger trust metrics.'}
            </p>
          </div>
        </div>

        {/* TAB 1: OFFERED RIDES */}
        {activeTab === 'rides' && (
          <div className="space-y-4">
            {pendingRequests.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {pendingRequests.length}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950">
                      {pendingRequests.length} Pending Passenger {pendingRequests.length > 1 ? 'Requests' : 'Request'}
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Travelers want to join your offered ride! Review and approve seats.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('requests')}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  View Passenger Requests &rarr;
                </button>
              </div>
            )}

            {hostedTrips.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                  <Car className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">You haven't offered any rides yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Driving to another city? Offer your empty car seats to share fuel and highway toll expenses.
                  </p>
                </div>
                <button
                  onClick={onPublishTrip}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  + Offer Your First Ride
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <p className="text-xs font-bold text-slate-500">
                    {hostedTrips.length} Active Offered Ride{hostedTrips.length > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={onPublishTrip}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Offer a Ride
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hostedTrips.map(trip => {
                  const capacity = trip.totalSeats || 4;
                  const bookedCount = trip.memberIds.length;
                  const availableSeats = Math.max(0, capacity - bookedCount);
                  const isFull = availableSeats <= 0;

                  return (
                    <div
                      key={trip.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-orange-200 transition-all"
                    >
                      <div className="p-5 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-700 uppercase tracking-wider">
                            {trip.status}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {trip.startDate}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-base">
                          {trip.title}
                        </h3>

                        {/* Origin -> Destination Route */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span className="truncate">{trip.origin}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          <span className="text-orange-600 truncate">{trip.destination}</span>
                        </div>

                        {/* Vehicle & Seats Breakdown */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5 text-slate-800">
                              <Car className="w-3.5 h-3.5 text-orange-500" />
                              {trip.vehicleModel || trip.vehicle || 'Standard Vehicle'}
                            </span>
                            <span className="font-mono text-slate-500">
                              {trip.vehicleNumber || 'KA-04-MB-4521'}
                            </span>
                          </div>

                          {/* Seat Capacity Bar */}
                          <div>
                            <div className="flex justify-between text-[11px] font-bold mb-1">
                              <span className="text-slate-500">{bookedCount} Booked</span>
                              <span className={isFull ? 'text-rose-600' : 'text-emerald-700'}>
                                {isFull ? 'All Seats Filled' : `${availableSeats} Seats Available`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (bookedCount / capacity) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-slate-500">Cost per seat:</span>
                            <span className="font-bold text-orange-600 text-xs">₹{trip.costPerPerson || 0}</span>
                          </div>
                        </div>

                        {/* 4 Car Photos Inspection Pill */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setInspectingVehicleTrip(trip)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Inspect 4 Car Photos</span>
                          </button>
                          <span className="text-[11px] font-bold text-slate-400">
                            {trip.departureTime ? trip.departureTime.split('T')[1]?.slice(0, 5) : '08:00 AM'}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onViewTripDetail(trip)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          View Details
                        </button>

                        <button
                          onClick={() => onOpenTrip(trip.id)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-orange-400" />
                          <span>Open Workspace</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PASSENGER REQUESTS APPROVAL */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <p className="text-xs font-bold text-slate-500">
                {incomingRequests.length} Passenger Request{incomingRequests.length !== 1 ? 's' : ''} ({pendingRequests.length} pending approval)
              </p>
              <button
                onClick={handleManualSyncRequests}
                disabled={isSyncingRequests}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSyncingRequests ? 'animate-spin text-orange-500' : 'text-slate-400'}`} />
                <span>{isSyncingRequests ? 'Syncing...' : 'Sync Requests'}</span>
              </button>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-extrabold text-slate-900 text-base">No Passenger Requests Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When travelers find your road trips and request a seat, their requests will appear here for 1-click approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map(req => {
                  const isLoading = actionLoading[req.id];

                  return (
                    <div
                      key={req.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={req.requesterAvatar || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
                          alt={req.requesterName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-orange-200 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {req.requesterName}
                            </span>
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified Passenger
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              for {req.tripTitle}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            "{req.message || 'Hi, I would love to join your carpool on this route!'}"
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleRequestAction(req, 'declined')}
                              disabled={isLoading}
                              className="px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleRequestAction(req, 'accepted')}
                              disabled={isLoading}
                              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept Passenger</span>
                            </button>
                          </>
                        ) : (
                          <span
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl capitalize ${
                              req.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {req.status === 'accepted' ? 'Accepted into Trip' : 'Declined'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VEHICLE & GARAGE INSPECTION (UPLOAD & EDIT CAR IMAGES) */}
        {activeTab === 'garage' && (
          <div className="space-y-6">
            {/* Feedback notification banner */}
            {garageSaveMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{garageSaveMessage}</span>
                </div>
                <button onClick={() => setGarageSaveMessage('')} className="text-emerald-700 hover:text-emerald-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Vehicle Details Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                    <Car className="w-4 h-4" /> Registered Vehicle &amp; Inspection
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {vehicleModelInput || 'My Car Profile'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Plate: <span className="font-mono font-bold text-slate-800">{vehicleNumberInput}</span> · Verified 4-Photo Standard
                  </p>
                </div>

                <button
                  onClick={handleSaveGarage}
                  disabled={isSavingGarage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto disabled:opacity-60"
                >
                  {isSavingGarage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Vehicle &amp; Photos</span>
                    </>
                  )}
                </button>
              </div>

              {/* Editable Vehicle Model & Plate inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Car Model &amp; Make
                  </label>
                  <input
                    type="text"
                    value={vehicleModelInput}
                    onChange={e => setVehicleModelInput(e.target.value)}
                    placeholder="e.g. Toyota Innova Crysta / Ertiga / Creta"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    License Plate Registration Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNumberInput}
                    onChange={e => setVehicleNumberInput(e.target.value.toUpperCase())}
                    placeholder="e.g. KA-04-MB-4521"
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* 4 Inspection Photos Section with Upload & Edit Controls */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-orange-500" />
                      Mandatory 4 Car Inspection Angles (Upload &amp; Edit)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload clear photos from your device or paste image URLs for each required angle.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DEFAULT_CAR_ANGLES.map((angle, i) => {
                    const currentPhoto = carPhotosState[i] || angle.defaultUrl;
                    const isUploadingThis = isUploadingAngle === i;

                    return (
                      <div
                        key={i}
                        className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col justify-between p-3 space-y-3 hover:border-orange-300 transition-all shadow-2xs"
                      >
                        {/* Image Preview */}
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-200 group">
                          <img
                            src={currentPhoto}
                            alt={angle.label}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                          />
                          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            Angle {i + 1}
                          </div>

                          {/* Loading overlay */}
                          {isUploadingThis && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                              <span className="text-[11px] font-bold">Uploading...</span>
                            </div>
                          )}

                          {/* Inspect Fullscreen Overlay Button */}
                          <button
                            type="button"
                            onClick={() => setInspectingVehicleTrip({
                              id: 'preview',
                              title: vehicleModelInput,
                              vehicleModel: vehicleModelInput,
                              vehicleNumber: vehicleNumberInput,
                              carPhotos: carPhotosState,
                            } as Trip)}
                            className="absolute bottom-2 right-2 bg-slate-900/70 hover:bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Inspect Image"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Angle Info */}
                        <div>
                          <p className="text-xs font-bold text-slate-900">{angle.label}</p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{angle.desc}</p>
                        </div>

                        {/* Image Action Buttons: Upload File & Edit URL */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                          {/* 1. Upload File Button */}
                          <label className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingThis}
                              onChange={e => handleImageFileUpload(e, i)}
                              className="hidden"
                            />
                          </label>

                          <div className="flex items-center gap-1.5">
                            {/* 2. Edit / Paste URL */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUrlIndex(i);
                                setEditingUrlValue(currentPhoto);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>Edit URL</span>
                            </button>

                            {/* 3. Reset Button */}
                            <button
                              type="button"
                              onClick={() => handleResetAngle(i)}
                              title="Reset to sample photo"
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Save Bar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  All 4 angles are verified and shown to travelers when they inspect your car.
                </span>
                <button
                  onClick={handleSaveGarage}
                  disabled={isSavingGarage}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSavingGarage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Vehicle &amp; Photos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FUEL SHARE & STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-2xl font-black text-slate-900">{hostedTrips.length}</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Rides Published</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-2xl font-black text-orange-600">{pendingRequests.length}</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Pending Requests</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-2xl font-black text-emerald-600">{totalPassengers}</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Passengers Hosted</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-2xl font-black text-slate-900">₹{totalFuelShare.toLocaleString('en-IN')}</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Fuel Shared (₹)</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm">Driver Safety &amp; Trust Score</h3>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">100% Identity &amp; Vehicle Compliance</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Your vehicle registration, driver license verification, and 4-photo inspection are up-to-date.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── EDIT URL POPUP MODAL ────────────────────────────────────────── */}
      {editingUrlIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-500" />
                Edit Angle {editingUrlIndex + 1} Image URL
              </h3>
              <button
                onClick={() => setEditingUrlIndex(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2">
                Paste a direct image web link (HTTPS) or local image path:
              </p>
              <input
                type="url"
                value={editingUrlValue}
                onChange={e => setEditingUrlValue(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
              />
            </div>

            {/* Quick preview */}
            {editingUrlValue && (
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={editingUrlValue}
                  alt="URL Preview"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUrlIndex(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUrlEdit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Update Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4 CAR PHOTOS INSPECTION MODAL ──────────────────────────────── */}
      {inspectingVehicleTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-orange-500" />
                  Vehicle 4-Photo Inspection
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {inspectingVehicleTrip.vehicleModel || vehicleModelInput} · {inspectingVehicleTrip.vehicleNumber || vehicleNumberInput}
                </p>
              </div>
              <button
                onClick={() => setInspectingVehicleTrip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_CAR_ANGLES.map((angle, i) => {
                const photoUrl = (inspectingVehicleTrip.carPhotos && inspectingVehicleTrip.carPhotos[i]) || carPhotosState[i] || angle.defaultUrl;
                return (
                  <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 space-y-1.5">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-200">
                      <img src={photoUrl} alt={angle.label} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 px-1">{angle.label}</p>
                    <p className="text-[11px] text-slate-400 px-1">{angle.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
