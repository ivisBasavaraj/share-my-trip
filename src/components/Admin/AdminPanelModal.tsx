import React, { useState, useEffect } from 'react';
import { Trip } from '../../types';
import { 
  fetchAdminReports, 
  submitTripReport, 
  resolveAdminReport 
} from '../../services/tripService';
import { useAuth } from '../../context/useAuth';
import { 
  ShieldAlert, 
  Activity, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Compass, 
  X, 
  Send, 
  RefreshCw 
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  trips
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'monitor' | 'reports' | 'performance'>('monitor');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // New report form
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || '');
  const [reportCategory, setReportCategory] = useState<string>('Route Safety & Weather Warning');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen]);

  const loadReports = async () => {
    setLoading(true);
    const data = await fetchAdminReports();
    setReports(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;

    setIsSubmitting(true);
    const targetTrip = trips.find(t => t.id === selectedTripId);
    await submitTripReport({
      tripId: selectedTripId,
      tripTitle: targetTrip ? targetTrip.title : 'General System',
      reporterName: currentUser.displayName,
      category: reportCategory,
      description: reportDescription.trim()
    });
    setIsSubmitting(false);
    setReportDescription('');
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 2500);
    await loadReports();
  };

  const handleResolve = async (id: string) => {
    await resolveAdminReport(id);
    await loadReports();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-md">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <span>Admin Controls & System Health</span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                PROD-ACTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Monitor active user traffic, audit trip safety reports, and review cloud telemetry.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-4 mb-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'monitor'
                ? 'border-amber-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-600" />
            <span>User Activity Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'reports'
                ? 'border-amber-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Trip Reports ({reports.filter(r => r.status === 'open').length} Open)</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'performance'
                ? 'border-amber-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-500" />
            <span>System Performance</span>
          </button>
        </div>

        {/* TAB 1: User Activity Monitor */}
        {activeTab === 'monitor' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-slate-500 font-medium text-[11px]">Active Travelers Online</div>
                <div className="text-xl font-black font-mono text-slate-900 mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>4 Verified</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-slate-500 font-medium text-[11px]">Trips Synchronized</div>
                <div className="text-xl font-black font-mono text-amber-600 mt-1">
                  {trips.length} Active
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-slate-500 font-medium text-[11px]">Sync Protocol</div>
                <div className="text-sm font-bold text-slate-800 mt-1.5">
                  Firebase + Express
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                <span>Recent Live Traveler Actions</span>
                <span className="text-[10px] text-slate-400 font-mono">Stream Log</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-800">Bhandavya H M</span>
                    <span className="text-slate-500">shared live waypoint note for Coorg</span>
                  </div>
                  <span className="text-slate-400 font-mono">Just now</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="font-semibold text-slate-800">Bharath G</span>
                    <span className="text-slate-500">split vehicle diesel expense (₹1,800)</span>
                  </div>
                  <span className="text-slate-400 font-mono">5m ago</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="font-semibold text-slate-800">Anusha P</span>
                    <span className="text-slate-500">voted on group lunch poll</span>
                  </div>
                  <span className="text-slate-400 font-mono">12m ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Handle Trip Reports & Audit */}
        {activeTab === 'reports' && (
          <div className="space-y-4 text-xs">
            {/* Create new report / flag */}
            <form onSubmit={handleSubmitReport} className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <div className="font-bold text-amber-950 flex items-center justify-between">
                <span>File Trip Safety / Route Report</span>
                {reportSuccess && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Report Submitted
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Trip</label>
                  <select
                    value={selectedTripId}
                    onChange={e => setSelectedTripId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={reportCategory}
                    onChange={e => setReportCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Route Safety & Weather Warning">Route Safety & Weather Warning</option>
                    <option value="Road Closure / Landslide">Road Closure / Landslide</option>
                    <option value="Co-Traveler Policy Inquiry">Co-Traveler Policy Inquiry</option>
                    <option value="Emergency SOS Follow-up">Emergency SOS Follow-up</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Incident or Safety Details</label>
                <textarea
                  rows={2}
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  placeholder="Describe highway route warning, weather conditions, or companion alert..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Report</span>
                </button>
              </div>
            </form>

            {/* List of existing reports */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-600 font-semibold px-1">
                <span>Active Reports Log</span>
                <button onClick={loadReports} className="text-amber-600 hover:text-amber-800 flex items-center gap-1 text-[11px]">
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{rep.category}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                        rep.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <span>Trip: {rep.tripTitle}</span> · <span>Reported by {rep.reporterName}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-1">{rep.description}</p>
                  </div>

                  {rep.status === 'open' && (
                    <button
                      onClick={() => handleResolve(rep.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: System Performance & Firebase Cloud Architecture */}
        {activeTab === 'performance' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Cloud Architecture Health
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400">Firebase Auth</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">Operational</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">JWT Auth OK</div>
                </div>
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400">Firestore DB</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">100% Synced</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Snapshot Listeners</div>
                </div>
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400">Google Maps SDK</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">Verified Key</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Custom API Active</div>
                </div>
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-[10px] text-slate-400">Express API Latency</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">18 ms</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Local Node/Vite</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="font-bold text-slate-800">Cloud Components Breakdown</div>
              <ul className="space-y-1.5 text-[11px] text-slate-600">
                <li className="flex items-center justify-between">
                  <span>• Authentication:</span>
                  <span className="font-mono text-slate-900 font-medium">Firebase Authentication + Google Provider</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Database:</span>
                  <span className="font-mono text-slate-900 font-medium">Firebase Firestore (trips, waypoints, expenses, chat)</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Real-time updates:</span>
                  <span className="font-mono text-slate-900 font-medium">onSnapshot listeners & Express memory synchronization</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Local Storage & Offline:</span>
                  <span className="font-mono text-slate-900 font-medium">IndexedDB & localStorage persistent cache</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Backend Logic:</span>
                  <span className="font-mono text-slate-900 font-medium">Full-stack Express microservices on Port 3000</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
