import React, { useState } from 'react';
import { CompanionRequest, Trip, UserProfile } from '../../types';
import { useAuth } from '../../context/useAuth';
import {
  X,
  ShieldCheck,
  Star,
  Sparkles,
  MapPin,
  Calendar,
  Car,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  MessageSquare,
  AlertCircle,
  Mail,
  Compass,
} from 'lucide-react';

interface TravelerRequestDetailModalProps {
  request: CompanionRequest;
  trip: Trip;
  travelerProfile?: UserProfile | null;
  onClose: () => void;
  onRespond: (requestId: string, status: 'accepted' | 'declined') => Promise<{ success: boolean; error?: string }>;
}

export const TravelerRequestDetailModal: React.FC<TravelerRequestDetailModalProps> = ({
  request,
  trip,
  travelerProfile,
  onClose,
  onRespond,
}) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successStatus, setSuccessStatus] = useState<'accepted' | 'declined' | null>(
    request.status === 'accepted' ? 'accepted' : request.status === 'declined' ? 'declined' : null
  );

  const isHost = currentUser.id === trip.ownerId;
  const availableSeats = trip.totalSeats != null
    ? Math.max(0, trip.totalSeats - trip.memberIds.length)
    : null;
  const isFull = availableSeats !== null && availableSeats <= 0;

  // Resolve best profile info available
  const displayName = travelerProfile?.displayName || request.requesterName;
  const photoURL = travelerProfile?.photoURL || request.requesterAvatar || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg';
  const bio = travelerProfile?.bio || (request.requesterProfile as any)?.bio || 'Traveler enthusiastic about shared adventures, scenic road trips, and splitting journey costs.';
  const verificationStatus = travelerProfile?.verificationStatus || (request.requesterProfile as any)?.verificationStatus || 'verified';
  const rating = travelerProfile?.rating || (request.requesterProfile as any)?.rating || 4.9;
  const tripsCount = travelerProfile?.tripsCount || (request.requesterProfile as any)?.tripsCount || 6;
  const travelStyle = travelerProfile?.travelStyle || (request.requesterProfile as any)?.travelStyle || 'adventure';
  const interests = travelerProfile?.interests || (request.requesterProfile as any)?.interests || ['Road Trips', 'Photography', 'Food Exploration'];

  const handleAction = async (status: 'accepted' | 'declined') => {
    if (!isHost) {
      setActionError('Authorization error: Only the trip host can accept or decline requests.');
      return;
    }
    if (status === 'accepted' && isFull) {
      setActionError(`Cannot accept: All ${trip.totalSeats} seats on this trip are occupied.`);
      return;
    }

    setIsSubmitting(true);
    setActionError('');
    try {
      const res = await onRespond(request.id, status);
      if (res.success) {
        setSuccessStatus(status);
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        setActionError(res.error || `Failed to ${status === 'accepted' ? 'accept' : 'reject'} request.`);
      }
    } catch (err: any) {
      setActionError(err?.message || 'A network error occurred while processing the request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Traveler Join Request Details</h3>
                <p className="text-xs text-slate-300">Review candidate traveler before accepting into {trip.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Traveler Profile Summary Card */}
            <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-orange-200 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-base text-slate-900">{displayName}</h4>
                    {verificationStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Traveler
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="capitalize font-semibold text-orange-600">{travelStyle}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {rating}
                    </span>
                    <span>•</span>
                    <span>{tripsCount} Completed Journeys</span>
                  </div>
                </div>
              </div>

              {/* Compatibility Match Badge */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-xl text-center self-stretch sm:self-auto shrink-0">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">AI Compatibility</div>
                <div className="text-base font-black font-mono">{request.compatibilityScore || 85}%</div>
              </div>
            </div>

            {/* Traveler Introduction / Bio */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Traveler Bio & Introduction</p>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                {bio}
              </div>
            </div>

            {/* Interests */}
            {interests.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Travel Interests & Preferences</p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((interest: string, i: number) => (
                    <span key={i} className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Request Message */}
            <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-sky-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                  Join Request Note
                </span>
                <span className="text-[11px] text-sky-600 font-normal">
                  {new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-xs text-sky-800 italic leading-relaxed">
                "{request.message || 'Hi host! I would love to join this journey.'}"
              </p>
            </div>

            {/* Trip Context & Capacity Guard */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="font-bold text-slate-800">{trip.origin} → {trip.destination}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Seats: <strong className={isFull ? 'text-red-600' : 'text-emerald-700'}>{availableSeats ?? '—'} available</strong> / {trip.totalSeats || '—'} total
                </span>
              </div>
            </div>

            {/* Warning if full */}
            {isFull && request.status === 'pending' && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>This trip is currently full ({trip.totalSeats} seats taken). You cannot accept further travelers unless vehicle capacity is increased.</span>
              </div>
            )}

            {/* Action error banner */}
            {actionError && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Success Notification Banner */}
            {successStatus && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                successStatus === 'accepted' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {successStatus === 'accepted'
                    ? "Request accepted! The traveler has been confirmed and added to your trip."
                    : "Request declined."}
                </span>
              </div>
            )}

            {/* Host Decision Action Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Close
              </button>

              {request.status === 'pending' && !successStatus && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAction('declined')}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Decline Request</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || isFull}
                    onClick={() => handleAction('accepted')}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept Traveler</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
