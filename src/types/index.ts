export type TravelStyle = 'adventure' | 'budget' | 'luxury' | 'cultural' | 'relaxed' | 'nature' | 'foodie';
export type TripStatus = 'planning' | 'confirmed' | 'active' | 'completed';
export type VerificationStatus = 'verified' | 'pending' | 'unverified';

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  photoURL: string;
  bio: string;
  travelStyle: TravelStyle;
  verificationStatus: VerificationStatus;
  rating: number;
  ratingCount: number;
  tripsCount: number;
  interests: string[];
  homeCity?: string;
  emergencyContact?: string; // E2EE encrypted or phone
  createdAt: string;
  updatedAt?: string;
}

export interface Waypoint {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  locationName: string;
  lat: number;
  lng: number;
  time?: string;
  notes?: string;
  authorId: string;
  authorName?: string;
  orderIndex: number;
  category?: 'stay' | 'food' | 'sight' | 'transport' | 'activity';
  createdAt: string;
  updatedAt?: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  travelStyle: TravelStyle;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  memberIds: string[];
  members?: UserProfile[];
  spotsToVisit: string[];
  status: TripStatus;
  coverImage?: string;
  encryptionKeyId?: string;
  itinerary?: Waypoint[];
  createdAt: string;
  updatedAt?: string;
  // ── Ride-sharing specific fields ──
  vehicle?: string;          // e.g. "Car", "Van", "Bus"
  vehicleNumber?: string;    // e.g. "KA-01-AB-1234"
  totalSeats?: number;       // total seats in vehicle
  costPerPerson?: number;    // cost per seat in ₹
  departureTime?: string;    // e.g. "2026-11-15T06:30"
  notes?: string;            // additional notes from host
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  payerName: string;
  category: 'accommodation' | 'transport' | 'food' | 'activity' | 'misc';
  splitWith: string[];
  date: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  tripId: string;
  authorId: string;
  authorName: string;
  caption: string;
  imageUrl: string;
  location: string;
  date: string;
  createdAt: string;
  tag?: string;
  likes?: number;
}

export interface EncryptedMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string; // Clear text readable to everyone in the trip group
  encryptedPayload?: string; // Base64 ciphertext
  iv?: string; // Base64 IV
  decryptedText?: string; // Decrypted or direct text
  timestamp: string;
  mediaUrl?: string; // Attached photo or local moment
  reactions?: Record<string, string[]>; // e.g. { '👍': ['user_bhandavya'] }
  poll?: {
    question: string;
    options: { id: string; label: string; votes: string[] }[];
  };
}

export interface PackingItem {
  id: string;
  tripId: string;
  item: string;
  category: 'essentials' | 'clothing' | 'electronics' | 'medical' | 'food';
  assignedToName?: string;
  assignedToId?: string;
  isPacked: boolean;
  packedByName?: string;
}

export interface TripWeatherInfo {
  destination: string;
  temperatureC: number;
  condition: string;
  precipitationChance: number;
  humidity: number;
  windSpeedKmh: number;
  advisory: string;
  forecast: {
    day: string;
    tempHigh: number;
    tempLow: number;
    condition: string;
  }[];
}

export interface CompanionRequest {
  id: string;
  tripId: string;
  tripTitle?: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  targetUserId: string;      // ← the user who received the request
  tripOwnerId: string;
  status: 'pending' | 'accepted' | 'declined';
  message: string;
  compatibilityScore: number;
  createdAt: string;
}

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}
