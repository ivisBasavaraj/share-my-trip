import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Phone, 
  Lock, 
  CheckCircle2, 
  Star, 
  UserCheck, 
  X,
  Sparkles,
  Siren
} from 'lucide-react';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSos?: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ isOpen, onClose, onTriggerSos }) => {
  const { currentUser, updateProfileBio } = useAuth();
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser.emergencyContact || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileBio(currentUser.bio, currentUser.interests, emergencyPhone);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Trust & Traveler Safety Center</h3>
            <p className="text-xs text-slate-500">Identity verification and emergency response network</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Identity Verification Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Verified Identity Status
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {currentUser.verificationStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Every travel partner in Smart Ride Sharing Platform undergoes profile matching, email/phone verification, and community credibility scoring to eliminate solo traveler risks.
            </p>
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-200/60 text-slate-700 font-medium">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{currentUser.rating} Traveler Rating</span>
              </span>
              <span>·</span>
              <span>{currentUser.tripsCount} Completed Journeys</span>
            </div>
          </div>

          {/* Emergency SOS Quick Action Card */}
          {onTriggerSos && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Siren className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-950 text-xs">Immediate Traveler Emergency (SOS)</h4>
                  <p className="text-[11px] text-red-800/90 leading-tight mt-0.5">
                    Need urgent help? Dispatch an alert with coordinates to emergency contacts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onTriggerSos(); }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Siren className="w-3.5 h-3.5" />
                <span>Trigger SOS</span>
              </button>
            </div>
          )}

          {/* Emergency Contact Setup */}
          <form onSubmit={handleSaveContact} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-amber-700" />
                Confidential Emergency Contact
              </span>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                E2EE Encrypted
              </span>
            </div>
            <p className="text-amber-900/80 text-[11px] leading-relaxed mb-3">
              This number is securely encrypted on device and only decrypted for trip co-travelers during an SOS broadcast or emergency check-in.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="+1 (555) 987-6543 or ICE Contact"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-xs shrink-0"
              >
                {isSaved ? 'Saved!' : 'Save ICE'}
              </button>
            </div>
          </form>

          {/* Privacy Protocol info */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 mb-0.5">End-to-End Cryptographic Privacy</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Group itineraries, real-time chats, and emergency contacts are secured using 256-bit AES-GCM encryption. No unauthorized party or third-party crawler can access your journey plan.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
