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
  bio: string;
  travelStyle: TravelStyle;
  interests: string[];
  homeCity?: string;
  phone?: string;
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
    emergencyContact: data.emergencyContact || '',
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

  // ── Load all users from Firestore ──
  const loadAllUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        setAllUsers(
          snap.docs.map(d => profileFromDoc(d.data() as Record<string, any>, d.id))
        );
      }
    } catch (err) {
      console.warn('Could not load all users (offline?):', err);
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

      try {
        const ref  = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const profile = profileFromDoc(snap.data() as Record<string, any>, user.uid);
          setCurrentUser(profile);
          localStorage.setItem('srsplatform_active_user', JSON.stringify(profile));
        } else {
          const newProfile: UserProfile = {
            id: user.uid,
            displayName: user.displayName || 'New Traveler',
            email: user.email || '',
            photoURL: user.photoURL || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
            bio: 'Passionate explorer on Smart Ride Sharing Platform.',
            travelStyle: 'adventure',
            verificationStatus: user.emailVerified ? 'verified' : 'pending',
            rating: 5.0, ratingCount: 0, tripsCount: 0,
            interests: ['Hiking', 'Culture', 'Eco-Travel'],
            createdAt: new Date().toISOString(),
          };
          await setDoc(ref, newProfile);
          setCurrentUser(newProfile);
          localStorage.setItem('srsplatform_active_user', JSON.stringify(newProfile));
        }
        await loadAllUsers();
      } catch (err) {
        console.warn('Firestore sync error (offline?):', err);
      }
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
      bio: payload.bio.trim(),
      travelStyle: payload.travelStyle,
      verificationStatus: 'pending',
      rating: 5.0, ratingCount: 0, tripsCount: 0,
      interests: payload.interests,
      emergencyContact: payload.phone ? `${payload.phone.trim()} (ICE)` : '',
      homeCity: payload.homeCity?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid), profile);
    setCurrentUser(profile);
    localStorage.setItem('srsplatform_active_user', JSON.stringify(profile));
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

  return (
    <AuthContext.Provider value={{
      currentUser, firebaseUser, isOnline, allUsers,
      loginWithGoogle, loginAnonymously, registerWithEmail,
      logout, switchProfile, updateProfileBio,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
