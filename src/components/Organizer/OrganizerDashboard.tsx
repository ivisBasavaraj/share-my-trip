import React, { useEffect, useMemo, useState } from 'react';
import { Car, Check, Edit3, IndianRupee, Loader2, Users, WalletCards, X } from 'lucide-react';
import { Trip, Expense } from '../../types';
import { subscribeToExpenses, updateTrip } from '../../services/tripService';

interface OrganizerDashboardProps {
  trip: Trip;
  onTripUpdated: (trip: Trip) => void;
}

const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ trip, onTripUpdated }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [vehicle, setVehicle] = useState(trip.vehicle || 'Vehicle details pending');
  const [seats, setSeats] = useState(String(trip.totalSeats || 1));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVehicle(trip.vehicle || 'Vehicle details pending');
    setSeats(String(trip.totalSeats || Math.max(1, trip.memberIds?.length || 1)));
  }, [trip]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToExpenses(trip.id, items => { setExpenses(items); setLoading(false); });
    const timer = window.setTimeout(() => setLoading(false), 2500);
    return () => { unsubscribe(); window.clearTimeout(timer); };
  }, [trip.id]);

  const passengerIds = useMemo(() => Array.from(new Set([trip.ownerId, ...(trip.memberIds || [])].filter(Boolean))), [trip.ownerId, trip.memberIds]);
  const passengers = Math.max(passengerIds.length, 1);
  const totalSpent = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const availableSeats = Math.max(0, (trip.totalSeats || passengers) - passengers);
  const equalShare = totalSpent / passengers;
  const budgetRemaining = trip.budget - totalSpent;

  const cancelEdit = () => {
    setVehicle(trip.vehicle || 'Vehicle details pending');
    setSeats(String(trip.totalSeats || passengers));
    setError('');
    setEditing(false);
  };

  const saveVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    const seatCount = Number(seats);
    if (!vehicle.trim()) { setError('Add a vehicle name or details.'); return; }
    if (!Number.isInteger(seatCount) || seatCount < passengers) {
      setError(`Seats must be a whole number and cannot be below the ${passengers} confirmed passengers.`);
      return;
    }
    setSaving(true);
    const updated = { ...trip, vehicle: vehicle.trim(), totalSeats: seatCount, updatedAt: new Date().toISOString() };
    await updateTrip(updated);
    onTripUpdated(updated);
    setSaving(false);
    setEditing(false);
  };

  const metrics = [
    { label: 'Confirmed passengers', value: String(passengers), detail: 'Host included', icon: Users, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Available seats', value: String(availableSeats), detail: `${trip.totalSeats || passengers} total capacity`, icon: Car, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Total spent', value: loading ? '—' : rupees(totalSpent), detail: `of ${rupees(trip.budget)} budget`, icon: WalletCards, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Equal split', value: loading ? '—' : rupees(equalShare), detail: 'per active passenger', icon: IndianRupee, tone: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">Host workspace</p>
          <h2 className="mt-1 text-lg font-bold text-white">Trip operations</h2>
          <p className="mt-0.5 text-xs text-slate-300">Capacity, vehicle and live group finances for {trip.title}</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${budgetRemaining >= 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> {budgetRemaining >= 0 ? `${rupees(budgetRemaining)} budget left` : `${rupees(Math.abs(budgetRemaining))} over budget`}
        </span>
      </header>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
            <div key={label} className="border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span><span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}><Icon className="h-3.5 w-3.5" /></span></div>
              <p className="mt-3 font-mono text-xl font-bold tabular-nums text-slate-900">{value}</p>
              <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Car className="h-4 w-4 text-orange-500" />Vehicle & capacity</h3><p className="mt-1 text-xs text-slate-500">Keep seats accurate so travelers only see space that can be confirmed.</p></div>
              {!editing && <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-800"><Edit3 className="h-3.5 w-3.5" /> Edit</button>}
            </div>
            {editing ? (
              <form onSubmit={saveVehicle} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_130px]"><label className="text-xs font-semibold text-slate-700">Vehicle details<input aria-label="Vehicle details" value={vehicle} onChange={e => setVehicle(e.target.value)} className="mt-1.5 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="e.g. Toyota Innova · KA 01 AB 1234" /></label><label className="text-xs font-semibold text-slate-700">Total seats<input aria-label="Total seats" type="number" min={passengers} step="1" value={seats} onChange={e => setSeats(e.target.value)} className="mt-1.5 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label></div>
                {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
                <div className="flex justify-end gap-2"><button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"><X className="h-3.5 w-3.5" /> Cancel</button><button disabled={saving} className="inline-flex items-center gap-1 bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60"><Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save vehicle'}</button></div>
              </form>
            ) : (
              <div className="mt-4 flex items-center gap-4"><div className="grid h-12 w-12 place-items-center bg-orange-50 text-orange-600"><Car className="h-6 w-6" /></div><div><p className="font-semibold text-slate-900">{trip.vehicle || 'Vehicle details pending'}</p><p className="mt-0.5 text-xs text-slate-500">{passengers} confirmed · {availableSeats} seats remaining</p></div></div>
            )}
          </div>
          <div className="border border-slate-200 p-4"><h3 className="text-sm font-bold text-slate-900">Seat capacity</h3><div className="mt-4 h-3 w-full overflow-hidden bg-slate-100"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (passengers / Math.max(trip.totalSeats || passengers, 1)) * 100)}%` }} /></div><div className="mt-3 flex justify-between text-xs"><span className="font-semibold text-slate-700">{passengers} occupied</span><span className="text-slate-500">{trip.totalSeats || passengers} seats</span></div><p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Expense split is based on confirmed passengers, including the host—not vehicle capacity.</p></div>
        </div>
      </div>
    </section>
  );
};
