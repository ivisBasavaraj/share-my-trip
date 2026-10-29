import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Trip } from '../../types';
import { dispatchSafetySos } from '../../services/tripService';
import {
  AlertTriangle,
  MapPin,
  Phone,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Radio,
  Siren,
  Clock,
} from 'lucide-react';

interface SosAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrip?: Trip | null;
}

export const SosAlertModal: React.FC<SosAlertModalProps> = ({
  isOpen,
  onClose,
  activeTrip,
}) => {
  const { currentUser } = useAuth();

  const [step, setStep] = useState<'confirm' | 'dispatching' | 'result'>('confirm');
  const [shareLocation, setShareLocation] = useState(true);
  const [customEmergencyContact, setCustomEmergencyContact] = useState(
    currentUser.emergencyContact || '112 (National Emergency)'
  );
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    deliveryConfirmed: boolean;
    alertId?: string;
    message: string;
    timestamp?: string;
    coordinatesIncluded?: boolean;
  } | null>(null);

  // Prevent accidental multiple alerts: 30-second cooldown
  const [lastDispatchedTime, setLastDispatchedTime] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleConfirmSos = async () => {
    // Cooldown check
    if (lastDispatchedTime && Date.now() - lastDispatchedTime < 30000) {
      const waitSeconds = Math.ceil((30000 - (Date.now() - lastDispatchedTime)) / 1000);
      setDispatchResult({
        success: false,
        deliveryConfirmed: false,
        message: `An alert was recently dispatched. To prevent duplicate broadcasts, please wait ${waitSeconds}s before re-sending.`,
      });
      setStep('result');
      return;
    }

    setStep('dispatching');

    let coords: { lat: number | null; lng: number | null; accuracy: number | null } = {
      lat: null,
      lng: null,
      accuracy: null,
    };
    let locationPermission: 'granted' | 'denied' | 'unavailable' = 'denied';

    if (shareLocation && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000,
          });
        });
        coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        locationPermission = 'granted';
      } catch (err: any) {
        console.warn('Geolocation permission denied or timed out:', err);
        locationPermission = err.code === 1 ? 'denied' : 'unavailable';
      }
    }

    try {
      const res = await dispatchSafetySos({
        travelerId: currentUser.id,
        travelerName: currentUser.displayName,
        tripId: activeTrip?.id,
        tripTitle: activeTrip?.title || 'Personal Traveler Workspace',
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        locationPermission,
        emergencyContact: customEmergencyContact.trim() || '112 (National Emergency)',
      });

      setLastDispatchedTime(Date.now());
      setDispatchResult({
        success: res.success,
        deliveryConfirmed: res.deliveryConfirmed,
        alertId: res.alertId,
        message: res.message,
        timestamp: res.timestamp,
        coordinatesIncluded: res.coordinatesIncluded,
      });
    } catch (err: any) {
      setDispatchResult({
        success: false,
        deliveryConfirmed: false,
        message: err?.message || 'Network failure: Emergency alert could not be transmitted to dispatch.',
      });
    } finally {
      setStep('result');
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setDispatchResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-red-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">

          {/* Alert Header Banner */}
          <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center animate-pulse">
                <Siren className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-wide uppercase font-mono">
                  🚨 Emergency SOS Broadcast
                </h3>
                <p className="text-xs text-red-100">
                  {activeTrip ? activeTrip.title : 'Traveler Safety & Rescue Service'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {/* STEP 1: Confirmation Popup */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Confirm Emergency Alert Trigger</span>
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Triggering an Emergency SOS will immediately dispatch your distress signal to platform emergency monitors, broadcast an emergency banner to your trip co-travelers, and log your incident.
                  </p>
                </div>

                {/* Geolocation permission opt-in */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareLocation}
                      onChange={e => setShareLocation(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        Include My Live GPS Coordinates (Recommended)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Your device location is requested only with your explicit permission to help locate you during an emergency.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Emergency / ICE Contact Number
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customEmergencyContact}
                        onChange={e => setCustomEmergencyContact(e.target.value)}
                        placeholder="e.g. +91 98765 43210 or 112"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 font-medium"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    If no personal contact is available, Platform Emergency Services (112) is notified.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel (I am safe)
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSos}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-200 transition-all"
                  >
                    <Siren className="w-4 h-4 animate-bounce" />
                    <span>Confirm SOS Alert</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Dispatching In Progress */}
            {step === 'dispatching' && (
              <div className="py-10 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto" />
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Transmitting Emergency Signal…</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Acquiring coordinates, notifying emergency contacts, and verifying delivery with server…
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: Delivery Confirmation or Failure */}
            {step === 'result' && dispatchResult && (
              <div className="space-y-4">
                {dispatchResult.deliveryConfirmed ? (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2.5 text-emerald-900 font-extrabold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Emergency Alert Confirmed &amp; Dispatched</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {dispatchResult.message}
                    </p>
                    <div className="p-3 bg-white/90 border border-emerald-100 rounded-xl space-y-1 text-[11px] font-mono text-slate-700">
                      <div>
                        <strong>Alert Reference:</strong> {dispatchResult.alertId}
                      </div>
                      <div>
                        <strong>Dispatched At:</strong> {new Date(dispatchResult.timestamp || Date.now()).toLocaleTimeString()}
                      </div>
                      <div>
                        <strong>Location Attached:</strong> {dispatchResult.coordinatesIncluded ? 'Yes (GPS coordinates transmitted)' : 'No (Location permission denied/off)'}
                      </div>
                      <div>
                        <strong>Notified ICE:</strong> {customEmergencyContact}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2.5 text-rose-900 font-extrabold text-sm">
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>SOS Alert Not Delivered</span>
                    </div>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      {dispatchResult.message}
                    </p>
                    <div className="p-3.5 bg-rose-100/70 border border-rose-200 rounded-xl text-xs font-bold text-rose-900">
                      ⚡ Immediate Action: Please dial <span className="text-base underline font-mono">112</span> from your phone directly to connect with National Emergency Services.
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Close Dialog
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
