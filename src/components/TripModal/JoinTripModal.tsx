import React, { useState } from 'react';
import { Trip } from '../../types';
import { useAuth } from '../../context/useAuth';
import { sendCompanionRequestApi } from '../../services/tripService';
import { CheckCircle2, AlertCircle, Loader2, Car, Users, Clock } from 'lucide-react';

interface JoinTripModalProps {
  trip: Trip;
  onClose: () => void;
  onJoined: (trip: Trip) => void;
}

type Step = 'details' | 'payment' | 'success';

const ID_TYPES = ['Aadhaar Card', 'PAN Card', 'Voter ID', 'Passport', 'Driving License'];
const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'cash'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

export const JoinTripModal: React.FC<JoinTripModalProps> = ({ trip, onClose, onJoined }) => {
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — traveler details
  const [fullName, setFullName] = useState(currentUser.displayName);
  const [address,  setAddress]  = useState('');
  const [age,      setAge]      = useState('');
  const [gender,   setGender]   = useState('');
  const [idType,   setIdType]   = useState('');
  const [idLast4,  setIdLast4]  = useState('');

  // Step 2 — payment
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [upiId,     setUpiId]     = useState('');
  const [cardName,  setCardName]  = useState('');
  const [cardNum,   setCardNum]   = useState('');
  const [cardExp,   setCardExp]   = useState('');
  const [cardCvv,   setCardCvv]   = useState('');
  const [bankName,  setBankName]  = useState('');

  const costNote = trip.itinerary?.[0]?.notes || '';
  const costMatch = costNote.match(/Cost\/person: ₹([\d,]+)/);
  const costPerPerson = trip.costPerPerson
    ? trip.costPerPerson.toLocaleString('en-IN')
    : costMatch ? costMatch[1] : '—';
  const availableSeats = trip.totalSeats != null
    ? Math.max(0, trip.totalSeats - trip.memberIds.length)
    : null;
  const isFull = availableSeats !== null && availableSeats <= 0;

  const ic = 'w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm bg-white mt-1';

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFull) {
      setError('Cannot join: All seats on this trip are occupied.');
      return;
    }
    if (!fullName || !address || !age || !gender || !idType || idLast4.length !== 4) {
      setError('Please fill in all required fields correctly.');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handlePaymentConfirm = async () => {
    if (isFull) {
      setError('Cannot join: This trip is at full capacity.');
      return;
    }
    if (payMethod === 'upi' && !upiId.trim())        { setError('Please enter your UPI ID.'); return; }
    if (payMethod === 'card' && (!cardName || !cardNum || !cardExp || !cardCvv)) { setError('Please fill all card details.'); return; }
    if (payMethod === 'netbanking' && !bankName)      { setError('Please select your bank.'); return; }
    setError('');
    setIsLoading(true);

    try {
      const joinMsg = `Hi ${trip.ownerName}! I would like to join this trip. Details: ${fullName}, ${age}y/o ${gender}, ID proof (${idType}) ending in ${idLast4}. Payment mode: ${payMethod.toUpperCase()}.`;
      const res = await sendCompanionRequestApi({
        tripId: trip.id,
        tripTitle: trip.title,
        requesterId: currentUser.id,
        requesterName: fullName || currentUser.displayName,
        requesterAvatar: currentUser.photoURL,
        targetUserId: trip.ownerId,
        tripOwnerId: trip.ownerId,
        message: joinMsg,
        compatibilityScore: 85,
        requesterProfile: {
          bio: `${age} y/o ${gender} from ${address.slice(0, 40)}. ID: ${idType} (*${idLast4}).`,
          travelStyle: currentUser.travelStyle,
          verificationStatus: 'verified',
        }
      });

      if (!res.success) {
        setError(res.error || 'Failed to submit join request.');
        return;
      }
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Failed to join trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">

        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-sky-800">
              {step === 'success' ? 'Request Submitted! ⏳' : 'Join Trip — Your Details'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'details' ? 'Please provide your details before requesting to join this trip.' :
               step === 'payment' ? 'Review trip info and select your payment preference.' :
               'Your request has been forwarded to the trip host.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-1">×</button>
        </div>

        <div className="p-6">

          {/* ── STEP 1: DETAILS ── */}
          {step === 'details' && (
            <>
              {/* Trip summary */}
              <div className="bg-sky-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-500 mb-1">Trip</p>
                <p className="font-bold text-lg text-sky-800">{trip.origin} → {trip.destination}</p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div><p className="text-xs text-gray-400">Date</p><p className="font-medium text-gray-800">{trip.startDate}</p></div>
                  <div><p className="text-xs text-gray-400">Cost / person</p><p className="font-medium text-emerald-700">₹{costPerPerson}</p></div>
                  {trip.vehicle && (
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-sky-500" />
                      <div>
                        <p className="text-xs text-gray-400">Vehicle</p>
                        <p className="font-medium text-gray-800">
                          {trip.vehicle}{trip.vehicleNumber ? ` · ${trip.vehicleNumber}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  {trip.totalSeats != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-500" />
                      <div>
                        <p className="text-xs text-gray-400">Seats</p>
                        <p className={`font-medium ${isFull ? 'text-red-600' : 'text-gray-800'}`}>
                          {availableSeats} available / {trip.totalSeats} total
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isFull && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>All seats on this trip are occupied. You cannot request to join at this time.</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                </div>
              )}

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name" className={ic} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
                  <textarea required rows={3} value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="Enter your address" className={`${ic} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Age <span className="text-red-500">*</span></label>
                    <input type="number" required min="13" max="120" value={age}
                      onChange={e => setAge(e.target.value)} placeholder="Age" className={ic} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Gender <span className="text-red-500">*</span></label>
                    <select required value={gender} onChange={e => setGender(e.target.value)} className={ic}>
                      <option value="">Select Gender</option>
                      <option>Male</option><option>Female</option>
                      <option>Other</option><option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Verified ID Proof Type <span className="text-red-500">*</span></label>
                  <select required value={idType} onChange={e => setIdType(e.target.value)} className={ic}>
                    <option value="">Select ID Type</option>
                    {ID_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">ID Number (Last 4 digits) <span className="text-red-500">*</span></label>
                  <input type="text" required maxLength={4} minLength={4} pattern="[0-9]{4}" inputMode="numeric"
                    value={idLast4} onChange={e => setIdLast4(e.target.value)} placeholder="e.g. 4521" className={ic} />
                  <p className="text-[11px] text-gray-400 mt-1">For privacy, only the last 4 digits are shared with host.</p>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button type="submit" disabled={isFull}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors">
                    Continue to Payment Preference →
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── STEP 2: PAYMENT PREFERENCE ── */}
          {step === 'payment' && (
            <div className="space-y-5">
              {/* Host contact */}
              <div className="border rounded-xl p-4 bg-gray-50">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">Host Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {trip.ownerName}</p>
                  <p><strong>Email:</strong> {trip.ownerId}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Verified Host. Identity credentials vetted by platform.</p>
              </div>

              {/* Trip details */}
              <div className="border rounded-xl p-4 bg-sky-50">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">Trip Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>From:</strong> {trip.origin}</p>
                  <p><strong>To:</strong> {trip.destination}</p>
                  <p><strong>Date:</strong> {trip.startDate}</p>
                  {trip.vehicle && <p><strong>Vehicle:</strong> {trip.vehicle}{trip.vehicleNumber ? ` · ${trip.vehicleNumber}` : ''}</p>}
                  {trip.totalSeats != null && (
                    <p>
                      <strong>Seats:</strong>{' '}
                      <span className={isFull ? 'text-red-600 font-bold' : 'text-gray-800'}>
                        {availableSeats} available / {trip.totalSeats} total
                      </span>
                    </p>
                  )}
                  <p><strong>Amount:</strong> <span className="text-emerald-700 font-bold">₹{costPerPerson}</span></p>
                </div>
              </div>

              {/* Payment method */}
              <div className="border rounded-xl p-4">
                <h4 className="font-bold text-gray-700 mb-3 text-sm">Select Payment Preference</h4>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="payMethod" value={m}
                        checked={payMethod === m} onChange={() => setPayMethod(m)} />
                      <span className="text-sm capitalize">{m === 'upi' ? 'UPI' : m === 'netbanking' ? 'Net Banking' : m === 'cash' ? 'Cash / Pay on Departure' : 'Debit / Credit Card'}</span>
                    </label>
                  ))}
                </div>

                {payMethod === 'upi' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                    <input type="text" placeholder="example@upi" value={upiId} onChange={e => setUpiId(e.target.value)} className={ic} />
                  </div>
                )}
                {payMethod === 'card' && (
                  <div className="mt-3 space-y-3">
                    <input type="text" placeholder="Cardholder Name"    value={cardName} onChange={e => setCardName(e.target.value)} className={ic} />
                    <input type="text" placeholder="Card Number"        value={cardNum}  onChange={e => setCardNum(e.target.value)}  className={ic} maxLength={19} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="MM/YY"            value={cardExp}  onChange={e => setCardExp(e.target.value)}  className={ic} />
                      <input type="password" placeholder="CVV"          value={cardCvv}  onChange={e => setCardCvv(e.target.value)}  className={ic} maxLength={4} />
                    </div>
                  </div>
                )}
                {payMethod === 'netbanking' && (
                  <div className="mt-3">
                    <select value={bankName} onChange={e => setBankName(e.target.value)} className={ic}>
                      <option value="">Select Bank</option>
                      {['SBI','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra','Other'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                )}
                {payMethod === 'cash' && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-gray-700">
                    Payment will be made directly to the host upon boarding.
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button onClick={() => setStep('details')} className="text-sm font-medium text-gray-500 hover:text-gray-700">← Back</button>
                <button onClick={handlePaymentConfirm} disabled={isLoading || isFull}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-colors">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  Submit Join Request to Host
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: SUCCESS ── */}
          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Join Request Sent to Host!</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                Your request has been received by <strong>{trip.ownerName}</strong>. As soon as the host accepts your request, this trip will appear in your <strong>Joined Trips</strong> dashboard.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 max-w-sm mx-auto">
                Once approved, you'll be able to access the group channel, itinerary, and live trip map.
              </div>
              <button onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-sm transition-colors">
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
