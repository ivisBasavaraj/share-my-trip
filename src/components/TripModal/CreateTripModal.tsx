import React, { useState } from 'react';
import { Trip, TravelStyle } from '../../types';
import { useAuth } from '../../context/useAuth';
import { createTrip } from '../../services/tripService';
import { X, Check, MapPin, Calendar, IndianRupee, Users, Car, Clock, Camera, Upload } from 'lucide-react';

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
  const defaultCarPhotos = [
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
  ];

  const [vehicle,        setVehicle]        = useState('Car');
  const [vehicleModel,   setVehicleModel]   = useState(currentUser.vehicleModel || 'Toyota Innova Crysta');
  const [vehicleNumber,  setVehicleNumber]  = useState(currentUser.vehicleNumber || '');
  const [carPhotos,      setCarPhotos]      = useState<string[]>(
    currentUser.carPhotos && currentUser.carPhotos.length >= 4 ? currentUser.carPhotos : defaultCarPhotos
  );
  const [totalSeats,     setTotalSeats]     = useState('4');
  const [costPerPerson,  setCostPerPerson]  = useState('');
  const [travelStyle,    setTravelStyle]    = useState<TravelStyle>('adventure');
  const [spotsInput,     setSpotsInput]     = useState('');
  const [notes,          setNotes]          = useState('');
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  const isDriver = currentUser.role === 'driver';

  const handleModalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      let finalUrl = dataUrl;
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.url) finalUrl = resData.url;
        }
      } catch (_) {}
      setCarPhotos(prev => {
        const next = [...prev];
        next[index] = finalUrl;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDriver) return;
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
      vehicleModel:    vehicleModel.trim() || 'Toyota Innova Crysta',
      vehicleNumber:   vehicleNumber.trim().toUpperCase() || undefined,
      carPhotos:       carPhotos,
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
    setEndDate(''); setVehicle('Car'); setVehicleNumber(''); setTotalSeats('4'); setCostPerPerson('');
    setSpotsInput(''); setNotes('');
  };

  const ic = 'w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm bg-white';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-orange-100 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">Create a New Trip</h2>

        {!isDriver && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <X className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-bold">Driver Access Only</p>
              <p className="mt-0.5">
                Offering a ride is restricted to registered Drivers. Your account is currently signed in as a Passenger.
              </p>
            </div>
          </div>
        )}

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

          {/* Vehicle Mode + Total Seats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Car className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Vehicle Category <span className="text-red-500">*</span>
              </label>
              <select value={vehicle} onChange={e => setVehicle(e.target.value)} className={ic}>
                {TRAVEL_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Users className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Total Passenger Seats <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" max="50" step="1" required placeholder="4"
                value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className={ic} />
            </div>
          </div>

          {/* Vehicle Model & Plate Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Car className="inline w-3.5 h-3.5 text-orange-400 mr-1" />Car Model &amp; Make <span className="text-red-500">*</span>
              </label>
              <input type="text" required placeholder="e.g. Toyota Innova Crysta / Ertiga"
                value={vehicleModel} onChange={e => setVehicleModel(e.target.value)}
                className={ic} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                <Car className="inline w-3.5 h-3.5 text-orange-400 mr-1" />License Plate Number <span className="text-red-500">*</span>
              </label>
              <input type="text" required placeholder="e.g. KA-04-MB-4521"
                value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)}
                className={`${ic} font-mono uppercase`} />
            </div>
          </div>

          {/* 4 Car Photos Inspection Requirement */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-700">
                <Camera className="inline w-3.5 h-3.5 text-orange-500 mr-1" />Car Inspection Photos (4 Required)
              </label>
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                Verified Standard
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">
              Photos from your garage are pre-filled below. Hover and click "Replace" if you want to upload a new angle photo for this ride.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {['1. Front Exterior', '2. Side Profile', '3. Rear Trunk', '4. Interior Seats'].map((angle, i) => (
                <div key={i} className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 p-1.5 space-y-1">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-200 relative group">
                    <img src={carPhotos[i]} alt={angle} className="w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[10px] font-bold">
                      <Upload className="w-3.5 h-3.5 mb-0.5" />
                      <span>Replace</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleModalPhotoUpload(e, i)} />
                    </label>
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 truncate text-center">{angle}</p>
                </div>
              ))}
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
            <button type="submit" disabled={isSubmitting || !isDriver}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-sm cursor-pointer disabled:cursor-not-allowed">
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Publishing…' : 'Publish Trip'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
