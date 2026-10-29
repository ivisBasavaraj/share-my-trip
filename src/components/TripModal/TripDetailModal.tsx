import React, { useState } from 'react';
import { Trip, UserProfile } from '../../types';
import { useAuth } from '../../context/useAuth';
import { sendCompanionRequestApi } from '../../services/tripService';
import {
  X, MapPin, Calendar, Clock, Car, Users, IndianRupee,
  User, ShieldCheck, Star, CheckCircle2, Loader2, UserCheck,
  MessageSquare, Navigation, Sparkles, AlertCircle
} from 'lucide-react';

interface TripDetailModalProps {
  trip: Trip;
  organiser?: UserProfile;
  onClose: () => void;
  onOpenTrip?: (tripId: string) => void; // for owners / members
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip, organiser, onClose, onOpenTrip,
}) => {
  const { currentUser, firebaseUser } = useAuth();
  const isLoggedIn  = !!firebaseUser;
  const isOwner     = currentUser.id === trip.ownerId;
  const isMember    = trip.memberIds.includes(currentUser.id);
  const availableSeats = trip.totalSeats != null
    ? Math.max(0, trip.totalSeats - trip.memberIds.length)
    : null;

  const [reqStatus, setReqStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [message,   setMessage]   = useState('');
  const [requestError, setRequestError] = useState('');

  const formatDeparture = () => {
    if (!trip.departureTime) return trip.startDate;
    try {
      const d = new Date(trip.departureTime);
      return d.toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return trip.startDate; }
  };

  const formatPosted = () => {
    try {
      return new Date(trip.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  };

  const handleRequestJoin = async () => {
    if (reqStatus !== 'idle') return;
    if (trip.totalSeats != null && availableSeats === 0) {
      setRequestError('Cannot request: All seats on this trip are occupied.');
      return;
    }
    setRequestError('');
    setReqStatus('sending');
    const res = await sendCompanionRequestApi({
      tripId:           trip.id,
      tripTitle:        trip.title,
      requesterId:      currentUser.id,
      requesterName:    currentUser.displayName,
      requesterAvatar:  currentUser.photoURL,
      targetUserId:     trip.ownerId,
      tripOwnerId:      trip.ownerId,
      message:          message.trim() ||
        `Hi! I'd love to join your trip to ${trip.destination}. Please consider my request.`,
      compatibilityScore: 80,
      requesterProfile: {
        bio: currentUser.bio,
        travelStyle: currentUser.travelStyle,
        verificationStatus: currentUser.verificationStatus,
        rating: currentUser.rating,
        tripsCount: currentUser.tripsCount,
        interests: currentUser.interests,
      }
    });
    if (res.success) {
      setReqStatus('sent');
    } else {
      setReqStatus('idle');
      setRequestError(res.error || 'Failed to send join request. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-orange-100 overflow-hidden">

        {/* Cover image header */}
        <div className="relative h-48 bg-orange-50">
          <img
            src={trip.coverImage || '/src/assets/images/hero_travel_journey_1791735781773.jpg'}
            alt={trip.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-gradient-to-r from-orange-500 to-rose-500 text-white px-2 py-0.5 rounded font-bold uppercase">
                {trip.status}
              </span>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded capitalize">
                {trip.travelStyle}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight">{trip.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Route */}
          <div className="flex items-center gap-3 text-sm font-semibold text-gray-800">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
            <span>{trip.origin}</span>
            <Navigation className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-orange-600">{trip.destination}</span>
          </div>

          {/* Key details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Detail icon={<Clock className="w-4 h-4 text-orange-500" />} label="Departure" value={formatDeparture()} />
            <Detail icon={<Calendar className="w-4 h-4 text-orange-400" />} label="Return" value={trip.endDate || '—'} />
            <Detail icon={<Car className="w-4 h-4 text-orange-500" />} label="Vehicle" value={trip.vehicle || '—'} />
            {trip.vehicleNumber && (
              <Detail icon={<Car className="w-4 h-4 text-slate-400" />} label="Reg. Number" value={trip.vehicleNumber} />
            )}
            <Detail
              icon={<Users className="w-4 h-4 text-orange-500" />}
              label="Seats"
              value={
                trip.totalSeats
                  ? `${availableSeats} available / ${trip.totalSeats} total`
                  : `${trip.memberIds.length} joined`
              }
              highlight={availableSeats === 0 && trip.totalSeats != null}
            />
            <Detail
              icon={<IndianRupee className="w-4 h-4 text-emerald-600" />}
              label="Cost / Person"
              value={trip.costPerPerson ? `₹${trip.costPerPerson.toLocaleString('en-IN')}` : '—'}
            />
            <Detail
              icon={<IndianRupee className="w-4 h-4 text-slate-400" />}
              label="Total Budget"
              value={`₹${trip.budget.toLocaleString('en-IN')}`}
            />
          </div>

          {/* Organiser */}
          {organiser && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <img src={organiser.photoURL} alt={organiser.displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-orange-200 shrink-0"
                referrerPolicy="no-referrer" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-gray-900">{organiser.displayName}</span>
                  {organiser.verificationStatus === 'verified' && (
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  )}
                  <span className="text-[11px] text-slate-400">· Posted {formatPosted()}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                  <span className="font-semibold text-orange-600">{organiser.rating}</span>
                  <span>({organiser.tripsCount} trips)</span>
                  <span className="capitalize ml-1 text-slate-400">{organiser.travelStyle}</span>
                </div>
              </div>
            </div>
          )}

          {/* Spots to visit */}
          {trip.spotsToVisit.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Spots to Visit
              </p>
              <div className="flex flex-wrap gap-2">
                {trip.spotsToVisit.map((sp, i) => (
                  <span key={i} className="text-xs bg-orange-50 border border-orange-200 text-orange-800 px-2.5 py-1 rounded-lg font-medium">
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Host notes */}
          {trip.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" /> Host Notes
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100 leading-relaxed">
                {trip.notes}
              </p>
            </div>
          )}

          {/* Seats full warning */}
          {trip.totalSeats && availableSeats === 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium text-center">
              🚫 All seats are filled. This trip is no longer accepting requests.
            </div>
          )}

          {/* Action area */}
          <div className="pt-2 border-t border-gray-100">
            {isOwner ? (
              <button
                onClick={() => { onOpenTrip?.(trip.id); onClose(); }}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation className="w-4 h-4" /> Open Trip Workspace
              </button>
            ) : isMember ? (
              <div className="flex flex-col gap-2">
                <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> You're already in this trip
                </div>
                <button
                  onClick={() => { onOpenTrip?.(trip.id); onClose(); }}
                  className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  Open Trip Workspace
                </button>
              </div>
            ) : reqStatus === 'sent' ? (
              <div className="w-full py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" /> Request sent! Waiting for host to accept.
              </div>
            ) : !isLoggedIn ? (
              <div className="text-center text-sm text-gray-500 py-2">
                Please <button onClick={onClose} className="text-orange-600 font-bold hover:underline">sign in</button> to request to join this trip.
              </div>
            ) : trip.totalSeats && availableSeats === 0 ? null : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Personal message to host <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder={`Hi ${organiser?.displayName || 'there'}! I'm heading to ${trip.destination} and would love to join your trip.`}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
                {requestError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{requestError}</span>
                  </div>
                )}
                <button
                  onClick={handleRequestJoin}
                  disabled={reqStatus === 'sending'}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {reqStatus === 'sending' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending Request…</>
                  ) : (
                    <><UserCheck className="w-4 h-4" /> Request to Join this Trip</>
                  )}
                </button>
                <p className="text-[11px] text-center text-gray-400">
                  The host will be notified and must accept before you join.
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

/* Small helper component for detail cells */
const Detail: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3">
    <div className="flex items-center gap-1.5 mb-0.5">{icon}
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
    <p className={`text-sm font-bold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
  </div>
);
