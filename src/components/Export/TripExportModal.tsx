import React, { useState } from 'react';
import { Trip, Waypoint } from '../../types';
import { 
  Printer, 
  Copy, 
  Check, 
  X, 
  Share2, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  Clock, 
  Users,
  Compass
} from 'lucide-react';

interface TripExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  waypoints: Waypoint[];
}

export const TripExportModal: React.FC<TripExportModalProps> = ({
  isOpen,
  onClose,
  trip,
  waypoints
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsAppText = () => {
    const text = [
      `🚗 *${trip.title.toUpperCase()}*`,
      `📍 Destination: ${trip.destination}`,
      `📅 Dates: ${trip.startDate} to ${trip.endDate}`,
      `💰 Estimated Budget: ₹${trip.budget?.toLocaleString('en-IN')}`,
      `👥 Co-Travelers: ${trip.ownerName}`,
      '',
      `🗺️ *ITINERARY STOPS & ROUTE:*`,
      ...waypoints.map((wp, idx) => 
        `Day ${wp.dayNumber || 1} [${wp.time || 'Flexible'}] ${wp.title}\n   📍 ${wp.locationName}\n   📝 ${wp.notes || 'Stop on route'}`
      ),
      '',
      `Created with Smart Ride Sharing Platform — Smart Collaborative Itinerary Sharing`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none">
        {/* Header (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold">Export & Share Travel Itinerary</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Itinerary Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>Smart Ride Sharing Platform Itinerary</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">{trip.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{trip.destination}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Travel Dates</span>
                <span className="font-bold text-slate-800">{trip.startDate} to {trip.endDate}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Budget (Total)</span>
                <span className="font-bold text-slate-800">₹{trip.budget?.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Travel Style</span>
                <span className="font-bold text-slate-800 capitalize">{trip.travelStyle}</span>
              </div>
            </div>
          </div>

          {/* Stops List */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Route Schedule & Stops ({waypoints.length})
            </h2>

            <div className="space-y-3">
              {waypoints.map((wp, idx) => (
                <div key={wp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{wp.title}</h4>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Day {wp.dayNumber} · {wp.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{wp.locationName}</span>
                    </p>
                    {wp.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic bg-white/70 p-1.5 rounded">
                        {wp.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons (Hidden in Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500">
            Share directly with co-travelers via WhatsApp or print as physical travel summary
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsAppText}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied WhatsApp Text!' : 'Copy WhatsApp Plan'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
