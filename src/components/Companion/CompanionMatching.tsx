import React, { useState, useEffect } from 'react';
import { UserProfile, Trip, CompanionRequest } from '../../types';
import { useAuth } from '../../context/useAuth';
import { 
  fetchCompanionRequests, 
  sendCompanionRequestApi, 
  respondToCompanionRequest 
} from '../../services/tripService';
import { TravelerRequestDetailModal } from '../Organizer/TravelerRequestDetailModal';
import { 
  Users, 
  ShieldCheck, 
  Star, 
  Sparkles, 
  Leaf, 
  Check, 
  X, 
  Send, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  MessageSquare,
  Search,
  Filter,
  Eye
} from 'lucide-react';

interface CompanionMatchingProps {
  currentTrip?: Trip;
  onInviteCompanion?: (user: UserProfile) => void;
  onTripUpdated?: (trip: Trip) => void;
}

export const CompanionMatching: React.FC<CompanionMatchingProps> = ({
  currentTrip,
  onInviteCompanion,
  onTripUpdated
}) => {
  const { currentUser, allUsers } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'match' | 'requests'>('match');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [invitedUserIds, setInvitedUserIds] = useState<Record<string, 'pending' | 'accepted'>>({});
  const [inviteNote, setInviteNote] = useState<string>('');
  const [selectedTargetUser, setSelectedTargetUser] = useState<UserProfile | null>(null);

  // Join Requests state
  const [requests, setRequests] = useState<CompanionRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);
  const [inspectingRequest, setInspectingRequest] = useState<CompanionRequest | null>(null);

  // Filter out current active user — includes newly registered Firestore users
  const otherUsers = allUsers.filter((u: UserProfile) => u.id !== currentUser.id);

  // Compute AI matching compatibility score
  const getCompatibilityScore = (user: UserProfile): number => {
    let score = 70; // baseline

    // Style match
    if (user.travelStyle === currentUser.travelStyle) {
      score += 15;
    }

    // Shared interests
    const commonInterests = user.interests.filter(item => 
      currentUser.interests.includes(item)
    );
    score += Math.min(commonInterests.length * 5, 12);

    // Rating boost
    if (user.rating >= 4.8) {
      score += 3;
    }

    return Math.min(score, 99);
  };

  useEffect(() => {
    loadRequests();
  }, [currentTrip?.id, currentUser.id]);

  const loadRequests = async () => {
    setIsLoadingRequests(true);
    // Fetch requests for current trip or where current user is target
    const list = await fetchCompanionRequests(currentTrip?.id, currentUser.id);
    setRequests(list);
    setIsLoadingRequests(false);
  };

  const filteredTravelers = otherUsers.filter(u => {
    const styleMatches = selectedStyle === 'all' || u.travelStyle === selectedStyle;
    const query = searchQuery.trim().toLowerCase();
    const queryMatches = !query || 
      u.displayName.toLowerCase().includes(query) ||
      u.bio.toLowerCase().includes(query) ||
      u.interests.some(i => i.toLowerCase().includes(query));
    return styleMatches && queryMatches;
  });

  const handleSendRequest = async (user: UserProfile) => {
    setInvitedUserIds(prev => ({ ...prev, [user.id]: 'pending' }));
    const score = getCompatibilityScore(user);

    if (currentTrip) {
      await sendCompanionRequestApi({
        tripId: currentTrip.id,
        tripTitle: currentTrip.title,
        requesterId: currentUser.id,
        requesterName: currentUser.displayName,
        requesterAvatar: currentUser.photoURL,
        targetUserId: user.id,
        tripOwnerId: currentTrip.ownerId,
        message: inviteNote || `Hi ${user.displayName}! Would love to have you join our journey to ${currentTrip.destination}.`,
        compatibilityScore: score
      });
      await loadRequests();
    }

    if (onInviteCompanion) {
      onInviteCompanion(user);
    }
    setSelectedTargetUser(null);
    setInviteNote('');
  };

  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    const targetReq = requests.find(r => r.id === requestId);

    // Guard: check seat availability before accepting
    if (status === 'accepted' && currentTrip && targetReq) {
      const currentMembers = currentTrip.memberIds;
      if (
        currentTrip.totalSeats != null &&
        currentMembers.length >= currentTrip.totalSeats
      ) {
        alert('Cannot accept: all seats are already filled.');
        return;
      }
      if (currentMembers.includes(targetReq.requesterId)) {
        alert('This traveler is already a member of the trip.');
        return;
      }
    }

    await respondToCompanionRequest(
      requestId,
      status,
      currentUser.id,
      currentTrip?.id,
      targetReq?.requesterId
    );
    await loadRequests();

    if (status === 'accepted' && currentTrip && onTripUpdated && targetReq) {
      if (!currentTrip.memberIds.includes(targetReq.requesterId)) {
        const updatedTrip: Trip = {
          ...currentTrip,
          memberIds: [...currentTrip.memberIds, targetReq.requesterId],
        };
        onTripUpdated(updatedTrip);
      }
    }
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Subtab Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('match')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'match'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Companion Matcher</span>
          </button>

          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'requests'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5 text-blue-400" />
            <span>Join Requests System</span>
            {pendingRequestsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Trip: <span className="text-slate-900 font-bold">{currentTrip ? currentTrip.title : 'Select Trip'}</span>
        </div>
      </div>

      {/* TAB 1: Match View */}
      {activeSubTab === 'match' && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span>AI Companion Matching Engine</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight mb-2 font-isometra">
                Find Verified Travel Companions & Cut Trip Costs
              </h2>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed mb-4">
                Connect with verified travelers heading to the same destinations. Pool vehicle transit to reduce emissions and split lodgings safely with our verified identity verification system.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Identity Verified Co-Travelers</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  <span>~40% Lower Carbon Emissions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700">Style:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {['all', 'adventure', 'cultural', 'relaxed', 'budget'].map(style => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors capitalize ${
                      selectedStyle === style
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, interests..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-60"
              />
            </div>
          </div>

          {/* Travelers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTravelers.map(traveler => {
              const compatibility = getCompatibilityScore(traveler);
              const inviteStatus = invitedUserIds[traveler.id];
              const isAlreadyMember = currentTrip?.memberIds.includes(traveler.id);

              return (
                <div
                  key={traveler.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Profile Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={traveler.photoURL}
                          alt={traveler.displayName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 text-sm">{traveler.displayName}</h3>
                            {traveler.verificationStatus === 'verified' && (
                              <span title="Verified Traveler">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="capitalize text-amber-700 font-semibold">{traveler.travelStyle}</span>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-0.5 font-bold text-slate-700">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {traveler.rating}
                            </span>
                            <span className="text-slate-400">({traveler.tripsCount} trips)</span>
                          </div>
                        </div>
                      </div>

                      {/* Compatibility Badge */}
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-xl text-right shrink-0">
                        <div className="text-[10px] uppercase font-bold tracking-wider">Match</div>
                        <div className="text-sm font-black font-mono">{compatibility}%</div>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
                      {traveler.bio}
                    </p>

                    {/* Interests Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {traveler.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100">
                    {isAlreadyMember ? (
                      <div className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Already in Trip Group</span>
                      </div>
                    ) : inviteStatus === 'pending' ? (
                      <div className="w-full py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Join Request Sent · Pending</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedTargetUser(traveler)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Send Join Request</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Join Request System (Send/Accept/Reject) */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-blue-600" />
              <span>Trip Join Requests & Coordination Queue</span>
            </h3>
            <p className="text-xs text-slate-500">
              Trip owners can review candidate companions, inspect compatibility scores, and accept or reject requests with real-time membership synchronization.
            </p>
          </div>

          {isLoadingRequests ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading companion requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">No Pending Requests</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active join requests at the moment. Switch to the AI Matcher tab to send companion requests.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={req.requesterAvatar || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg'}
                      alt={req.requesterName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{req.requesterName}</span>
                        <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          {req.compatibilityScore}% Compatibility
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          req.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'declined'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">
                        "{req.message || 'Would love to join this journey!'}"
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Requested on {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Trip Owner or Target */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {currentTrip && (
                      <button
                        onClick={() => setInspectingRequest(req)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Details</span>
                      </button>
                    )}

                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleRespond(req.id, 'accepted')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept Request</span>
                        </button>
                        <button
                          onClick={() => handleRespond(req.id, 'declined')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : req.status === 'accepted' ? (
                      <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        <span>Accepted into Trip</span>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                        Declined
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Traveler Detail Modal */}
      {inspectingRequest && currentTrip && (
        <TravelerRequestDetailModal
          request={inspectingRequest}
          trip={currentTrip}
          travelerProfile={allUsers.find(u => u.id === inspectingRequest.requesterId) || null}
          onClose={() => setInspectingRequest(null)}
          onRespond={async (reqId, status) => {
            await handleRespond(reqId, status);
            return { success: true };
          }}
        />
      )}

      {/* Invite Modal Dialog */}
      {selectedTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Send Join Request to {selectedTargetUser.displayName}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Send a verified companion request for your trip with personalized role proposals.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                {currentTrip ? currentTrip.title : 'Selected Trip'}
              </div>
              <div className="text-slate-500">
                Destination: {currentTrip ? currentTrip.destination : 'Coorg & Wayanad, Western Ghats'}
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Personalized Note / Proposed Travel Roles
            </label>
            <textarea
              rows={3}
              placeholder="Hi! I saw your profile and love hiking too. Would you like to split the vehicle and explore..."
              value={inviteNote}
              onChange={e => setInviteNote(e.target.value)}
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedTargetUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendRequest(selectedTargetUser)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Join Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
