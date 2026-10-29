import React, { useEffect, useMemo, useState } from 'react';
import {
  Car, Check, Edit3, IndianRupee, Loader2, Users, WalletCards, X,
  Inbox, CheckCircle2, XCircle, Clock, ShieldCheck, Eye, AlertCircle
} from 'lucide-react';
import { Trip, Expense, CompanionRequest, UserProfile } from '../../types';
import {
  subscribeToExpenses, updateTrip,
  subscribeToCompanionRequests, respondToCompanionRequest
} from '../../services/tripService';
import { useAuth } from '../../context/useAuth';
import { TravelerRequestDetailModal } from './TravelerRequestDetailModal';

interface OrganizerDashboardProps {
  trip: Trip;
  onTripUpdated: (trip: Trip) => void;
}

const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ trip, onTripUpdated }) => {
  const { currentUser, allUsers } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [vehicle, setVehicle] = useState(trip.vehicle || 'Vehicle details pending');
  const [seats, setSeats] = useState(String(trip.totalSeats || 1));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Join Requests for this trip
  const [requests, setRequests] = useState<CompanionRequest[]>([]);
  const [inspectingRequest, setInspectingRequest] = useState<CompanionRequest | null>(null);
  const [requestActionError, setRequestActionError] = useState('');
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  useEffect(() => {
    setVehicle(trip.vehicle || 'Vehicle details pending');
    setSeats(String(trip.totalSeats || Math.max(1, trip.memberIds?.length || 1)));
  }, [trip]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToExpenses(trip.id, items => { setExpenses(items); setLoading(false); });
    const timer = window.setTimeout(() => setLoading(false), 2500);
    return () => { unsubscribe(); window.clearTimeout(timer); };
  }, [trip.id]);

  // Subscribe to real-time join requests for this specific trip
  useEffect(() => {
    if (!trip.id) return;
    const unsub = subscribeToCompanionRequests({ tripId: trip.id }, items => {
      setRequests(items);
    });
    return () => unsub();
  }, [trip.id]);

  const passengerIds = useMemo(() => Array.from(new Set([trip.ownerId, ...(trip.memberIds || [])].filter(Boolean))), [trip.ownerId, trip.memberIds]);
  const passengers = Math.max(passengerIds.length, 1);
  const totalSpent = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const availableSeats = Math.max(0, (trip.totalSeats || passengers) - passengers);
  const isFull = availableSeats <= 0;
  const equalShare = totalSpent / passengers;
  const budgetRemaining = trip.budget - totalSpent;

  const pendingRequests = requests.filter(r => r.status === 'pending');

  const cancelEdit = () => {
    setVehicle(trip.vehicle || 'Vehicle details pending');
    setSeats(String(trip.totalSeats || passengers));
    setError('');
    setEditing(false);
  };

  const saveVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    const seatCount = Number(seats);
    if (!vehicle.trim()) { setError('Add a vehicle name or details.'); return; }
    if (!Number.isInteger(seatCount) || seatCount < passengers) {
      setError(`Seats must be a whole number and cannot be below the ${passengers} confirmed passengers.`);
      return;
    }
    setSaving(true);
    const updated = { ...trip, vehicle: vehicle.trim(), totalSeats: seatCount, updatedAt: new Date().toISOString() };
    await updateTrip(updated);
    onTripUpdated(updated);
    setSaving(false);
    setEditing(false);
  };

  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return { success: false, error: 'Request not found' };

    if (status === 'accepted') {
      if (isFull) {
        const msg = `Cannot accept: All ${trip.totalSeats || passengers} seats are occupied.`;
        setRequestActionError(msg);
        return { success: false, error: msg };
      }
      if (trip.memberIds.includes(targetReq.requesterId)) {
        return { success: false, error: 'Traveler is already in this trip.' };
      }
    }

    setProcessingReqId(requestId);
    setRequestActionError('');

    try {
      const res = await respondToCompanionRequest(
        requestId,
        status,
        currentUser.id,
        trip.id,
        targetReq.requesterId
      );

      if (res.success && status === 'accepted') {
        const updatedTrip: Trip = {
          ...trip,
          memberIds: Array.from(new Set([...trip.memberIds, targetReq.requesterId])),
        };
        onTripUpdated(updatedTrip);
      } else if (!res.success) {
        setRequestActionError(res.error || 'Failed to update request.');
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Server error occurred.';
      setRequestActionError(msg);
      return { success: false, error: msg };
    } finally {
      setProcessingReqId(null);
    }
  };

  const metrics = [
    { label: 'Confirmed passengers', value: String(passengers), detail: 'Host included', icon: Users, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Available seats', value: String(availableSeats), detail: `${trip.totalSeats || passengers} total capacity`, icon: Car, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Pending Join Requests', value: String(pendingRequests.length), detail: 'Awaiting host review', icon: Inbox, tone: 'text-orange-600 bg-orange-50' },
    { label: 'Equal split', value: loading ? '—' : rupees(equalShare), detail: 'per active passenger', icon: IndianRupee, tone: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">Host Operations Dashboard</p>
          <h2 className="mt-1 text-lg font-bold text-white">Trip Management & Join Requests</h2>
          <p className="mt-0.5 text-xs text-slate-300">Review candidate travelers, vehicle capacity, and finances for {trip.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingRequests.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold bg-amber-400 text-slate-950 animate-pulse">
              <Inbox className="w-3.5 h-3.5" /> {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? 's' : ''}
            </span>
          )}
          <span className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${budgetRemaining >= 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {budgetRemaining >= 0 ? `${rupees(budgetRemaining)} budget left` : `${rupees(Math.abs(budgetRemaining))} over budget`}
          </span>
        </div>
      </header>

      <div className="p-5 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
            <div key={label} className="border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
              </div>
              <p className="mt-3 font-mono text-xl font-bold tabular-nums text-slate-900">{value}</p>
              <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        {/* ── INCOMING JOIN REQUESTS QUEUE (Host View) ── */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="p-4 bg-gradient-to-r from-orange-50/80 to-amber-50/50 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-orange-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Incoming Join Requests ({requests.length})</h3>
                <p className="text-[11px] text-slate-500">Inspect traveler profiles and accept or reject candidates before trip departure</p>
              </div>
            </div>
            {isFull && (
              <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200">
                Trip Full — No Seats Left
              </span>
            )}
          </div>

          {requestActionError && (
            <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{requestActionError}</span>
            </div>
          )}

          <div className="p-4 space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No join requests received yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">When travelers request to join your trip, their profile and message will appear here for your review.</p>
              </div>
            ) : (
              requests.map(req => {
                const profile = allUsers.find(u => u.id === req.requesterId);
                const isProcessing = processingReqId === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-orange-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={req.requesterAvatar || profile?.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
                        alt={req.requesterName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{req.requesterName}</span>
                          {profile?.verificationStatus === 'verified' && (
                            <span title="Identity Verified" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Verified
                            </span>
                          )}
                          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            {req.compatibilityScore}% Match
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'declined' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 italic line-clamp-1">
                          "{req.message || 'Would love to join this journey!'}"
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Requested: {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setInspectingRequest(req)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Details</span>
                      </button>

                      {req.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={isProcessing || isFull}
                            onClick={() => handleRespondToRequest(req.id, 'accepted')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleRespondToRequest(req.id, 'declined')}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : req.status === 'accepted' ? (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Accepted Member
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Vehicle & Capacity Section */}
        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="border border-slate-200 rounded-2xl p-4 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Car className="h-4 w-4 text-orange-500" />
                  Vehicle & Seat Allocation
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Keep seat numbers accurate. Once seats are full, new join requests cannot be accepted.
                </p>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-800">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
            {editing ? (
              <form onSubmit={saveVehicle} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
                  <label className="text-xs font-semibold text-slate-700">
                    Vehicle details
                    <input aria-label="Vehicle details" value={vehicle} onChange={e => setVehicle(e.target.value)} className="mt-1.5 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-lg" placeholder="e.g. Toyota Innova · KA 01 AB 1234" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Total seats
                    <input aria-label="Total seats" type="number" min={passengers} step="1" value={seats} onChange={e => setSeats(e.target.value)} className="mt-1.5 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-lg" />
                  </label>
                </div>
                {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button disabled={saving} className="inline-flex items-center gap-1 bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60 rounded-lg">
                    <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save vehicle'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center bg-orange-50 text-orange-600 rounded-xl">
                  <Car className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{trip.vehicle || 'Vehicle details pending'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{passengers} confirmed · {availableSeats} seats remaining</p>
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-2xl p-4 bg-white">
            <h3 className="text-sm font-bold text-slate-900">Seat Capacity Progress</h3>
            <div className="mt-4 h-3 w-full overflow-hidden bg-slate-100 rounded-full">
              <div
                className={`h-full transition-all rounded-full ${isFull ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (passengers / Math.max(trip.totalSeats || passengers, 1)) * 100)}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs">
              <span className="font-semibold text-slate-700">{passengers} occupied</span>
              <span className="text-slate-500">{trip.totalSeats || passengers} total seats</span>
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Only travelers confirmed by host consume seat quota.
            </p>
          </div>
        </div>
      </div>

      {/* Traveler Detailed Review Modal */}
      {inspectingRequest && (
        <TravelerRequestDetailModal
          request={inspectingRequest}
          trip={trip}
          travelerProfile={allUsers.find(u => u.id === inspectingRequest.requesterId) || null}
          onClose={() => setInspectingRequest(null)}
          onRespond={handleRespondToRequest}
        />
      )}
    </section>
  );
};
