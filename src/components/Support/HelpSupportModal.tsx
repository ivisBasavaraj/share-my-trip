import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Trip } from '../../types';
import { submitWebsiteIssue } from '../../services/tripService';
import {
  LifeBuoy,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Send,
  Shield,
  HelpCircle,
  FileQuestion,
  ExternalLink,
} from 'lucide-react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips?: Trip[];
  activeTripId?: string;
}

const ISSUE_CATEGORIES = [
  'Technical Bug / Website Glitch',
  'Join Request / Trip Booking Problem',
  'Fare Split & Payment Inquiry',
  'Map & Route Navigation Issue',
  'Account & Identity Verification',
  'Safety & Co-Traveler Conduct',
  'General Feedback & Suggestion',
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  trips = [],
  activeTripId,
}) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'helpline' | 'report'>('report');

  // Report form state
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTripId, setSelectedTripId] = useState(activeTripId || '');
  const [reporterEmail, setReporterEmail] = useState(currentUser.email || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Verified helplines (Official Indian Emergency Services and configurable platform placeholders)
  const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string) || 'support@smartrideshare.local';
  const SUPPORT_PHONE = (import.meta.env.VITE_SUPPORT_PHONE as string) || '+91 (Placeholder) 1800-000-0000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!category.trim()) {
      setValidationError('Please select an issue category.');
      return;
    }
    if (subject.trim().length < 3) {
      setValidationError('Subject must be at least 3 characters long.');
      return;
    }
    if (description.trim().length < 10) {
      setValidationError('Description must be at least 10 characters long to help us troubleshoot.');
      return;
    }

    setIsSubmitting(true);
    const relatedTrip = trips.find(t => t.id === selectedTripId);

    const res = await submitWebsiteIssue({
      category: category.trim(),
      subject: subject.trim(),
      description: description.trim(),
      reporterName: currentUser.displayName || 'Traveler',
      reporterEmail: reporterEmail.trim(),
      tripId: selectedTripId || undefined,
      tripTitle: relatedTrip?.title || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.ticketId) {
      setSubmittedTicketId(res.ticketId);
      setSubject('');
      setDescription('');
    } else {
      setValidationError(res.error || 'Failed to submit report. Please check your network and try again.');
    }
  };

  const handleResetForm = () => {
    setSubmittedTicketId(null);
    setValidationError('');
    setSubject('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Help & Support Center</h3>
                <p className="text-xs text-slate-300">Verified Emergency Helplines & Issue Reporting Desk</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtabs */}
          <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('report')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'report'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>Report a Website Issue</span>
            </button>
            <button
              onClick={() => setActiveTab('helpline')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'helpline'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Verified Helplines & Contacts</span>
            </button>
          </div>

          <div className="p-6">
            {/* TAB 1: Report Issue */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                {submittedTicketId ? (
                  <div className="p-6 text-center space-y-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Issue Report Submitted Successfully!</h4>
                      <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                        Your report has been logged in our secure audit database. Our support engineering desk will review and investigate this issue.
                      </p>
                      <div className="mt-3 inline-block px-3 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-800">
                        Reference Ticket ID: #{submittedTicketId}
                      </div>
                    </div>
                    <div className="pt-2 flex justify-center gap-3">
                      <button
                        onClick={handleResetForm}
                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        Submit Another Issue
                      </button>
                      <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-3">
                        Encountered a problem or technical issue on Share My Trip? Fill in the details below so our support team can reproduce and resolve it.
                      </p>
                    </div>

                    {validationError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Issue Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                        >
                          {ISSUE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Related Trip <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <select
                          value={selectedTripId}
                          onChange={e => setSelectedTripId(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                        >
                          <option value="">General Platform (No specific trip)</option>
                          {trips.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.title} ({t.origin} → {t.destination})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subject / Brief Summary <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        placeholder="e.g. Join request button unresponsive on trip card"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Detailed Description &amp; Steps to Reproduce <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        minLength={10}
                        placeholder="Describe what happened, what you expected, and any error messages shown..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Please include device or browser details if relevant.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Reporter Name
                        </label>
                        <input
                          type="text"
                          disabled
                          value={currentUser.displayName}
                          className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 text-slate-600 rounded-xl cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contact Email for Updates
                        </label>
                        <input
                          type="email"
                          placeholder="your.email@example.com"
                          value={reporterEmail}
                          onChange={e => setReporterEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting Report…</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Issue Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: Verified Helplines */}
            {activeTab === 'helpline' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  These verified government and emergency helpline numbers are active across India. For platform assistance, use our support contact below.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* National Emergency ERSS */}
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-rose-600" />
                        National Emergency (ERSS)
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded">
                        24x7 Pan-India
                      </span>
                    </div>
                    <p className="text-lg font-black text-rose-800 font-mono">112</p>
                    <p className="text-[11px] text-rose-900/80">
                      Unified emergency number for Police, Fire, and Ambulance services.
                    </p>
                  </div>

                  {/* Highway Emergency Helpline */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                        National Highway Emergency (NHAI)
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                        24x7 Roadside
                      </span>
                    </div>
                    <p className="text-lg font-black text-amber-800 font-mono">1033</p>
                    <p className="text-[11px] text-amber-900/80">
                      Toll-free emergency helpline for assistance on National Highways across India.
                    </p>
                  </div>

                  {/* Women Helpline */}
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-600" />
                        Women Safety Helpline
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-purple-200/80 text-purple-900 px-1.5 py-0.5 rounded">
                        Toll-Free
                      </span>
                    </div>
                    <p className="text-lg font-black text-purple-800 font-mono">1091</p>
                    <p className="text-[11px] text-purple-900/80">
                      Dedicated safety and emergency response assistance for female travelers.
                    </p>
                  </div>

                  {/* Platform Support Desk */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-600" />
                        Platform Support Desk
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        Configurable
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 break-all">{SUPPORT_EMAIL}</p>
                    <p className="text-[11px] text-slate-500">
                      Phone: <span className="font-mono">{SUPPORT_PHONE}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    In life-threatening situations, always call <strong>112</strong> immediately before filing online reports.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Close Support Center
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
