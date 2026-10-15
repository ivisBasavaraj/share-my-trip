import React, { useState } from 'react';
import { Trip, TravelStyle } from '../../types';
import { useAuth } from '../../context/useAuth';
import { createTrip } from '../../services/tripService';
import { X, Check, MapPin, Calendar, IndianRupee, Users, Car, Clock } from 'lucide-react';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: Trip) => void;
}

const TRAVEL_MODES = ['Car', 'Van', 'Bus', 'Train', 'Bike', 'Other'];

export const CreateTripModal: React.FC<CreateTripModalProps> = ({ isOpen, onClose, onTripCreated }) => {
  const { currentUser } = useAuth();

  const [title,          setTitle]          = useState('');
  const [origin,         setOrigin]         = useState('');
  const [destination,    setDestination]    = useState('');
  const [departureTime,  setDepartureTime]  = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [vehicle,        setVehicle]        = useState('Car');
  const [totalSeats,     setTotalSeats]     = useState('4');
  const [costPerPerson,  setCostPerPerson]  = useState('');
  const [travelStyle,    setTravelStyle]    = useState<TravelStyle>('adventure');
  const [spotsInput,     setSpotsInput]     = useState('');
  const [notes,          setNotes]          = useState('');
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim() || !origin.trim()) return;

    setIsSubmitting(true);
    const tripId = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startDate = departureTime ? departureTime.split('T')[0] : new Date().toISOString().split('T')[0];
    const seatsNum   = parseInt(totalSeats, 10)  || 4;
    const costNum    = parseFloat(costPerPerson)  || 0;

    const newTrip: Trip = {
      id:              tripId,
      title:           title.trim(),
      destination:     destination.trim(),
      origin:          origin.trim(),
      startDate,
      endDate:         endDate || startDate,
      budget:          costNum * seatsNum,
      currency:        'INR',
      travelStyle,
      ownerId:         currentUser.id,
      ownerName:       currentUser.displayName,
      ownerAvatar:     currentUser.photoURL,
      memberIds:       [currentUser.id],
      spotsToVisit:    spotsInput.split(',').map(s => s.trim()).filter(Boolean),
      status:          'planning',
      coverImage:      '/src/assets/images/hero_travel_journey_1791735781773.jpg',
      encryptionKeyId: `e2ee_${Date.now()}`,
      createdAt:       new Date().toISOString(),
      // ── Ride-sharing fields ──
      vehicle,
      totalSeats:      seatsNum,
      costPerPerson:   costNum,
      departureTime,
      notes:           notes.trim() || undefined,
      itinerary: [{
        id:           `wp_init_${Date.now()}`,
        tripId,
        dayNumber:    1,
        title:        `Depart from ${origin.trim()}`,
        locationName: origin.trim(),
        lat:          12.9716,
        lng:          77.5946,
        time:         departureTime ? departureTime.split('T')[1]?.slice(0, 5) : '09:00',
        notes:        notes.trim() || undefined,
        authorId:     currentUser.id,
        authorName:   currentUser.displayName,
        orderIndex:   0,
        category:     'transport',
        createdAt:    new Date().toISOString(),
      }],
    };

    await createTrip(newTrip);
    setIsSubmitting(false);
    onTripCreated(newTrip);
    onClose();

    // reset
    setTitle(''); setOrigin(''); setDestination(''); setDepartureTime('');
    setEndDate(''); setVehicle('Car'); setTotalSeats('4'); setCostPerPerson('');
    setSpotsInput(''); setNotes('');
  };

  const ic = 'w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm bg-white';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl border border-orange-100 relative my-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">Create a New Trip</h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Trip Title <span className="text-red-500">*</span></label>
            <input type="text" required placeholder="e.g. Bengaluru to Coorg Weekend Escape"
              value={title} onChange={e => setTitle(e.target.value)} className={ic} />
          </div>

          {/* Origin + Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <MapPin className="inline w-3.5 h-3.5 text-orange-500 mr-1" />Start Location <span className="text-red-500">*</span>
              </label>
              <input type="text" required placeholder="e.g. Bengaluru, Karnataka"
                value={origin} onChange={e => setOrigin(e.target.value)} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <MapPin className="inline w-3.5 h-3.5 text-rose-500 mr-1" />Destination <span className="text-red-500">*</span>
              </label>
              <input type="text" required placeholder="e.g. Coorg, Karnataka"
                value={destination} onChange={e => setDestination(e.target.value)} className={ic} />
            </div>
          </div>

          {/* Departure Date-Time + Return Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Clock className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Departure Date &amp; Time <span className="text-red-500">*</span>
              </label>
              <input type="datetime-local" required value={departureTime}
                onChange={e => setDepartureTime(e.target.value)} className={ic} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Calendar className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Return / End Date
              </label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={ic} />
            </div>
          </div>

          {/* Vehicle + Total Seats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Car className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Vehicle / Mode <span className="text-red-500">*</span>
              </label>
              <select value={vehicle} onChange={e => setVehicle(e.target.value)} className={ic}>
                {TRAVEL_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Users className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Total Seats <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" max="50" step="1" required placeholder="4"
                value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className={ic} />
            </div>
          </div>

          {/* Cost per Person */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              <IndianRupee className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Cost per Person (₹) <span className="text-red-500">*</span>
            </label>
            <input type="number" min="0" step="1" required placeholder="500"
              value={costPerPerson} onChange={e => setCostPerPerson(e.target.value)} className={`${ic} font-mono`} />
            {costPerPerson && totalSeats && (
              <p className="text-xs text-orange-600 mt-1 font-medium">
                Total trip value: ₹{(parseFloat(costPerPerson) * parseInt(totalSeats, 10)).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Travel Style */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Travel Style</label>
            <select value={travelStyle} onChange={e => setTravelStyle(e.target.value as TravelStyle)} className={ic}>
              <option value="adventure">Adventure & Outdoors</option>
              <option value="cultural">Culture & Heritage</option>
              <option value="relaxed">Relaxed Road Trip</option>
              <option value="budget">Budget Backpacker</option>
              <option value="luxury">Luxury & Boutique</option>
              <option value="nature">Nature & Wildlife</option>
              <option value="foodie">Foodie Trail</option>
            </select>
          </div>

          {/* Key Spots */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Key Spots (comma separated)</label>
            <input type="text" placeholder="Raja's Seat, Abbey Falls, Banasura Dam"
              value={spotsInput} onChange={e => setSpotsInput(e.target.value)} className={ic} />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Additional Notes</label>
            <textarea rows={3}
              placeholder="e.g. Luggage limit 10kg, pickup from Metro Gate 2, WhatsApp group link..."
              value={notes} onChange={e => setNotes(e.target.value)}
              className={`${ic} resize-none`} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-60 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-sm">
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Publishing…' : 'Publish Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
