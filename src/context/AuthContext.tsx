import React, { createContext, useState, useEffect } from 'react';
import { UserProfile, TravelStyle } from '../types';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

/* ── Registration payload ── */
export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: 'driver' | 'user';
  emergencyContact: string;
  bio?: string;
  travelStyle?: TravelStyle;
  interests?: string[];
  homeCity?: string;
  photoURL?: string;
}

interface AuthContextType {
  currentUser: UserProfile;
  firebaseUser: FirebaseUser | null;
  isOnline: boolean;
  allUsers: UserProfile[];
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  registerWithEmail: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  switchProfile: (userId: string) => void;
  updateProfileBio: (bio: string, interests: string[], emergencyContact: string) => Promise<void>;
  updateVehicleInfo: (vehicleModel: string, vehicleNumber: string, carPhotos: string[]) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Default profile used before Firebase resolves ──
const DEFAULT_PROFILE: UserProfile = {
  id: 'guest',
  displayName: 'Traveler',
  email: '',
  photoURL: '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
  bio: '',
  travelStyle: 'adventure',
  verificationStatus: 'unverified',
  rating: 5.0, ratingCount: 0, tripsCount: 0,
  interests: [],
  createdAt: new Date().toISOString(),
};

function profileFromDoc(data: Record<string, any>, uid: string): UserProfile {
  return {
    id: uid,
    displayName: data.displayName || 'Traveler',
    email: data.email || '',
    photoURL: data.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
    bio: data.bio || '',
    travelStyle: data.travelStyle || 'adventure',
    verificationStatus: data.verificationStatus || 'pending',
    rating: data.rating ?? 5.0,
    ratingCount: data.ratingCount ?? 0,
    tripsCount: data.tripsCount ?? 0,
    interests: data.interests || [],
    homeCity: data.homeCity || '',
    phone: data.phone || '',
    role: data.role || (data.interests?.includes('Driver') ? 'driver' : 'user'),
    emergencyContact: data.emergencyContact || '',
    vehicleModel: data.vehicleModel || '',
    vehicleNumber: data.vehicleNumber || '',
    carPhotos: Array.isArray(data.carPhotos) ? data.carPhotos : undefined,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt,
  };
}

function guestProfile(uid: string): UserProfile {
  return {
    id: uid,
    displayName: 'Guest Traveler',
    email: '',
    photoURL: '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
    bio: 'Exploring as a guest. Sign up to save trips and connect with companions.',
    travelStyle: 'adventure',
    verificationStatus: 'unverified',
    rating: 5.0, ratingCount: 0, tripsCount: 0,
    interests: [],
    createdAt: new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('srsplatform_active_user');
    if (saved) { try { return JSON.parse(saved) as UserProfile; } catch (_) {} }
    return DEFAULT_PROFILE;
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isOnline, setIsOnline]         = useState<boolean>(navigator.onLine);
  const [allUsers, setAllUsers]         = useState<UserProfile[]>([]);

  // ── Online / offline ──
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ── Load all users from Firestore and Express backend ──
  const loadAllUsers = async () => {
    const userMap = new Map<string, UserProfile>();
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        snap.docs.forEach(d => userMap.set(d.id, profileFromDoc(d.data() as Record<string, any>, d.id)));
      }
    } catch (err) {
      console.warn('Could not load all users from Firestore (offline?):', err);
    }

    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.users)) {
          data.users.forEach((u: any) => {
            if (u.id && !userMap.has(u.id)) {
              userMap.set(u.id, u);
            }
          });
        }
      }
    } catch (_) {}

    if (userMap.size > 0) {
      setAllUsers([...userMap.values()]);
    }
  };

  // ── Firebase Auth state listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        // Signed out — reset to default
        setCurrentUser(DEFAULT_PROFILE);
        return;
      }

      if (user.isAnonymous) {
        const g = guestProfile(user.uid);
        setCurrentUser(g);
        localStorage.setItem('srsplatform_active_user', JSON.stringify(g));
        return;
      }

      let profile: UserProfile | null = null;
      let localFallback: UserProfile | undefined;
      try {
        const reg = JSON.parse(localStorage.getItem('srsplatform_user_registry') || '{}');
        localFallback = (user.email && reg[user.email.toLowerCase()]) || reg[user.uid];
      } catch (_) {}

      try {
        const ref  = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          profile = profileFromDoc(snap.data() as Record<string, any>, user.uid);
          if (!profile.role && localFallback?.role) {
            profile.role = localFallback.role;
          }
        }
      } catch (err) {
        console.warn('Firestore sync error (offline?):', err);
      }

      // Check backend API if profile not resolved or role missing
      if (!profile || !profile.role) {
        try {
          const res = await fetch(`/api/users/${encodeURIComponent(user.uid)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              profile = { ...data.user, id: user.uid };
            }
          } else if (user.email) {
            const resEmail = await fetch(`/api/users/${encodeURIComponent(user.email)}`);
            if (resEmail.ok) {
              const data = await resEmail.json();
              if (data?.user) {
                profile = { ...data.user, id: user.uid };
              }
            }
          }
        } catch (_) {}
      }

      if (!profile) {
        if (localFallback) {
          profile = { ...localFallback, id: user.uid };
        } else {
          profile = {
            id: user.uid,
            displayName: user.displayName || 'Traveler',
            email: user.email || '',
            photoURL: user.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
            bio: 'Passionate explorer on Smart Ride Sharing Platform.',
            travelStyle: 'adventure',
            verificationStatus: user.emailVerified ? 'verified' : 'pending',
            rating: 5.0, ratingCount: 0, tripsCount: 0,
            interests: ['Road Trips'],
            role: 'user',
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(doc(db, 'users', user.uid), profile);
          } catch (_) {}
        }
      }

      if (!profile.role) {
        profile.role = localFallback?.role || 'user';
      }

      setCurrentUser(profile);
      localStorage.setItem('srsplatform_active_user', JSON.stringify(profile));
      await loadAllUsers();
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load users on mount ──
  useEffect(() => { loadAllUsers(); }, []);

  // ── Auth methods ──
  const loginWithGoogle    = async () => { await signInWithPopup(auth, googleProvider); };
  const loginAnonymously   = async () => { await signInAnonymously(auth); };

  const registerWithEmail = async (payload: RegisterPayload) => {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    const user = cred.user;
    await updateProfile(user, { displayName: payload.fullName });

    const photoURL =
      payload.photoURL && payload.photoURL.trim()
        ? payload.photoURL.trim()
        : '/src/assets/images/avatar_traveler_alex_1791735824369.jpg';

    const profile: UserProfile = {
      id: user.uid,
      displayName: payload.fullName.trim(),
      email: payload.email.trim(),
      photoURL,
      bio: payload.bio?.trim() || (payload.role === 'driver' ? 'Registered Driver on Smart Ride Sharing' : 'Registered Passenger on Smart Ride Sharing'),
      travelStyle: payload.travelStyle || 'adventure',
      verificationStatus: 'pending',
      rating: 5.0, ratingCount: 0, tripsCount: 0,
      interests: payload.interests || (payload.role === 'driver' ? ['Driver', 'Road Trips'] : ['Road Trips']),
      phone: payload.phone.trim(),
      role: payload.role,
      emergencyContact: payload.emergencyContact.trim(),
      homeCity: payload.homeCity?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    // 1. Save to local persistent user registry for instant recovery
    try {
      const reg = JSON.parse(localStorage.getItem('srsplatform_user_registry') || '{}');
      reg[user.uid] = profile;
      if (profile.email) reg[profile.email.toLowerCase()] = profile;
      localStorage.setItem('srsplatform_user_registry', JSON.stringify(reg));
    } catch (_) {}

    // 2. Save to Express REST API
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
    } catch (_) {}

    // 3. Save to Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), profile);
    } catch (err) {
      console.warn('Firestore setDoc user profile warning:', err);
    }

    // Sign out from Firebase immediately so user can log in via the login screen
    try { await fbSignOut(auth); } catch (_) {}
    setCurrentUser(DEFAULT_PROFILE);
    setFirebaseUser(null);
    localStorage.removeItem('srsplatform_active_user');
    await loadAllUsers();
  };

  const logout = async () => {
    try { await fbSignOut(auth); } catch (_) {}
    setCurrentUser(DEFAULT_PROFILE);
    setFirebaseUser(null);
    localStorage.removeItem('srsplatform_active_user');
  };

  const switchProfile = (userId: string) => {
    const found = allUsers.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('srsplatform_active_user', JSON.stringify(found));
    }
  };

  const updateProfileBio = async (bio: string, interests: string[], emergencyContact: string) => {
    const updated: UserProfile = {
      ...currentUser, bio, interests, emergencyContact,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);
    localStorage.setItem('srsplatform_active_user', JSON.stringify(updated));
    if (firebaseUser && !firebaseUser.isAnonymous) {
      try {
        await setDoc(doc(db, 'users', currentUser.id), updated, { merge: true });
        await loadAllUsers();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.id}`);
      }
    }
  };

  const updateVehicleInfo = async (vehicleModel: string, vehicleNumber: string, carPhotos: string[]) => {
    const updated: UserProfile = {
      ...currentUser,
      vehicleModel,
      vehicleNumber,
      carPhotos,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);
    localStorage.setItem('srsplatform_active_user', JSON.stringify(updated));

    // Update local registry
    try {
      const reg = JSON.parse(localStorage.getItem('srsplatform_user_registry') || '{}');
      reg[currentUser.id] = updated;
      if (updated.email) reg[updated.email.toLowerCase()] = updated;
      localStorage.setItem('srsplatform_user_registry', JSON.stringify(reg));
    } catch (_) {}

    // Update Express backend API
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (_) {}

    // Update Firestore
    try {
      await setDoc(doc(db, 'users', currentUser.id), updated, { merge: true });
      await loadAllUsers();
    } catch (err) {
      console.warn('Firestore update vehicle error (offline?):', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser, firebaseUser, isOnline, allUsers,
      loginWithGoogle, loginAnonymously, registerWithEmail,
      logout, switchProfile, updateProfileBio, updateVehicleInfo,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
