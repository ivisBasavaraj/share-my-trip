/**
 * tripService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All data operations for Smart Ride Sharing Platform.
 *
 * Priority order for every entity:
 *   1. Firestore real-time listener  (primary source of truth)
 *   2. Express REST backend           (shared demo transport / offline bridge)
 *   3. localStorage                   (offline-first cache)
 *   4. INITIAL_* seed data            (only if localStorage is empty AND offline)
 *
 * Mock seed data is NEVER pushed into the live Firestore collection.
 * It only fills the cache so the app is usable when fully offline on first load.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Trip,
  Waypoint,
  Expense,
  Memory,
  EncryptedMessage,
  CompanionRequest,
  PackingItem,
  TripWeatherInfo,
} from '../types';
import {
  INITIAL_TRIPS,
  INITIAL_MEMORIES,
  INITIAL_MESSAGES,
  INITIAL_PACKING_ITEMS,
  INITIAL_WEATHER_DATA,
} from '../utils/mockData';

// ─── Storage keys ────────────────────────────────────────────────────────────
const KEY_TRIPS     = 'srsplatform_cached_trips_inr';
const KEY_MEMORIES  = 'srsplatform_cached_memories_inr';
const MSG_EVENT     = 'srsplatform:messages-changed';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function msgKey(tripId: string) {
  return `srsplatform_chat_${tripId}`;
}

function readCachedMsgs(tripId: string): EncryptedMessage[] {
  try { return JSON.parse(localStorage.getItem(msgKey(tripId)) || '[]'); }
  catch { return []; }
}

function writeCachedMsgs(tripId: string, messages: EncryptedMessage[]) {
  const unique = new Map<string, EncryptedMessage>();
  messages.forEach(m => unique.set(m.id, m));
  const ordered = [...unique.values()].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
  localStorage.setItem(msgKey(tripId), JSON.stringify(ordered));
  window.dispatchEvent(
    new CustomEvent(MSG_EVENT, { detail: { tripId, messages: ordered } })
  );
  return ordered;
}

function mergeMsgs(tripId: string, incoming: EncryptedMessage[]) {
  const current = readCachedMsgs(tripId);
  const byId = new Map(current.map(m => [m.id, m]));
  incoming.forEach(m => byId.set(m.id, { ...byId.get(m.id), ...m }));
  return writeCachedMsgs(tripId, [...byId.values()]);
}

/** Thin wrapper around fetch — returns null on any error (offline-safe). */
async function apiCall<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    });
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch { /* offline */ }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRIPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read trips from localStorage.
 * Returns an empty array (NOT seed data) if the cache is empty.
 * Seed data is injected by seedDemoTripsIfEmpty() only once per device.
 */
export function getLocalTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY_TRIPS);
    if (raw) return JSON.parse(raw) as Trip[];
  } catch { /* ignore */ }
  return [];
}

export function saveLocalTrips(trips: Trip[]) {
  try { localStorage.setItem(KEY_TRIPS, JSON.stringify(trips)); }
  catch (e) { console.warn('saveLocalTrips failed:', e); }
}

/**
 * One-time seed: no-op now that mock data is removed.
 * Kept so the call sites don't break.
 */
function seedDemoTripsIfEmpty() {
  // Mock data removed — do nothing. Real trips come from Firestore only.
}

/**
 * Subscribe to the live trips list.
 *
 * Flow:
 *   1. Immediately emit whatever is in localStorage (instant render).
 *   2. Firestore onSnapshot replaces with authoritative data.
 *   3. If Firestore is empty AND we have no cache → seed demo trips once.
 */
export function subscribeToTrips(
  onUpdate: (trips: Trip[]) => void,
  onError?: (err: Error) => void
): () => void {
  // Emit cached data immediately so the UI isn't blank
  const cached = getLocalTrips();
  if (cached.length > 0) onUpdate(cached);

  try {
    const col = collection(db, 'trips');
    const q   = query(col, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          // Real Firestore data — use it exclusively (no merge with seed)
          const remote: Trip[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<Trip, 'id'>),
          }));
          saveLocalTrips(remote);
          onUpdate(remote);
        } else {
          // Firestore is empty → fall back to local cache or seed demo data
          seedDemoTripsIfEmpty();
          onUpdate(getLocalTrips());
        }
      },
      (err) => {
        console.warn('Firestore trips offline:', err.message);
        if (onError) onError(err);
        // Ensure the UI still has something to show while offline
        if (cached.length === 0) seedDemoTripsIfEmpty();
        onUpdate(getLocalTrips());
      }
    );
    return unsub;
  } catch (err) {
    seedDemoTripsIfEmpty();
    onUpdate(getLocalTrips());
    return () => {};
  }
}

/**
 * Subscribe to waypoints for a specific trip.
 */
export function subscribeToItinerary(
  tripId: string,
  onUpdate: (waypoints: Waypoint[]) => void
): () => void {
  // Immediate local render
  const localWps =
    getLocalTrips().find(t => t.id === tripId)?.itinerary || [];
  if (localWps.length > 0) onUpdate(localWps);

  try {
    const col = collection(db, 'trips', tripId, 'itinerary');
    const q   = query(col, orderBy('orderIndex', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items: Waypoint[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<Waypoint, 'id'>),
          }));
          // Update the itinerary inside local trip cache
          const trips = getLocalTrips();
          const trip  = trips.find(t => t.id === tripId);
          if (trip) { trip.itinerary = items; saveLocalTrips(trips); }
          onUpdate(items);
        } else {
          onUpdate(localWps);
        }
      },
      () => onUpdate(localWps)
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function saveWaypoint(tripId: string, item: Waypoint): Promise<void> {
  // Optimistic local update
  const trips = getLocalTrips();
  const trip  = trips.find(t => t.id === tripId);
  if (trip) {
    const list = trip.itinerary || [];
    const idx  = list.findIndex(w => w.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    trip.itinerary = [...list].sort((a, b) => a.orderIndex - b.orderIndex);
    saveLocalTrips(trips);
  }

  await apiCall(`/api/trips/${tripId}/itinerary`, {
    method: 'POST', body: JSON.stringify(item),
  });

  try {
    await setDoc(doc(db, 'trips', tripId, 'itinerary', item.id), item, {
      merge: true,
    });
  } catch (err) {
    console.warn('Waypoint queued offline:', err);
  }
}

export async function deleteWaypoint(tripId: string, waypointId: string): Promise<void> {
  const trips = getLocalTrips();
  const trip  = trips.find(t => t.id === tripId);
  if (trip?.itinerary) {
    trip.itinerary = trip.itinerary.filter(w => w.id !== waypointId);
    saveLocalTrips(trips);
  }

  await apiCall(`/api/trips/${tripId}/itinerary/${waypointId}`, {
    method: 'DELETE',
  });

  try {
    await deleteDoc(doc(db, 'trips', tripId, 'itinerary', waypointId));
  } catch (err) {
    console.warn('Delete waypoint offline:', err);
  }
}

export async function createTrip(trip: Trip): Promise<void> {
  // Add to local cache immediately
  const current = getLocalTrips();
  saveLocalTrips([trip, ...current.filter(t => t.id !== trip.id)]);

  await apiCall('/api/trips', { method: 'POST', body: JSON.stringify(trip) });

  try {
    // Write the trip doc (without itinerary array — stored as subcollection)
    const { itinerary, ...tripData } = trip;
    await setDoc(doc(db, 'trips', trip.id), tripData);

    // Write each waypoint as a sub-document
    if (itinerary && itinerary.length > 0) {
      for (const wp of itinerary) {
        await setDoc(doc(db, 'trips', trip.id, 'itinerary', wp.id), wp);
      }
    }
  } catch (err) {
    console.warn('Trip queued for cloud sync:', err);
  }
}

export async function updateTrip(trip: Trip): Promise<void> {
  const current = getLocalTrips();
  const idx = current.findIndex(t => t.id === trip.id);
  if (idx >= 0) { current[idx] = trip; saveLocalTrips(current); }

  await apiCall(`/api/trips/${trip.id}`, {
    method: 'PUT', body: JSON.stringify(trip),
  });

  try {
    const { itinerary, ...tripData } = trip;
    await setDoc(doc(db, 'trips', trip.id), tripData, { merge: true });
  } catch (err) {
    console.warn('Trip update queued:', err);
  }
}

export async function deleteTrip(tripId: string): Promise<void> {
  saveLocalTrips(getLocalTrips().filter(t => t.id !== tripId));

  await apiCall(`/api/trips/${tripId}`, { method: 'DELETE' });

  try {
    await deleteDoc(doc(db, 'trips', tripId));
  } catch (err) {
    console.warn('Delete trip queued:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPENSES  (Firestore subcollection: trips/{tripId}/expenses)
// ─────────────────────────────────────────────────────────────────────────────

const KEY_EXPENSES = (tripId: string) => `srsplatform_expenses_${tripId}`;

export function subscribeToExpenses(
  tripId: string,
  onUpdate: (expenses: Expense[]) => void
): () => void {
  // Immediate local render
  try {
    const raw = localStorage.getItem(KEY_EXPENSES(tripId));
    if (raw) onUpdate(JSON.parse(raw));
  } catch { /* ignore */ }

  try {
    const col = collection(db, 'trips', tripId, 'expenses');
    const q   = query(col, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Expense[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Expense, 'id'>),
        }));
        localStorage.setItem(KEY_EXPENSES(tripId), JSON.stringify(items));
        onUpdate(items);
      },
      (err) => {
        console.warn('Expenses offline:', err.message);
        // Keep current local data
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function addExpense(expense: Expense): Promise<void> {
  // Optimistic local
  try {
    const raw  = localStorage.getItem(KEY_EXPENSES(expense.tripId));
    const list = raw ? (JSON.parse(raw) as Expense[]) : [];
    localStorage.setItem(
      KEY_EXPENSES(expense.tripId),
      JSON.stringify([expense, ...list])
    );
  } catch { /* ignore */ }

  await apiCall(`/api/trips/${expense.tripId}/expenses`, {
    method: 'POST', body: JSON.stringify(expense),
  });

  try {
    await setDoc(
      doc(db, 'trips', expense.tripId, 'expenses', expense.id),
      expense
    );
  } catch (err) {
    console.warn('Expense queued offline:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MESSAGES  (Firestore subcollection: trips/{tripId}/messages)
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToMessages(
  tripId: string,
  onUpdate: (msgs: EncryptedMessage[]) => void
): () => void {
  // 1. Immediate: local cache only (no mock seed)
  const saved = readCachedMsgs(tripId);
  if (saved.length > 0) onUpdate(saved);

  // 2. Poll Express REST for shared demo messages
  const refreshFromApi = () =>
    apiCall<EncryptedMessage[]>(
      `/api/messages?tripId=${encodeURIComponent(tripId)}`
    ).then(apiMsgs => {
      if (apiMsgs && Array.isArray(apiMsgs) && apiMsgs.length > 0) {
        mergeMsgs(tripId, apiMsgs);
      }
    });
  void refreshFromApi();
  const pollId = window.setInterval(() => void refreshFromApi(), 3000);

  // 3. LocalStorage event relay
  const onLocalChange = (e: Event) => {
    const detail = (e as CustomEvent<{ tripId: string; messages: EncryptedMessage[] }>).detail;
    if (detail?.tripId === tripId) onUpdate(detail.messages);
  };
  window.addEventListener(MSG_EVENT, onLocalChange);

  // 4. Firestore real-time
  try {
    const col = collection(db, 'trips', tripId, 'messages');
    const q   = query(col, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list: EncryptedMessage[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<EncryptedMessage, 'id'>),
          }));
          mergeMsgs(tripId, list);
        }
      },
      (err) => console.warn('Messages Firestore offline:', err)
    );

    return () => {
      clearInterval(pollId);
      window.removeEventListener(MSG_EVENT, onLocalChange);
      unsub();
    };
  } catch {
    return () => {
      clearInterval(pollId);
      window.removeEventListener(MSG_EVENT, onLocalChange);
    };
  }
}

export async function sendEncryptedMessage(
  msg: EncryptedMessage
): Promise<{ delivery: 'sent' | 'cached' }> {
  // Write to local cache immediately
  writeCachedMsgs(msg.tripId, [
    ...readCachedMsgs(msg.tripId).filter(m => m.id !== msg.id),
    msg,
  ]);

  const text = msg.text || msg.decryptedText || '';

  const serverResult = await apiCall('/api/messages', {
    method: 'POST',
    body: JSON.stringify({
      id: msg.id, tripId: msg.tripId,
      senderId: msg.senderId, senderName: msg.senderName,
      senderAvatar: msg.senderAvatar || '',
      text, decryptedText: text,
      encryptedPayload: msg.encryptedPayload || '',
      iv: msg.iv || '',
      timestamp: msg.timestamp,
      mediaUrl: msg.mediaUrl,
      reactions: msg.reactions || {},
      poll: msg.poll,
    }),
  });

  try {
    await setDoc(doc(db, 'trips', msg.tripId, 'messages', msg.id), {
      id: msg.id, tripId: msg.tripId,
      senderId: msg.senderId, senderName: msg.senderName,
      senderAvatar: msg.senderAvatar || '',
      text, decryptedText: text,
      encryptedPayload: msg.encryptedPayload || '',
      iv: msg.iv || '',
      createdAt: msg.timestamp,
      mediaUrl: msg.mediaUrl || '',
      reactions: msg.reactions || {},
      poll: msg.poll || null,
    });
  } catch (err) {
    console.warn('Message cached locally:', err);
  }

  return { delivery: serverResult ? 'sent' : 'cached' };
}

export async function toggleMessageReaction(
  tripId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const current = readCachedMsgs(tripId);
  const target  = current.find(m => m.id === messageId);
  if (target) {
    target.reactions = target.reactions || {};
    const users = target.reactions[emoji] || [];
    if (users.includes(userId)) {
      target.reactions[emoji] = users.filter(u => u !== userId);
      if (!target.reactions[emoji].length) delete target.reactions[emoji];
    } else {
      target.reactions[emoji] = [...users, userId];
    }
    writeCachedMsgs(tripId, current);
  }

  await apiCall(`/api/messages/${encodeURIComponent(messageId)}/react`, {
    method: 'POST', body: JSON.stringify({ emoji, userId }),
  });

  try {
    const saved = current.find(m => m.id === messageId);
    if (saved?.reactions) {
      await updateDoc(
        doc(db, 'trips', tripId, 'messages', messageId),
        { reactions: saved.reactions }
      );
    }
  } catch { /* offline */ }
}

export async function voteOnPoll(
  tripId: string,
  messageId: string,
  optionId: string,
  userId: string
): Promise<void> {
  const current = readCachedMsgs(tripId);
  const target  = current.find(m => m.id === messageId);
  if (target?.poll) {
    target.poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(u => u !== userId);
      if (opt.id === optionId) opt.votes.push(userId);
    });
    writeCachedMsgs(tripId, current);
  }

  await apiCall(`/api/messages/${encodeURIComponent(messageId)}/vote`, {
    method: 'POST', body: JSON.stringify({ optionId, userId }),
  });

  try {
    const saved = current.find(m => m.id === messageId);
    if (saved?.poll) {
      await updateDoc(
        doc(db, 'trips', tripId, 'messages', messageId),
        { poll: saved.poll }
      );
    }
  } catch { /* offline */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PACKING  (Firestore subcollection: trips/{tripId}/packing)
// ─────────────────────────────────────────────────────────────────────────────

const KEY_PACKING = (tripId: string) =>
  `srsplatform_cached_packing_items_${tripId}`;

/**
 * Subscribe to packing items in real-time.
 * Falls back to localStorage, then demo seed data.
 */
export function subscribeToPackingItems(
  tripId: string,
  onUpdate: (items: PackingItem[]) => void
): () => void {
  // Immediate render — local cache only
  try {
    const raw = localStorage.getItem(KEY_PACKING(tripId));
    if (raw) onUpdate(JSON.parse(raw));
  } catch { /* ignore */ }

  try {
    const col = collection(db, 'trips', tripId, 'packing');
    const q   = query(col, orderBy('category', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items: PackingItem[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<PackingItem, 'id'>),
          }));
          localStorage.setItem(KEY_PACKING(tripId), JSON.stringify(items));
          onUpdate(items);
        }
      },
      (err) => console.warn('Packing offline:', err)
    );
    return unsub;
  } catch {
    return () => {};
  }
}

/** Legacy one-shot fetch (used by PackingChecklist on mount) */
export async function fetchPackingItems(tripId: string): Promise<PackingItem[]> {
  // 1. Try Firestore
  try {
    const col  = collection(db, 'trips', tripId, 'packing');
    const snap = await getDocs(col);
    if (!snap.empty) {
      const items: PackingItem[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<PackingItem, 'id'>),
      }));
      localStorage.setItem(KEY_PACKING(tripId), JSON.stringify(items));
      return items;
    }
  } catch { /* offline */ }

  // 2. localStorage
  try {
    const raw = localStorage.getItem(KEY_PACKING(tripId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }

  // 3. Express
  const server = await apiCall<PackingItem[]>(
    `/api/packing?tripId=${encodeURIComponent(tripId)}`
  );
  if (server && server.length > 0) {
    localStorage.setItem(KEY_PACKING(tripId), JSON.stringify(server));
    return server;
  }

  // 4. Empty list — no mock data
  return [];
}

export async function addPackingItem(item: PackingItem): Promise<PackingItem> {
  // Local optimistic
  try {
    const raw  = localStorage.getItem(KEY_PACKING(item.tripId));
    const list = raw ? (JSON.parse(raw) as PackingItem[]) : [];
    localStorage.setItem(KEY_PACKING(item.tripId), JSON.stringify([...list, item]));
  } catch { /* ignore */ }

  await apiCall('/api/packing', { method: 'POST', body: JSON.stringify(item) });

  try {
    await setDoc(doc(db, 'trips', item.tripId, 'packing', item.id), item);
  } catch (err) {
    console.warn('Packing item queued offline:', err);
  }
  return item;
}

export async function togglePackingItem(
  tripId: string,
  id: string,
  packedByName?: string
): Promise<void> {
  let updatedItem: PackingItem | undefined;
  try {
    const raw  = localStorage.getItem(KEY_PACKING(tripId));
    const list = raw ? (JSON.parse(raw) as PackingItem[]) : [];
    const t    = list.find(p => p.id === id);
    if (t) {
      t.isPacked      = !t.isPacked;
      t.packedByName  = t.isPacked ? (packedByName || 'Traveler') : undefined;
      updatedItem     = t;
      localStorage.setItem(KEY_PACKING(tripId), JSON.stringify(list));
    }
  } catch { /* ignore */ }

  await apiCall(`/api/packing/${encodeURIComponent(id)}/toggle`, {
    method: 'PATCH', body: JSON.stringify({ packedByName }),
  });

  if (updatedItem) {
    try {
      await setDoc(
        doc(db, 'trips', tripId, 'packing', id),
        updatedItem,
        { merge: true }
      );
    } catch { /* offline */ }
  }
}

export async function assignPackingItem(
  tripId: string,
  id: string,
  assignedToName: string,
  assignedToId: string
): Promise<void> {
  try {
    const raw  = localStorage.getItem(KEY_PACKING(tripId));
    const list = raw ? (JSON.parse(raw) as PackingItem[]) : [];
    const t    = list.find(p => p.id === id);
    if (t) {
      t.assignedToName = assignedToName;
      t.assignedToId   = assignedToId;
      localStorage.setItem(KEY_PACKING(tripId), JSON.stringify(list));
    }
  } catch { /* ignore */ }

  await apiCall(`/api/packing/${encodeURIComponent(id)}/assign`, {
    method: 'PATCH', body: JSON.stringify({ assignedToName, assignedToId }),
  });

  try {
    await updateDoc(doc(db, 'trips', tripId, 'packing', id), {
      assignedToName, assignedToId,
    });
  } catch { /* offline */ }
}

export async function deletePackingItem(tripId: string, id: string): Promise<void> {
  try {
    const raw  = localStorage.getItem(KEY_PACKING(tripId));
    const list = raw ? (JSON.parse(raw) as PackingItem[]) : [];
    localStorage.setItem(
      KEY_PACKING(tripId),
      JSON.stringify(list.filter(p => p.id !== id))
    );
  } catch { /* ignore */ }

  await apiCall(`/api/packing/${encodeURIComponent(id)}`, { method: 'DELETE' });

  try {
    await deleteDoc(doc(db, 'trips', tripId, 'packing', id));
  } catch { /* offline */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MEMORIES  (Firestore subcollection: trips/{tripId}/memories)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to memories in real-time for a trip.
 * Falls back to localStorage, then demo seed only if empty.
 */
export function subscribeToMemories(
  tripId: string | undefined,
  onUpdate: (memories: Memory[]) => void
): () => void {
  const key = `srsplatform_cached_memories_${tripId || 'all'}`;

  // Immediate render — prefer localStorage over seeded mock
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw) as Memory[];
      if (cached.length > 0) { onUpdate(cached); }
    }
  } catch { /* ignore */ }

  if (!tripId) return () => {};

  try {
    const col = collection(db, 'trips', tripId, 'memories');
    const q   = query(col, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items: Memory[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<Memory, 'id'>),
          }));
          localStorage.setItem(key, JSON.stringify(items));
          onUpdate(items);
        }
        // If snap is empty, keep whatever was cached (or the seed set below)
      },
      (err) => console.warn('Memories offline:', err)
    );
    return unsub;
  } catch {
    return () => {};
  }
}

/** Legacy helpers kept for backward-compat with MemoryWall */
export function getMemories(tripId?: string): Memory[] {
  const key = `srsplatform_cached_memories_${tripId || 'all'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as Memory[];
  } catch { /* ignore */ }
  // Fall back to seed — only for offline-first demo
  const seed = tripId
    ? INITIAL_MEMORIES.filter(m => m.tripId === tripId)
    : INITIAL_MEMORIES;
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export async function fetchMemoriesApi(tripId?: string): Promise<Memory[]> {
  // 1. Firestore
  if (tripId) {
    try {
      const col  = collection(db, 'trips', tripId, 'memories');
      const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Memory, 'id'>) }));
      }
    } catch { /* offline */ }
  }

  // 2. Express
  const remote = await apiCall<Memory[]>(
    `/api/memories${tripId ? `?tripId=${tripId}` : ''}`
  );
  if (remote && Array.isArray(remote) && remote.length > 0) return remote;

  // 3. local cache / seed
  return getMemories(tripId);
}

export async function addMemory(memory: Memory): Promise<void> {
  const key   = `srsplatform_cached_memories_${memory.tripId}`;
  const keyAll = 'srsplatform_cached_memories_all';
  const updateCache = (k: string) => {
    try {
      const raw  = localStorage.getItem(k);
      const list = raw ? (JSON.parse(raw) as Memory[]) : [];
      localStorage.setItem(k, JSON.stringify([memory, ...list.filter(m => m.id !== memory.id)]));
    } catch { /* ignore */ }
  };
  updateCache(key);
  updateCache(keyAll);

  await apiCall('/api/memories', { method: 'POST', body: JSON.stringify(memory) });

  try {
    await setDoc(doc(db, 'trips', memory.tripId, 'memories', memory.id), memory);
  } catch (err) {
    console.warn('Memory cached locally:', err);
  }
}

export async function deleteMemory(tripId: string, memoryId: string): Promise<void> {
  const key = `srsplatform_cached_memories_${tripId}`;
  try {
    const raw  = localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as Memory[]) : [];
    localStorage.setItem(key, JSON.stringify(list.filter(m => m.id !== memoryId)));
  } catch { /* ignore */ }

  await apiCall(`/api/memories/${memoryId}`, { method: 'DELETE' });

  try {
    await deleteDoc(doc(db, 'trips', tripId, 'memories', memoryId));
  } catch (err) {
    console.warn('Memory delete queued:', err);
  }
}

export async function likeMemory(tripId: string, memoryId: string): Promise<number> {
  const key = `srsplatform_cached_memories_${tripId}`;
  let newLikes = 1;
  try {
    const raw  = localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as Memory[]) : [];
    const updated = list.map(m => {
      if (m.id === memoryId) {
        newLikes = (m.likes || 0) + 1;
        return { ...m, likes: newLikes };
      }
      return m;
    });
    localStorage.setItem(key, JSON.stringify(updated));
  } catch { /* ignore */ }

  await apiCall(`/api/memories/${memoryId}/like`, { method: 'POST' });

  try {
    await updateDoc(doc(db, 'trips', tripId, 'memories', memoryId), {
      likes: newLikes,
    });
  } catch { /* offline */ }

  return newLikes;
}

// ─────────────────────────────────────────────────────────────────────────────
//  WEATHER
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTripWeather(
  tripId: string,
  destination: string
): Promise<TripWeatherInfo> {
  const server = await apiCall<TripWeatherInfo>(
    `/api/weather?tripId=${encodeURIComponent(tripId)}&destination=${encodeURIComponent(destination)}`
  );
  if (server) return server;

  return INITIAL_WEATHER_DATA[tripId] || {
    destination,
    temperatureC: 23,
    condition: 'Pleasant & Clear',
    precipitationChance: 10,
    humidity: 65,
    windSpeedKmh: 14,
    advisory: 'Clear visibility. Excellent travel conditions.',
    forecast: [
      { day: 'Day 1', tempHigh: 25, tempLow: 16, condition: 'Sunny & Pleasant' },
      { day: 'Day 2', tempHigh: 24, tempLow: 15, condition: 'Clear Sky' },
      { day: 'Day 3', tempHigh: 23, tempLow: 16, condition: 'Passing Clouds' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMAGE UPLOAD  (compress + send to server or fall back to data URL)
// ─────────────────────────────────────────────────────────────────────────────

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1400,
  quality = 0.82
): Promise<{ dataUrl: string; sizeBytes: number; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image'));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = e.target?.result as string;
          return resolve({ dataUrl: raw, sizeBytes: file.size, name: file.name });
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl, sizeBytes: Math.round((dataUrl.length * 3) / 4), name: file.name });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFromLocalDevice(
  file: File
): Promise<{ url: string; previewUrl: string; sizeKb: number; name: string }> {
  const compressed = await compressImageToDataUrl(file);
  const sizeKb     = Math.round(compressed.sizeBytes / 1024);

  try {
    const res = await apiCall<{ success: boolean; url: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl: compressed.dataUrl, filename: file.name }),
    });
    if (res?.url) {
      return { url: res.url, previewUrl: compressed.dataUrl, sizeKb, name: file.name };
    }
  } catch { /* fall through */ }

  return { url: compressed.dataUrl, previewUrl: compressed.dataUrl, sizeKb, name: file.name };
}

export async function uploadDataUrl(
  dataUrl: string,
  filename = 'chat_image.jpg'
): Promise<string> {
  try {
    const res = await apiCall<{ success: boolean; url: string }>('/api/upload', {
      method: 'POST', body: JSON.stringify({ dataUrl, filename }),
    });
    if (res?.url) return res.url;
  } catch { /* fall through */ }
  return dataUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPANION REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a join request.
 * Stored in TWO places so both sides can query:
 *   /companionRequests/{id}                      ← queried by targetUserId (inbox)
 *   /trips/{tripId}/companionRequests/{id}        ← queried by trip owner
 */
export async function sendCompanionRequestApi(payload: {
  tripId: string;
  tripTitle?: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  targetUserId: string;
  tripOwnerId?: string;
  message: string;
  compatibilityScore?: number;
}): Promise<boolean> {
  const id = `req_${Date.now()}_${payload.requesterId}`;
  const req: CompanionRequest = {
    id,
    tripId:             payload.tripId,
    tripTitle:          payload.tripTitle,
    requesterId:        payload.requesterId,
    requesterName:      payload.requesterName,
    requesterAvatar:    payload.requesterAvatar,
    targetUserId:       payload.targetUserId,
    tripOwnerId:        payload.tripOwnerId || '',
    status:             'pending',
    message:            payload.message,
    compatibilityScore: payload.compatibilityScore || 70,
    createdAt:          new Date().toISOString(),
  };

  try {
    // top-level — so target user can query their inbox
    await setDoc(doc(db, 'companionRequests', id), req);
    // subcollection — so trip owner can query by trip
    await setDoc(doc(db, 'trips', payload.tripId, 'companionRequests', id), req);
  } catch (err) {
    console.warn('Companion request Firestore error:', err);
  }

  await apiCall<{ success: boolean }>('/api/companions/request', {
    method: 'POST', body: JSON.stringify({ ...payload, id }),
  });
  return true;
}

/**
 * Real-time listener for companion requests.
 * Pass targetUserId  → user sees their inbox (requests sent TO them).
 * Pass tripId        → trip owner sees all requests for their trip.
 * Pass requesterId   → user sees requests they sent (outbox).
 * All three can be combined; results are deduplicated.
 */
export function subscribeToCompanionRequests(
  opts: { tripId?: string; targetUserId?: string; requesterId?: string },
  onUpdate: (requests: CompanionRequest[]) => void
): () => void {
  const cache = new Map<string, CompanionRequest>();
  const unsubs: Array<() => void> = [];

  const emit = (items: CompanionRequest[]) => {
    items.forEach(r => cache.set(r.id, r));
    onUpdate(
      [...cache.values()].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      )
    );
  };

  // 1. Requests WHERE I am the target (my inbox)
  if (opts.targetUserId) {
    try {
      const q = query(
        collection(db, 'companionRequests'),
        where('targetUserId', '==', opts.targetUserId)
      );
      unsubs.push(
        onSnapshot(q, snap => emit(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CompanionRequest,'id'>) }))),
        err => console.warn('inbox listener:', err))
      );
    } catch { /* offline */ }
  }

  // 2. All requests for a specific trip (trip-owner view)
  if (opts.tripId) {
    try {
      const q = query(collection(db, 'trips', opts.tripId, 'companionRequests'));
      unsubs.push(
        onSnapshot(q, snap => emit(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CompanionRequest,'id'>) }))),
        err => console.warn('trip requests listener:', err))
      );
    } catch { /* offline */ }
  }

  // 3. Requests I sent (outbox)
  if (opts.requesterId) {
    try {
      const q = query(
        collection(db, 'companionRequests'),
        where('requesterId', '==', opts.requesterId)
      );
      unsubs.push(
        onSnapshot(q, snap => emit(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CompanionRequest,'id'>) }))),
        err => console.warn('outbox listener:', err))
      );
    } catch { /* offline */ }
  }

  return () => unsubs.forEach(u => u());
}

export async function fetchCompanionRequests(
  tripId?: string,
  targetUserId?: string
): Promise<CompanionRequest[]> {
  const map = new Map<string, CompanionRequest>();

  // inbox: all requests sent TO this user
  if (targetUserId) {
    try {
      const snap = await getDocs(
        query(collection(db, 'companionRequests'), where('targetUserId', '==', targetUserId))
      );
      snap.docs.forEach(d => map.set(d.id, { id: d.id, ...(d.data() as Omit<CompanionRequest,'id'>) }));
    } catch { /* offline */ }
  }

  // trip view: all requests for a trip
  if (tripId) {
    try {
      const snap = await getDocs(collection(db, 'trips', tripId, 'companionRequests'));
      snap.docs.forEach(d => map.set(d.id, { id: d.id, ...(d.data() as Omit<CompanionRequest,'id'>) }));
    } catch { /* offline */ }
  }

  if (map.size > 0)
    return [...map.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  // Express fallback
  const qs = new URLSearchParams();
  if (tripId) qs.append('tripId', tripId);
  if (targetUserId) qs.append('targetUserId', targetUserId);
  return (await apiCall<CompanionRequest[]>(`/api/companions/requests?${qs}`)) || [];
}

/**
 * Accept or decline a request.
 * On accept: requester is added to trip.memberIds in Firestore.
 */
export async function respondToCompanionRequest(
  requestId: string,
  status: 'accepted' | 'declined',
  responderId: string,
  tripId?: string,
  requesterId?: string
): Promise<boolean> {
  // update top-level doc
  try { await updateDoc(doc(db, 'companionRequests', requestId), { status }); }
  catch { /* offline */ }

  // update subcollection doc
  if (tripId) {
    try { await updateDoc(doc(db, 'trips', tripId, 'companionRequests', requestId), { status }); }
    catch { /* offline */ }

    // on accept: add requester to trip.memberIds only if a seat is available
    if (status === 'accepted' && requesterId) {
      try {
        const tripRef  = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        if (tripSnap.exists()) {
          const tripData = tripSnap.data() as Trip;
          const members: string[] = tripData.memberIds || [];
          const totalSeats: number | undefined = tripData.totalSeats;

          // Block if seats are full
          if (totalSeats != null && members.length >= totalSeats) {
            console.warn('Cannot accept request: no seats available.');
            return false;
          }

          if (!members.includes(requesterId)) {
            await updateDoc(tripRef, { memberIds: [...members, requesterId] });
            // Also update localStorage cache
            const cached = getLocalTrips();
            const idx = cached.findIndex(t => t.id === tripId);
            if (idx >= 0 && !cached[idx].memberIds.includes(requesterId)) {
              cached[idx].memberIds = [...cached[idx].memberIds, requesterId];
              saveLocalTrips(cached);
            }
          }
        }
      } catch (err) { console.warn('Failed to add member to trip:', err); }
    }
  }

  await apiCall<{ success: boolean }>(
    `/api/companions/request/${encodeURIComponent(requestId)}/respond`,
    { method: 'PATCH', body: JSON.stringify({ status, responderId }) }
  );
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SAFETY SOS
// ─────────────────────────────────────────────────────────────────────────────

export async function dispatchSafetySos(payload: {
  travelerName: string;
  tripTitle: string;
  lat: number;
  lng: number;
  emergencyContact: string;
}): Promise<boolean> {
  const res = await apiCall<{ success: boolean }>('/api/safety/sos', {
    method: 'POST', body: JSON.stringify(payload),
  });
  return !!res?.success;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAdminReports(): Promise<any[]> {
  const res = await apiCall<any[]>('/api/admin/reports');
  return res || [];
}

export async function submitTripReport(report: {
  tripId?: string;
  tripTitle?: string;
  reporterName: string;
  category: string;
  description: string;
}): Promise<boolean> {
  const res = await apiCall<{ success: boolean }>('/api/admin/reports', {
    method: 'POST', body: JSON.stringify(report),
  });
  return !!res?.success;
}

export async function resolveAdminReport(reportId: string): Promise<boolean> {
  const res = await apiCall<{ success: boolean }>(
    `/api/admin/reports/${encodeURIComponent(reportId)}/resolve`,
    { method: 'PATCH' }
  );
  return !!res?.success;
}
