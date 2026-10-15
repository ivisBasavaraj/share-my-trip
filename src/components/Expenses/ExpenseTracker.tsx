import React, { useState, useEffect } from 'react';
import { Trip, Expense } from '../../types';
import { useAuth } from '../../context/useAuth';
import { subscribeToExpenses, addExpense } from '../../services/tripService';
import { 
  Receipt, 
  CreditCard, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  IndianRupee,
  Loader2
} from 'lucide-react';

interface ExpenseTrackerProps {
  trip: Trip;
}

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Homestay & Hotel',
  transport: 'Cab, Fuel & Tolls',
  food: 'Meals & Dhabas',
  activity: 'Passes & Trekking',
  misc: 'Miscellaneous',
};

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ trip }) => {
  const { currentUser, allUsers } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newTitle,    setNewTitle]    = useState('');
  const [newAmount,   setNewAmount]   = useState('');
  const [newCategory, setNewCategory] = useState<Expense['category']>('food');

  // ── Subscribe to real-time Firestore expenses ──
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToExpenses(trip.id, (data) => {
      setExpenses(data);
      setLoading(false);
    });
    // subscribeToExpenses may not call back immediately when offline → stop spinner after 3s
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => { unsub(); clearTimeout(timer); };
  }, [trip.id]);

  // ── Derived totals ──
  const totalSpent   = expenses.reduce((acc, e) => acc + e.amount, 0);
  const memberCount  = trip.memberIds.length || 1;
  const perPersonAvg = totalSpent / memberCount;

  // Who paid how much
  const memberPaidMap: Record<string, number> = {};
  trip.memberIds.forEach(id => { memberPaidMap[id] = 0; });
  expenses.forEach(exp => {
    memberPaidMap[exp.paidBy] = (memberPaidMap[exp.paidBy] || 0) + exp.amount;
  });

  // Resolve display name for a member ID
  const nameFor = (id: string) => {
    if (id === currentUser.id) return `${currentUser.displayName} (You)`;
    return allUsers.find(u => u.id === id)?.displayName || id;
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount) return;

    const expense: Expense = {
      id:       `exp_${Date.now()}`,
      tripId:   trip.id,
      title:    newTitle.trim(),
      amount:   parseFloat(newAmount),
      currency: 'INR',
      paidBy:   currentUser.id,
      payerName: currentUser.displayName,
      category: newCategory,
      splitWith: trip.memberIds,
      date:      new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI
    setExpenses(prev => [expense, ...prev]);

    await addExpense(expense);

    setNewTitle('');
    setNewAmount('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Group Spend</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Budget limit: ₹{trip.budget.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Average Per Traveler</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            ₹{Math.round(perPersonAvg).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Split across {memberCount} partners
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Estimated Savings vs Solo</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
            ₹{Math.round(totalSpent * 0.45).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ~45% saved by sharing transport &amp; lodging
          </div>
        </div>
      </div>

      {/* ── Main Table + Settlement ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Trip Expense Ledger (₹ INR)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated bill splitting — live from Firestore</p>
            </div>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={handleAddExpense} className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-3">
              <div className="font-semibold text-slate-800">Add Shared Trip Expense (₹)</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coorg Coffee Estate Homestay"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="1850"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-slate-600 font-medium mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as Expense['category'])}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="food">Meals &amp; Dhabas</option>
                    <option value="transport">Cab, Fuel &amp; Tolls</option>
                    <option value="accommodation">Homestay &amp; Hotel</option>
                    <option value="activity">Passes &amp; Trekking</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
                >
                  Save &amp; Split
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading expenses from Firestore…</span>
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No expenses logged yet. Be the first to add one!
              </div>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{exp.title}</h4>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="capitalize">{CATEGORY_LABELS[exp.category] || exp.category}</span>
                        <span className="text-slate-300">·</span>
                        <span>Paid by {exp.payerName}</span>
                        <span className="text-slate-300">·</span>
                        <span>{exp.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold font-mono text-slate-900 text-sm tabular-nums">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ₹{Math.round(exp.amount / Math.max(exp.splitWith.length, 1)).toLocaleString('en-IN')} / person
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settlement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Settlement Summary (₹)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Net rupee balances to even out group payments</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(memberPaidMap).map(([memId, paidTotal]) => {
                const diff   = paidTotal - perPersonAvg;
                const isOwed = diff > 0;
                return (
                  <div key={memId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{nameFor(memId)}</div>
                      <div className="text-[11px] text-slate-500">
                        Paid ₹{paidTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className={`text-xs font-bold font-mono tabular-nums ${
                      isOwed ? 'text-emerald-600' : diff === 0 ? 'text-slate-500' : 'text-amber-600'
                    }`}>
                      {isOwed
                        ? `+ gets ₹${Math.round(diff).toLocaleString('en-IN')}`
                        : diff === 0
                        ? 'Settled up'
                        : `- owes ₹${Math.round(Math.abs(diff)).toLocaleString('en-IN')}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              All balances are live from Firestore. Settle via UPI (GPay, PhonePe, Paytm) after your journey.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
