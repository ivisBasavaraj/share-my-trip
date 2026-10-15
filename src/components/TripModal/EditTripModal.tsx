import React, { useState, useEffect } from 'react';
import { Trip, TravelStyle } from '../../types';
import { updateTrip, deleteTrip } from '../../services/tripService';
import { 
  Edit3, 
  Trash2, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  X, 
  Check, 
  AlertCircle 
} from 'lucide-react';

interface EditTripModalProps {
  isOpen: boolean;
  trip: Trip;
  onClose: () => void;
  onTripUpdated: (updatedTrip: Trip) => void;
  onTripDeleted: (tripId: string) => void;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  isOpen,
  trip,
  onClose,
  onTripUpdated,
  onTripDeleted
}) => {
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [origin, setOrigin] = useState(trip.origin || 'Bengaluru, Karnataka');
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [budget, setBudget] = useState(trip.budget.toString());
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(trip.travelStyle);
  const [status, setStatus] = useState<Trip['status']>(trip.status);
  const [spotsInput, setSpotsInput] = useState(trip.spotsToVisit.join(', '));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTitle(trip.title);
    setDestination(trip.destination);
    setOrigin(trip.origin || 'Bengaluru, Karnataka');
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setBudget(trip.budget.toString());
    setTravelStyle(trip.travelStyle);
    setStatus(trip.status);
    setSpotsInput(trip.spotsToVisit.join(', '));
    setShowDeleteConfirm(false);
  }, [trip]);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim()) return;

    setIsSubmitting(true);
    const spotsList = spotsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updated: Trip = {
      ...trip,
      title: title.trim(),
      destination: destination.trim(),
      origin: origin.trim(),
      startDate,
      endDate,
      budget: parseFloat(budget) || trip.budget,
      travelStyle,
      status,
      spotsToVisit: spotsList
    };

    await updateTrip(updated);
    setIsSubmitting(false);
    onTripUpdated(updated);
    onClose();
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await deleteTrip(trip.id);
    setIsSubmitting(false);
    onTripDeleted(trip.id);
    onClose();
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

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Edit Trip Details</h3>
            <p className="text-xs text-slate-500">Update destination, dates, budget or archive trip</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Trip Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Origin City</label>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Budget (₹)</label>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Travel Style</label>
              <select
                value={travelStyle}
                onChange={e => setTravelStyle(e.target.value as TravelStyle)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 capitalize"
              >
                <option value="adventure">Adventure</option>
                <option value="relaxed">Relaxed</option>
                <option value="cultural">Cultural</option>
                <option value="budget">Budget</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Trip['status'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 capitalize"
              >
                <option value="planning">Planning</option>
                <option value="active">Active / Ongoing</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Key Spots to Visit (comma separated)
            </label>
            <input
              type="text"
              value={spotsInput}
              onChange={e => setSpotsInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
            />
          </div>

          {/* Delete Danger Zone */}
          {showDeleteConfirm ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Confirm Trip Deletion?</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                This will delete "{trip.title}" and its itinerary for all members. This cannot be undone.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors shadow-2xs"
                >
                  Yes, Delete Trip
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Trip</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}
        </form>
        </div>
      </div>
    </div>
  );
};
