import React, { useState, useEffect } from 'react';
import { Trip, PackingItem } from '../../types';
import { useAuth } from '../../context/useAuth';
import { 
  subscribeToPackingItems,
  addPackingItem, 
  togglePackingItem, 
  assignPackingItem, 
  deletePackingItem 
} from '../../services/tripService';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Package, 
  ShieldAlert, 
  Zap, 
  Shirt, 
  Utensils, 
  FileText,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  Users
} from 'lucide-react';

interface PackingChecklistProps {
  trip: Trip;
}

export const PackingChecklist: React.FC<PackingChecklistProps> = ({ trip }) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<PackingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMyItems, setFilterMyItems] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // New Item State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<PackingItem['category']>('essentials');
  const [newItemAssignee, setNewItemAssignee] = useState<string>(currentUser.displayName);

  useEffect(() => {
    const unsub = subscribeToPackingItems(trip.id, (data) => {
      setItems(data);
    });
    return () => unsub();
  }, [trip.id]);

  const handleToggle = async (item: PackingItem) => {
    // Optimistic update
    setItems(prev => prev.map(p => {
      if (p.id !== item.id) return p;
      const nextPacked = !p.isPacked;
      return { ...p, isPacked: nextPacked, packedByName: nextPacked ? currentUser.displayName : undefined };
    }));
    await togglePackingItem(trip.id, item.id, currentUser.displayName);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const item: PackingItem = {
      id: `pack_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: trip.id,
      item: newItemName.trim(),
      category: newItemCategory,
      assignedToName: newItemAssignee.trim() || currentUser.displayName,
      assignedToId: currentUser.id,
      isPacked: false
    };

    const saved = await addPackingItem(item);
    setItems(prev => [...prev, saved]);
    setNewItemName('');
    setShowAddForm(false);
  };

  const handleDeleteItem = async (id: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
    await deletePackingItem(trip.id, id);
  };

  const handleCopyFormattedList = () => {
    const lines = [
      `🎒 *${trip.title} — Collaborative Packing & Gear Checklist*`,
      `📍 Destination: ${trip.destination}`,
      `📅 Dates: ${trip.startDate} to ${trip.endDate}`,
      '',
      ...items.map(i => `${i.isPacked ? '✅' : '⬜'} [${i.category.toUpperCase()}] ${i.item} (Assigned: ${i.assignedToName || 'Unassigned'})`),
      '',
      `Generated via Smart Ride Sharing Platform`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const packedCount = items.filter(i => i.isPacked).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  const filteredItems = items.filter(i => {
    const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory;
    const matchesMyItems = !filterMyItems || i.assignedToName === currentUser.displayName;
    return matchesCategory && matchesMyItems;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
      case 'electronics':
        return <Zap className="w-3.5 h-3.5 text-blue-500" />;
      case 'clothing':
        return <Shirt className="w-3.5 h-3.5 text-amber-500" />;
      case 'food':
        return <Utensils className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card with Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Collaborative Packing & Gear Splitter</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Assign shared road trip gear, medical essentials, and snacks across travelers so no one packs duplicate gear.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyFormattedList}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Copy checklist formatted for WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Share Checklist'}</span>
            </button>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Gear Item</span>
            </button>
          </div>
        </div>

        {/* Packing Progress */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-600">Packing Readiness</span>
            <span className="text-slate-900 font-mono">
              {packedCount} / {totalCount} items packed ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Chips & Traveler Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'essentials', label: 'Essentials & IDs' },
            { id: 'medical', label: 'Medical & Safety' },
            { id: 'electronics', label: 'Electronics & Gadgets' },
            { id: 'clothing', label: 'Clothing & Trail' },
            { id: 'food', label: 'Food & Snacks' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-medium transition-colors border ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setFilterMyItems(!filterMyItems)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors self-start sm:self-auto ${
            filterMyItems
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>My Assigned Items Only</span>
        </button>
      </div>

      {/* Add Item Modal / Collapsible Form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Add New Packing or Gear Item</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Item Description</label>
              <input
                type="text"
                placeholder="e.g. Action Camera / Waterproof Poncho"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="essentials">Essentials & Docs</option>
                <option value="medical">Medical & Safety</option>
                <option value="electronics">Electronics & Tech</option>
                <option value="clothing">Clothing & Trail</option>
                <option value="food">Food & Snacks</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assigned Traveler</label>
              <input
                type="text"
                placeholder="Assignee Name"
                value={newItemAssignee}
                onChange={(e) => setNewItemAssignee(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              Save to Checklist
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No items in this category</div>
            <div className="text-xs text-slate-400 mt-1">Add shared items to divide luggage weight across travelers.</div>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                item.isPacked ? 'bg-slate-50/70 opacity-80' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleToggle(item)}
                  className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                  title={item.isPacked ? 'Mark as unpacked' : 'Mark as packed'}
                >
                  {item.isPacked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${item.isPacked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {item.item}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      {getCategoryIcon(item.category)}
                      <span className="capitalize">{item.category}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Assigned to: <strong className="text-slate-700">{item.assignedToName || 'Anyone'}</strong></span>
                    </span>
                    {item.isPacked && item.packedByName && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-emerald-600 font-medium">
                          Packed by {item.packedByName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
