import React, { useState } from 'react';
import { Trip, Waypoint } from '../../types';
import { useAuth } from '../../context/useAuth';
import { saveWaypoint, deleteWaypoint } from '../../services/tripService';
import { 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  Calendar, 
  GripVertical, 
  Check, 
  Sparkles, 
  Compass,
  ArrowRight
} from 'lucide-react';

interface ItineraryEditorProps {
  trip: Trip;
  waypoints: Waypoint[];
  activeWaypointId?: string;
  onSelectWaypoint: (wp: Waypoint) => void;
  pendingPinCoordinates?: { lat: number; lng: number } | null;
  onClearPendingPin?: () => void;
}

export const ItineraryEditor: React.FC<ItineraryEditorProps> = ({
  trip,
  waypoints,
  activeWaypointId,
  onSelectWaypoint,
  pendingPinCoordinates,
  onClearPendingPin
}) => {
  const { currentUser, isOnline } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New waypoint form state
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDay, setNewDay] = useState<number>(1);
  const [newTime, setNewTime] = useState('10:00 AM');
  const [newNotes, setNewNotes] = useState('');
  const [newCategory, setNewCategory] = useState<'sight' | 'food' | 'stay' | 'activity' | 'transport'>('sight');
  const [customLat, setCustomLat] = useState<number>(12.4208);
  const [customLng, setCustomLng] = useState<number>(75.7382);

  // Automatically update lat/lng when a map pin is dropped
  React.useEffect(() => {
    if (pendingPinCoordinates) {
      setCustomLat(Math.round(pendingPinCoordinates.lat * 10000) / 10000);
      setCustomLng(Math.round(pendingPinCoordinates.lng * 10000) / 10000);
      setNewLocation(`Pinned Location (${pendingPinCoordinates.lat.toFixed(4)}, ${pendingPinCoordinates.lng.toFixed(4)})`);
      setShowAddForm(true);
    }
  }, [pendingPinCoordinates]);

  // Determine available days
  const daysList = Array.from(new Set(waypoints.map(w => w.dayNumber))).sort((a, b) => a - b);
  if (daysList.length === 0) daysList.push(1);

  const filteredWaypoints = selectedDay === 'all' 
    ? waypoints 
    : waypoints.filter(w => w.dayNumber === selectedDay);

  const handleAddWaypoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim()) return;

    const newWp: Waypoint = {
      id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: trip.id,
      dayNumber: Number(newDay),
      title: newTitle.trim(),
      locationName: newLocation.trim(),
      lat: customLat,
      lng: customLng,
      time: newTime,
      notes: newNotes.trim(),
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      orderIndex: waypoints.length,
      category: newCategory,
      createdAt: new Date().toISOString()
    };

    await saveWaypoint(trip.id, newWp);
    onSelectWaypoint(newWp);

    // Reset form
    setNewTitle('');
    setNewLocation('');
    setNewNotes('');
    setShowAddForm(false);
    if (onClearPendingPin) onClearPendingPin();
  };

  const handleDelete = async (wpId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteWaypoint(trip.id, wpId);
  };

  const quickAddSpot = (spotName: string) => {
    setNewTitle(spotName);
    setNewLocation(`${spotName}, ${trip.destination}`);
    setShowAddForm(true);
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ minHeight: '520px', maxHeight: '720px' }}>
      {/* Header with collaboration status */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Trip Itinerary</h2>
            <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
              {waypoints.length} stops
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Collaborating with {trip.memberIds.length} travel partners</span>
            <span className="text-slate-300">·</span>
            <span>{isOnline ? 'Instant Cloud Sync' : 'Offline Cache Active'}</span>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Stop</span>
        </button>
      </div>

      {/* Spots wishlist quick-pin pill strip */}
      {trip.spotsToVisit && trip.spotsToVisit.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50/50 border-b border-amber-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-amber-900 font-semibold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Wishlist:
          </span>
          {trip.spotsToVisit.map((spot, idx) => (
            <button
              key={idx}
              onClick={() => quickAddSpot(spot)}
              className="text-amber-800 hover:text-amber-950 bg-white border border-amber-200/80 px-2.5 py-1 rounded-md text-[11px] shrink-0 font-medium hover:bg-amber-100 transition-colors flex items-center gap-1"
            >
              <span>+ {spot}</span>
            </button>
          ))}
        </div>
      )}

      {/* Day Filter Tabs */}
      <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-white">
        <button
          onClick={() => setSelectedDay('all')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors shrink-0 ${
            selectedDay === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Days
        </button>
        {daysList.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors shrink-0 ${
              selectedDay === d
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Day {d}
          </button>
        ))}
      </div>

      {/* New Waypoint Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleAddWaypoint} className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              New Waypoint Stop
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                if (onClearPendingPin) onClearPendingPin();
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Stop / Activity Title</label>
              <input
                type="text"
                required
                placeholder="e.g. McWay Falls Sunset Lookout"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Location / Landmark Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Julia Pfeiffer Burns State Park"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Day</label>
              <input
                type="number"
                min="1"
                max="30"
                value={newDay}
                onChange={e => setNewDay(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Time</label>
              <input
                type="text"
                placeholder="11:30 AM"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="sight">Sightseeing</option>
                <option value="food">Food & Drink</option>
                <option value="activity">Activity / Trek</option>
                <option value="stay">Lodging</option>
                <option value="transport">Transit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Notes & Tips</label>
            <input
              type="text"
              placeholder="Bring trail shoes and camera filters..."
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 font-mono">
              Coordinates: {customLat.toFixed(4)}, {customLng.toFixed(4)}
            </span>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save to Route</span>
            </button>
          </div>
        </form>
      )}

      {/* Itinerary Waypoints List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredWaypoints.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Compass className="w-8 h-8 text-slate-300 mb-2" />
            <div className="text-sm font-semibold text-slate-600">No waypoints added yet</div>
            <div className="text-xs text-slate-400 max-w-xs mt-1">
              Click the map or click "Add Stop" above to plot your group travel path.
            </div>
          </div>
        ) : (
          filteredWaypoints.map((wp, index) => {
            const isSelected = wp.id === activeWaypointId;
            return (
              <div
                key={wp.id}
                onClick={() => onSelectWaypoint(wp)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                          Day {wp.dayNumber}
                        </span>
                        {wp.time && (
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {wp.time}
                          </span>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400 capitalize">{wp.category || 'Sight'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{wp.title}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{wp.locationName}</span>
                      </p>
                      {wp.notes && (
                        <p className="text-xs text-slate-600 italic mt-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          "{wp.notes}"
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">
                        Added by {wp.authorName || 'Traveler'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(wp.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1"
                    title="Remove waypoint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
