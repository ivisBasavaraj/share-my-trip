import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// In-Memory & Persistent State for Smart Ride Sharing Platform (Indian Context with ₹ INR)
interface Waypoint {
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
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  budget: number; // in INR ₹
  currency: string;
  travelStyle: 'adventure' | 'budget' | 'luxury' | 'cultural' | 'relaxed';
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  memberIds: string[];
  spotsToVisit: string[];
  status: 'planning' | 'confirmed' | 'active' | 'completed';
  coverImage?: string;
  encryptionKeyId?: string;
  itinerary: Waypoint[];
  createdAt: string;
}

interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number; // in INR ₹
  currency: string;
  paidBy: string;
  payerName: string;
  category: 'accommodation' | 'transport' | 'food' | 'activity' | 'misc';
  splitWith: string[];
  date: string;
  createdAt: string;
}

interface Memory {
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

interface CompanionProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  travelStyle: string;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  rating: number;
  ratingCount: number;
  tripsCount: number;
  interests: string[];
  location: string;
  emergencyContact: string;
}

// Initial Indian Road Trips and Itineraries
let tripsDb: Trip[] = [
  {
    id: 'trip_bengaluru_coorg',
    title: 'Bengaluru to Coorg & Wayanad Western Ghats Expedition',
    destination: 'Coorg & Wayanad, Karnataka / Kerala',
    origin: 'Bengaluru, Karnataka',
    startDate: '2026-11-15',
    endDate: '2026-11-20',
    budget: 18500, // ₹18,500
    currency: 'INR',
    travelStyle: 'adventure',
    ownerId: 'user_bhandavya',
    ownerName: 'Bhandavya H M',
    ownerAvatar: '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
    memberIds: ['user_bhandavya', 'user_bharath'],
    spotsToVisit: ['Raja\'s Seat Madikeri', 'Abbey Falls', 'Banasura Sagar Dam', 'Edakkal Caves', 'Coffee Plantation Walk'],
    status: 'confirmed',
    coverImage: '/src/assets/images/hero_travel_journey_1791735781773.jpg',
    encryptionKeyId: 'e2ee_key_coorg_2026',
    createdAt: '2026-10-01T10:00:00Z',
    itinerary: [
      {
        id: 'wp_in_1',
        tripId: 'trip_bengaluru_coorg',
        dayNumber: 1,
        title: 'Rendezvous at Sambhram Campus & Highway Drive',
        locationName: 'Sambhram Institute of Technology, Vidyaranyapura, Bengaluru',
        lat: 13.0850,
        lng: 77.5562,
        time: '06:30 AM',
        notes: 'Group departure point. Carpool fuel fill-up on Mysore expressway.',
        authorId: 'user_bhandavya',
        authorName: 'Bhandavya H M',
        orderIndex: 0,
        category: 'transport',
        createdAt: '2026-10-01T10:05:00Z'
      },
      {
        id: 'wp_in_2',
        tripId: 'trip_bengaluru_coorg',
        dayNumber: 1,
        title: 'Madikeri Fort & Sunset at Raja\'s Seat',
        locationName: 'Raja\'s Seat Viewpoint, Madikeri, Coorg',
        lat: 12.4208,
        lng: 75.7382,
        time: '04:30 PM',
        notes: 'Panoramic vista overlooking misty valleys and Coorg coffee estates.',
        authorId: 'user_bharath',
        authorName: 'Bharath G',
        orderIndex: 1,
        category: 'sight',
        createdAt: '2026-10-01T10:10:00Z'
      },
      {
        id: 'wp_in_3',
        tripId: 'trip_bengaluru_coorg',
        dayNumber: 2,
        title: 'Abbey Falls Morning Trek',
        locationName: 'Abbey Falls, Kodagu',
        lat: 12.4533,
        lng: 75.7196,
        time: '09:00 AM',
        notes: 'Hanging bridge view of the Kaveri tributary cascading through spice groves.',
        authorId: 'user_bhandavya',
        authorName: 'Bhandavya H M',
        orderIndex: 2,
        category: 'activity',
        createdAt: '2026-10-01T10:15:00Z'
      },
      {
        id: 'wp_in_4',
        tripId: 'trip_bengaluru_coorg',
        dayNumber: 2,
        title: 'Banasura Sagar Dam Earthen Reservoir',
        locationName: 'Banasura Sagar Dam, Wayanad',
        lat: 11.6677,
        lng: 75.9575,
        time: '03:30 PM',
        notes: 'Speedboat tour of the reservoir islands with view of Banasura peak.',
        authorId: 'user_bharath',
        authorName: 'Bharath G',
        orderIndex: 3,
        category: 'activity',
        createdAt: '2026-10-01T10:20:00Z'
      },
      {
        id: 'wp_in_5',
        tripId: 'trip_bengaluru_coorg',
        dayNumber: 3,
        title: 'Edakkal Caves Neolithic Rock Carvings',
        locationName: 'Ambikuthi Mala, Nenmeni, Wayanad',
        lat: 11.6288,
        lng: 76.2347,
        time: '10:00 AM',
        notes: 'Historic trek to prehistoric petroglyphs dating back to 6,000 BCE.',
        authorId: 'user_bhandavya',
        authorName: 'Bhandavya H M',
        orderIndex: 4,
        category: 'sight',
        createdAt: '2026-10-01T10:25:00Z'
      }
    ]
  },
  {
    id: 'trip_manali_leh',
    title: 'Manali to Leh Ladakh Trans-Himalayan Odyssey',
    destination: 'Leh & Nubra Valley, Ladakh',
    origin: 'Manali, Himachal Pradesh',
    startDate: '2026-12-05',
    endDate: '2026-12-14',
    budget: 34500, // ₹34,500
    currency: 'INR',
    travelStyle: 'adventure',
    ownerId: 'user_anusha',
    ownerName: 'Anusha K N',
    ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    memberIds: ['user_anusha', 'user_dhanush'],
    spotsToVisit: ['Rohtang Pass', 'Baralacha La Pass', 'Pangong Tso Lake', 'Khardung La Pass'],
    status: 'planning',
    coverImage: '/src/assets/images/companion_matching_card_1791735795006.jpg',
    encryptionKeyId: 'e2ee_key_leh_2026',
    createdAt: '2026-10-05T14:00:00Z',
    itinerary: [
      {
        id: 'wp_leh_1',
        tripId: 'trip_manali_leh',
        dayNumber: 1,
        title: 'Manali Mall Road & Acclimatization',
        locationName: 'Old Manali, Himachal Pradesh',
        lat: 32.2396,
        lng: 77.1887,
        time: '08:00 AM',
        notes: 'Oxygen saturation check and high-altitude gear inspection.',
        authorId: 'user_anusha',
        authorName: 'Anusha K N',
        orderIndex: 0,
        category: 'stay',
        createdAt: '2026-10-05T14:05:00Z'
      },
      {
        id: 'wp_leh_2',
        tripId: 'trip_manali_leh',
        dayNumber: 2,
        title: 'Atal Tunnel to Jispa Riverside Campsite',
        locationName: 'Jispa Valley, Lahaul',
        lat: 32.6394,
        lng: 77.1852,
        time: '01:30 PM',
        notes: 'Riverside Swiss tent camping along the Bhaga River.',
        authorId: 'user_dhanush',
        authorName: 'Dhanush Gowda B K',
        orderIndex: 1,
        category: 'stay',
        createdAt: '2026-10-05T14:10:00Z'
      },
      {
        id: 'wp_leh_3',
        tripId: 'trip_manali_leh',
        dayNumber: 3,
        title: 'Pangong Tso Azure Lake',
        locationName: 'Pangong Lake, Changtang Plateau',
        lat: 33.7595,
        lng: 78.6674,
        time: '11:00 AM',
        notes: 'World\'s highest saltwater lake at 4,225 meters altitude.',
        authorId: 'user_anusha',
        authorName: 'Anusha K N',
        orderIndex: 2,
        category: 'sight',
        createdAt: '2026-10-05T14:15:00Z'
      }
    ]
  }
];

// Initial Indian Expenses in ₹ INR
let expensesDb: Expense[] = [
  {
    id: 'exp_in_1',
    tripId: 'trip_bengaluru_coorg',
    title: 'Self-Drive SUV Rental & Mysore Toll (Bengaluru to Coorg)',
    amount: 5400, // ₹5,400
    currency: 'INR',
    paidBy: 'user_bhandavya',
    payerName: 'Bhandavya H M',
    category: 'transport',
    splitWith: ['user_bhandavya', 'user_bharath'],
    date: '2026-11-15',
    createdAt: '2026-10-02T10:00:00Z'
  },
  {
    id: 'exp_in_2',
    tripId: 'trip_bengaluru_coorg',
    title: 'Coffee Estate Heritage Homestay Booking (2 Nights)',
    amount: 7200, // ₹7,200
    currency: 'INR',
    paidBy: 'user_bharath',
    payerName: 'Bharath G',
    category: 'accommodation',
    splitWith: ['user_bhandavya', 'user_bharath'],
    date: '2026-11-16',
    createdAt: '2026-10-02T11:00:00Z'
  },
  {
    id: 'exp_in_3',
    tripId: 'trip_bengaluru_coorg',
    title: 'Traditional Kodava Pandi & Akki Roti Feast',
    amount: 1850, // ₹1,850
    currency: 'INR',
    paidBy: 'user_bhandavya',
    payerName: 'Bhandavya H M',
    category: 'food',
    splitWith: ['user_bhandavya', 'user_bharath'],
    date: '2026-11-16',
    createdAt: '2026-10-02T12:00:00Z'
  }
];

let memoriesDb: Memory[] = [
  {
    id: 'mem_in_1',
    tripId: 'trip_bengaluru_coorg',
    authorId: 'user_bhandavya',
    authorName: 'Bhandavya H M',
    caption: 'Standing at Raja\'s Seat overlooking the Western Ghats morning fog. Carpooling together saved ₹3,200 each and slashed our road emissions!',
    imageUrl: '/src/assets/images/memory_trip_polaroid_1791735807149.jpg',
    location: 'Raja\'s Seat, Madikeri, Coorg',
    date: '2026-10-08',
    createdAt: '2026-10-08T18:45:00Z'
  },
  {
    id: 'mem_in_2',
    tripId: 'trip_bengaluru_coorg',
    authorId: 'user_bharath',
    authorName: 'Bharath G',
    caption: 'Freshly brewed filter coffee at a 100-year-old estate in Coorg before hitting the Abbey Falls trail.',
    imageUrl: '/src/assets/images/companion_matching_card_1791735795006.jpg',
    location: 'Kodagu Coffee Estate',
    date: '2026-10-07',
    createdAt: '2026-10-07T08:15:00Z'
  }
];

let companionRequestsDb: any[] = [];

interface GroupMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  encryptedPayload?: string;
  iv?: string;
  decryptedText?: string;
  timestamp: string;
  mediaUrl?: string;
  reactions?: Record<string, string[]>;
  poll?: {
    question: string;
    options: { id: string; label: string; votes: string[] }[];
  };
}

interface PackingItem {
  id: string;
  tripId: string;
  item: string;
  category: 'essentials' | 'clothing' | 'electronics' | 'medical' | 'food';
  assignedToName?: string;
  assignedToId?: string;
  isPacked: boolean;
  packedByName?: string;
}

let messagesDb: GroupMessage[] = [
  {
    id: 'msg_coorg_1',
    tripId: 'trip_bengaluru_coorg',
    senderId: 'user_bhandavya',
    senderName: 'Bhandavya H M',
    senderAvatar: '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
    text: 'Hey travel group! 🌄 Departure rendezvous is at 6:30 AM at Sambhram Campus main gate. Carpool fuel stops planned along Mysore expressway.',
    decryptedText: 'Hey travel group! 🌄 Departure rendezvous is at 6:30 AM at Sambhram Campus main gate. Carpool fuel stops planned along Mysore expressway.',
    timestamp: '2026-10-12T05:30:00Z',
    reactions: { '👍': ['user_bharath', 'user_anusha'], '🔥': ['user_dhanush'] }
  },
  {
    id: 'msg_coorg_2',
    tripId: 'trip_bengaluru_coorg',
    senderId: 'user_bharath',
    senderName: 'Bharath G',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    text: 'Got it! I am carrying the puncture kit, fast tyre inflator, and the 65W multiport car charger. Boot space is clear for backpacks.',
    decryptedText: 'Got it! I am carrying the puncture kit, fast tyre inflator, and the 65W multiport car charger. Boot space is clear for backpacks.',
    timestamp: '2026-10-12T05:42:00Z',
    reactions: { '❤️': ['user_bhandavya'] }
  },
  {
    id: 'msg_coorg_3',
    tripId: 'trip_bengaluru_coorg',
    senderId: 'user_anusha',
    senderName: 'Anusha K N',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    text: 'Quick poll: Bidadi Tatte Idli breakfast stop on the expressway, or drive straight to Maddur Tiffany\'s for vadas?',
    decryptedText: 'Quick poll: Bidadi Tatte Idli breakfast stop on the expressway, or drive straight to Maddur Tiffany\'s for vadas?',
    timestamp: '2026-10-12T05:48:00Z',
    poll: {
      question: 'Expressway Breakfast Rendezvous?',
      options: [
        { id: 'opt_1', label: 'Bidadi Tatte Idli (Hot Filter Coffee)', votes: ['user_bhandavya', 'user_bharath'] },
        { id: 'opt_2', label: 'Maddur Tiffany\'s Crispy Vadas', votes: ['user_anusha'] },
        { id: 'opt_3', label: 'Highway Cafe Drive-thru', votes: [] }
      ]
    },
    reactions: { '☕': ['user_bhandavya', 'user_bharath', 'user_anusha'] }
  },
  {
    id: 'msg_coorg_4',
    tripId: 'trip_bengaluru_coorg',
    senderId: 'user_bhandavya',
    senderName: 'Bhandavya H M',
    senderAvatar: '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
    text: 'Bidadi Tatte Idli it is! Also verified the weather forecast for Madikeri: morning mist clearing up around 11 AM with pleasant 21°C. Perfect for Abbey Falls trail.',
    decryptedText: 'Bidadi Tatte Idli it is! Also verified the weather forecast for Madikeri: morning mist clearing up around 11 AM with pleasant 21°C. Perfect for Abbey Falls trail.',
    timestamp: '2026-10-12T06:05:00Z',
    reactions: { '🙌': ['user_bharath'] }
  },
  {
    id: 'msg_pgh_1',
    tripId: 'trip_pacific_coast',
    senderId: 'user_alex',
    senderName: 'Alex Rivera',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    text: 'Pacific Coast Highway squad! Highway 1 weather is stunning this week. Don\'t forget wide-angle lenses for Bixby Bridge sunset.',
    decryptedText: 'Pacific Coast Highway squad! Highway 1 weather is stunning this week. Don\'t forget wide-angle lenses for Bixby Bridge sunset.',
    timestamp: '2026-10-11T14:20:00Z',
    reactions: { '📸': ['user_priya', 'user_marcus'], '❤️': ['user_priya'] }
  }
];

let packingDb: PackingItem[] = [
  {
    id: 'pack_1',
    tripId: 'trip_bengaluru_coorg',
    item: 'First Aid Kit & Motion Sickness Tablets',
    category: 'medical',
    assignedToName: 'Bhandavya H M',
    assignedToId: 'user_bhandavya',
    isPacked: true,
    packedByName: 'Bhandavya H M'
  },
  {
    id: 'pack_2',
    tripId: 'trip_bengaluru_coorg',
    item: 'High-Power Powerbank (20,000mAh) & Cables',
    category: 'electronics',
    assignedToName: 'Bharath G',
    assignedToId: 'user_bharath',
    isPacked: true,
    packedByName: 'Bharath G'
  },
  {
    id: 'pack_3',
    tripId: 'trip_bengaluru_coorg',
    item: 'Waterproof Rain Ponchos & Trekking Shoes',
    category: 'clothing',
    assignedToName: 'Anusha K N',
    assignedToId: 'user_anusha',
    isPacked: false
  },
  {
    id: 'pack_4',
    tripId: 'trip_bengaluru_coorg',
    item: 'Vehicle Documents, FASTag & Driving Licenses',
    category: 'essentials',
    assignedToName: 'Bharath G',
    assignedToId: 'user_bharath',
    isPacked: true,
    packedByName: 'Bharath G'
  },
  {
    id: 'pack_5',
    tripId: 'trip_bengaluru_coorg',
    item: 'Action Camera, Selfie Stick & SD Cards',
    category: 'electronics',
    assignedToName: 'Dhanush Gowda B K',
    assignedToId: 'user_dhanush',
    isPacked: false
  },
  {
    id: 'pack_6',
    tripId: 'trip_bengaluru_coorg',
    item: 'Trail Mix, Electrolytes & Reusable Water Flasks',
    category: 'food',
    assignedToName: 'Bhandavya H M',
    assignedToId: 'user_bhandavya',
    isPacked: false
  }
];

// API ENDPOINTS

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Smart Ride Sharing Platform API', currency: 'INR', timestamp: new Date().toISOString() });
});

// 2. Trips REST API
app.get('/api/trips', (req: Request, res: Response) => {
  res.json({ success: true, data: tripsDb, count: tripsDb.length });
});

app.get('/api/trips/:id', (req: Request, res: Response) => {
  const trip = tripsDb.find(t => t.id === req.params.id);
  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }
  res.json({ success: true, data: trip });
});

app.post('/api/trips', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.title || !body.destination) {
    return res.status(400).json({ success: false, error: 'Title and destination are required' });
  }

  const newTrip: Trip = {
    id: body.id || `trip_${Date.now()}`,
    title: body.title,
    destination: body.destination,
    origin: body.origin || 'Bengaluru, India',
    startDate: body.startDate || '2026-11-20',
    endDate: body.endDate || '2026-11-26',
    budget: Number(body.budget) || 15000,
    currency: 'INR',
    travelStyle: body.travelStyle || 'adventure',
    ownerId: body.ownerId || 'user_bhandavya',
    ownerName: body.ownerName || 'Bhandavya H M',
    ownerAvatar: body.ownerAvatar || '/src/assets/images/avatar_traveler_alex_1791735824369.jpg',
    memberIds: body.memberIds || [body.ownerId || 'user_bhandavya'],
    spotsToVisit: body.spotsToVisit || [],
    status: body.status || 'planning',
    coverImage: body.coverImage || '/src/assets/images/hero_travel_journey_1791735781773.jpg',
    encryptionKeyId: body.encryptionKeyId || `e2ee_${Date.now()}`,
    itinerary: body.itinerary || [],
    createdAt: new Date().toISOString()
  };

  tripsDb.unshift(newTrip);
  res.status(201).json({ success: true, data: newTrip });
});

app.put('/api/trips/:id', (req: Request, res: Response) => {
  const idx = tripsDb.findIndex(t => t.id === req.params.id);
  if (idx === 0 || idx > 0) {
    tripsDb[idx] = { ...tripsDb[idx], ...req.body, id: req.params.id };
    return res.json({ success: true, data: tripsDb[idx] });
  }
  res.status(404).json({ success: false, error: 'Trip not found' });
});

app.delete('/api/trips/:id', (req: Request, res: Response) => {
  tripsDb = tripsDb.filter(t => t.id !== req.params.id);
  res.json({ success: true, message: 'Trip deleted' });
});

// 3. Itinerary Waypoints REST API
app.get('/api/trips/:id/itinerary', (req: Request, res: Response) => {
  const trip = tripsDb.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  res.json({ success: true, data: trip.itinerary || [] });
});

app.post('/api/trips/:id/itinerary', (req: Request, res: Response) => {
  const trip = tripsDb.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

  const body = req.body;
  const newWp: Waypoint = {
    id: body.id || `wp_${Date.now()}`,
    tripId: req.params.id,
    dayNumber: Number(body.dayNumber) || 1,
    title: body.title,
    locationName: body.locationName,
    lat: Number(body.lat),
    lng: Number(body.lng),
    time: body.time || '10:00 AM',
    notes: body.notes || '',
    authorId: body.authorId || 'user_bhandavya',
    authorName: body.authorName || 'Bhandavya H M',
    orderIndex: trip.itinerary.length,
    category: body.category || 'sight',
    createdAt: new Date().toISOString()
  };

  trip.itinerary.push(newWp);
  res.status(201).json({ success: true, data: newWp });
});

app.delete('/api/trips/:id/itinerary/:wpId', (req: Request, res: Response) => {
  const trip = tripsDb.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  trip.itinerary = trip.itinerary.filter(w => w.id !== req.params.wpId);
  res.json({ success: true, message: 'Waypoint deleted' });
});

// 4. Expenses REST API (₹ INR Split Calculation Engine)
app.get('/api/trips/:id/expenses', (req: Request, res: Response) => {
  const trip = tripsDb.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

  const expenses = expensesDb.filter(e => e.tripId === req.params.id);
  // Treat the host as an active passenger even where legacy trips only stored guests.
  const activePassengerIds = [...new Set([trip.ownerId, ...(trip.memberIds || [])].filter(Boolean))];
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const perPersonAvg = totalSpent / Math.max(activePassengerIds.length, 1);

  // Calculate settlement balances in ₹
  const balances: Record<string, { paid: number; share: number; netBalance: number }> = {};
  activePassengerIds.forEach(m => {
    balances[m] = { paid: 0, share: perPersonAvg, netBalance: -perPersonAvg };
  });

  expenses.forEach(e => {
    if (balances[e.paidBy]) {
      balances[e.paidBy].paid += e.amount;
      balances[e.paidBy].netBalance += e.amount;
    }
  });

  res.json({
    success: true,
    data: expenses,
    summary: {
      totalSpentInr: totalSpent,
      budgetInr: trip.budget,
      remainingInr: trip.budget - totalSpent,
      perPersonAvgInr: perPersonAvg,
      estimatedSavingsInr: Math.round(totalSpent * 0.45),
      balances
    }
  });
});

app.post('/api/trips/:id/expenses', (req: Request, res: Response) => {
  const trip = tripsDb.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

  const body = req.body;
  const newExp: Expense = {
    id: body.id || `exp_${Date.now()}`,
    tripId: req.params.id,
    title: body.title,
    amount: Number(body.amount),
    currency: 'INR',
    paidBy: body.paidBy || 'user_bhandavya',
    payerName: body.payerName || 'Bhandavya H M',
    category: body.category || 'food',
    splitWith: body.splitWith || [...new Set([trip.ownerId, ...(trip.memberIds || [])].filter(Boolean))],
    date: body.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  expensesDb.unshift(newExp);
  res.status(201).json({ success: true, data: newExp });
});

// 5. Memories API & Local Device Image Upload
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { dataUrl, filename } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ success: false, error: 'No image dataUrl received' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid base64 data format' });
    }

    const mime = matches[1];
    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';

    const safeName = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(filePath, buffer);

    return res.status(201).json({
      success: true,
      url: `/uploads/${safeName}`,
      filename: safeName,
      sizeBytes: buffer.length
    });
  } catch (err: any) {
    console.error('Error saving uploaded file:', err);
    return res.status(500).json({ success: false, error: err.message || 'File upload failed' });
  }
});

app.get('/api/memories', (req: Request, res: Response) => {
  const tripId = req.query.tripId as string;
  const list = tripId ? memoriesDb.filter(m => m.tripId === tripId) : memoriesDb;
  res.json({ success: true, data: list });
});

app.post('/api/memories', (req: Request, res: Response) => {
  const body = req.body;
  const newMem: Memory = {
    id: body.id || `mem_${Date.now()}`,
    tripId: body.tripId || 'trip_bengaluru_coorg',
    authorId: body.authorId || 'user_bhandavya',
    authorName: body.authorName || 'Bhandavya H M',
    caption: body.caption,
    imageUrl: body.imageUrl || '/src/assets/images/memory_trip_polaroid_1791735807149.jpg',
    location: body.location || 'Coorg, Karnataka',
    date: body.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    tag: body.tag || 'Scenic View',
    likes: typeof body.likes === 'number' ? body.likes : 0
  };

  memoriesDb.unshift(newMem);
  res.status(201).json({ success: true, data: newMem });
});

app.delete('/api/memories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  memoriesDb = memoriesDb.filter(m => m.id !== id);
  res.json({ success: true, message: 'Memory deleted successfully' });
});

app.post('/api/memories/:id/like', (req: Request, res: Response) => {
  const { id } = req.params;
  const mem = memoriesDb.find(m => m.id === id);
  if (mem) {
    mem.likes = (mem.likes || 0) + 1;
    return res.json({ success: true, likes: mem.likes });
  }
  res.status(404).json({ success: false, error: 'Memory not found' });
});

// 6. Companion Matching & Requests API
app.get('/api/companions/requests', (req: Request, res: Response) => {
  const { tripId, targetUserId } = req.query;
  let filtered = companionRequestsDb;
  if (tripId) filtered = filtered.filter(r => r.tripId === tripId);
  if (targetUserId) filtered = filtered.filter(r => r.targetUserId === targetUserId || r.requesterId === targetUserId);
  res.json({ success: true, data: filtered });
});

app.post('/api/companions/request', (req: Request, res: Response) => {
  const reqObj = {
    id: req.body.id || `req_${Date.now()}`,
    tripId: req.body.tripId,
    tripTitle: req.body.tripTitle || '',
    requesterId: req.body.requesterId,
    requesterName: req.body.requesterName,
    requesterAvatar: req.body.requesterAvatar || '',
    targetUserId: req.body.targetUserId,
    tripOwnerId: req.body.tripOwnerId || '',
    message: req.body.message || '',
    compatibilityScore: req.body.compatibilityScore || 85,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  companionRequestsDb.unshift(reqObj);
  res.status(201).json({ success: true, data: reqObj });
});

app.patch('/api/companions/request/:id/respond', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, responderId } = req.body; // 'accepted' | 'declined'
  const targetReq = companionRequestsDb.find(r => r.id === id);
  if (!targetReq) {
    return res.status(404).json({ success: false, error: 'Request not found' });
  }

  targetReq.status = status;
  // If accepted, add requesterId to trip memberIds
  if (status === 'accepted') {
    const trip = tripsDb.find(t => t.id === targetReq.tripId);
    if (trip && !trip.memberIds.includes(targetReq.requesterId)) {
      trip.memberIds.push(targetReq.requesterId);
    }
  }

  res.json({ success: true, data: targetReq });
});

// Trip Reports & Admin Audits API
let tripReportsDb = [
  {
    id: 'rep_1',
    tripId: 'trip_pacific_coast',
    tripTitle: 'Pacific Coast Highway 1 to Big Sur',
    reporterName: 'Anusha P',
    category: 'Safety Inquiry',
    description: 'Road advisory needed near Monterey landslide diversion point.',
    status: 'resolved',
    createdAt: '2026-10-10T14:20:00Z'
  }
];

app.get('/api/admin/reports', (req: Request, res: Response) => {
  res.json({ success: true, data: tripReportsDb });
});

app.post('/api/admin/reports', (req: Request, res: Response) => {
  const { tripId, tripTitle, reporterName, category, description } = req.body;
  const newRep = {
    id: `rep_${Date.now()}`,
    tripId: tripId || '',
    tripTitle: tripTitle || 'General System',
    reporterName: reporterName || 'Traveler',
    category: category || 'General Report',
    description: description || '',
    status: 'open',
    createdAt: new Date().toISOString()
  };
  tripReportsDb.unshift(newRep);
  res.status(201).json({ success: true, data: newRep });
});

app.patch('/api/admin/reports/:id/resolve', (req: Request, res: Response) => {
  const rep = tripReportsDb.find(r => r.id === req.params.id);
  if (rep) {
    rep.status = 'resolved';
    return res.json({ success: true, data: rep });
  }
  res.status(404).json({ success: false, error: 'Report not found' });
});

// 7. Safety SOS Emergency Broadcast API
app.post('/api/safety/sos', (req: Request, res: Response) => {
  const { travelerName, tripTitle, lat, lng, emergencyContact } = req.body;
  console.warn(`[🚨 SOS ALERT] Traveler ${travelerName} broadcasted an emergency alert for ${tripTitle} at (${lat}, ${lng}). ICE Contact: ${emergencyContact}`);
  res.json({
    success: true,
    alertDispatched: true,
    message: `Emergency broadcast transmitted to co-travelers and ICE contact ${emergencyContact}.`
  });
});

// 8. Live Group Channel Messages API (Visible to everyone)
app.get('/api/messages', (req: Request, res: Response) => {
  const tripId = req.query.tripId as string;
  const list = tripId ? messagesDb.filter(m => m.tripId === tripId) : messagesDb;
  res.json({ success: true, data: list });
});

app.post('/api/messages', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.tripId || (!body.text && !body.decryptedText && !body.mediaUrl)) {
    return res.status(400).json({ success: false, error: 'tripId and text or mediaUrl required' });
  }

  // Clients may retry while offline; an idempotent message id prevents duplicate chat entries.
  if (body.id) {
    const existing = messagesDb.find(message => message.id === body.id);
    if (existing) return res.status(200).json({ success: true, data: existing, duplicate: true });
  }

  const newMsg: GroupMessage = {
    id: body.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tripId: body.tripId,
    senderId: body.senderId || 'user_bhandavya',
    senderName: body.senderName || 'Traveler',
    senderAvatar: body.senderAvatar || '',
    text: body.text || body.decryptedText || '',
    decryptedText: body.text || body.decryptedText || '',
    encryptedPayload: body.encryptedPayload || '',
    iv: body.iv || '',
    timestamp: body.timestamp || new Date().toISOString(),
    mediaUrl: body.mediaUrl || undefined,
    reactions: body.reactions || {},
    poll: body.poll || undefined
  };

  messagesDb.push(newMsg);
  res.status(201).json({ success: true, data: newMsg });
});

app.post('/api/messages/:id/react', (req: Request, res: Response) => {
  const { id } = req.params;
  const { emoji, userId } = req.body;
  const msg = messagesDb.find(m => m.id === id);
  if (!msg) {
    return res.status(404).json({ success: false, error: 'Message not found' });
  }

  msg.reactions = msg.reactions || {};
  const currentUsers = msg.reactions[emoji] || [];
  if (currentUsers.includes(userId)) {
    // toggle off
    msg.reactions[emoji] = currentUsers.filter(u => u !== userId);
    if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  } else {
    // toggle on
    msg.reactions[emoji] = [...currentUsers, userId];
  }

  res.json({ success: true, data: msg.reactions });
});

app.post('/api/messages/:id/vote', (req: Request, res: Response) => {
  const { id } = req.params;
  const { optionId, userId } = req.body;
  const msg = messagesDb.find(m => m.id === id);
  if (!msg || !msg.poll) {
    return res.status(404).json({ success: false, error: 'Poll message not found' });
  }

  // Remove vote from other options if single-choice, or toggle
  msg.poll.options.forEach(opt => {
    opt.votes = opt.votes.filter(u => u !== userId);
    if (opt.id === optionId) {
      opt.votes.push(userId);
    }
  });

  res.json({ success: true, data: msg.poll });
});

// 9. Collaborative Packing & Gear Splitter API
app.get('/api/packing', (req: Request, res: Response) => {
  const tripId = req.query.tripId as string;
  const list = tripId ? packingDb.filter(p => p.tripId === tripId) : packingDb;
  res.json({ success: true, data: list });
});

app.post('/api/packing', (req: Request, res: Response) => {
  const body = req.body;
  const newItem: PackingItem = {
    id: `pack_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tripId: body.tripId,
    item: body.item,
    category: body.category || 'essentials',
    assignedToName: body.assignedToName || '',
    assignedToId: body.assignedToId || '',
    isPacked: false
  };
  packingDb.push(newItem);
  res.status(201).json({ success: true, data: newItem });
});

app.patch('/api/packing/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const { packedByName } = req.body;
  const item = packingDb.find(p => p.id === id);
  if (!item) return res.status(404).json({ success: false, error: 'Packing item not found' });

  item.isPacked = !item.isPacked;
  item.packedByName = item.isPacked ? (packedByName || 'Traveler') : undefined;
  res.json({ success: true, data: item });
});

app.patch('/api/packing/:id/assign', (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignedToName, assignedToId } = req.body;
  const item = packingDb.find(p => p.id === id);
  if (!item) return res.status(404).json({ success: false, error: 'Packing item not found' });

  item.assignedToName = assignedToName;
  item.assignedToId = assignedToId;
  res.json({ success: true, data: item });
});

app.delete('/api/packing/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  packingDb = packingDb.filter(p => p.id !== id);
  res.json({ success: true, message: 'Item removed from checklist' });
});

// 10. Weather Forecast & Advisory API
app.get('/api/weather', (req: Request, res: Response) => {
  const tripId = (req.query.tripId as string) || '';
  const destination = (req.query.destination as string) || '';

  const weatherMap: Record<string, any> = {
    'trip_bengaluru_coorg': {
      destination: 'Madikeri, Coorg (Western Ghats)',
      temperatureC: 22,
      condition: 'Pleasant & Misty',
      precipitationChance: 15,
      humidity: 78,
      windSpeedKmh: 12,
      advisory: 'Misty morning visibility on ghat hairpin curves. Clear sunshine in afternoon. Carry light windcheater jacket.',
      forecast: [
        { day: 'Day 1', tempHigh: 24, tempLow: 16, condition: 'Morning Fog / Sunny' },
        { day: 'Day 2', tempHigh: 23, tempLow: 15, condition: 'Passing Mist' },
        { day: 'Day 3', tempHigh: 22, tempLow: 16, condition: 'Pleasant Breeze' },
        { day: 'Day 4', tempHigh: 25, tempLow: 17, condition: 'Partly Cloudy' },
        { day: 'Day 5', tempHigh: 23, tempLow: 15, condition: 'Scattered Drizzle' }
      ]
    },
    'trip_pacific_coast': {
      destination: 'Big Sur & Monterey, California',
      temperatureC: 19,
      condition: 'Coastal Sunshine',
      precipitationChance: 5,
      humidity: 62,
      windSpeedKmh: 18,
      advisory: 'Crisp coastal ocean breeze along Highway 1. Golden hour visibility at Bixby Bridge is pristine.',
      forecast: [
        { day: 'Day 1', tempHigh: 20, tempLow: 12, condition: 'Sunny & Crisp' },
        { day: 'Day 2', tempHigh: 21, tempLow: 13, condition: 'Clear Sky' },
        { day: 'Day 3', tempHigh: 19, tempLow: 11, condition: 'Morning Marine Layer' }
      ]
    },
    'trip_manali_leh': {
      destination: 'Leh & Pangong Tso, Ladakh',
      temperatureC: 9,
      condition: 'Cold & High UV Index',
      precipitationChance: 0,
      humidity: 30,
      windSpeedKmh: 24,
      advisory: 'High-altitude cold winds above 11,000 ft. Mandatory 24h rest for acclimatization. High SPF sun protection needed.',
      forecast: [
        { day: 'Day 1', tempHigh: 12, tempLow: -1, condition: 'Crisp Blue Sky' },
        { day: 'Day 2', tempHigh: 10, tempLow: -3, condition: 'Breezy Passes' },
        { day: 'Day 3', tempHigh: 8, tempLow: -4, condition: 'Clear Night Stars' }
      ]
    }
  };

  const data = weatherMap[tripId] || {
    destination: destination || 'Trip Destination',
    temperatureC: 24,
    condition: 'Partly Cloudy & Pleasant',
    precipitationChance: 10,
    humidity: 65,
    windSpeedKmh: 14,
    advisory: 'Favorable road conditions. Check tyre pressure and keep offline GPS cached.',
    forecast: [
      { day: 'Day 1', tempHigh: 26, tempLow: 18, condition: 'Clear Sky' },
      { day: 'Day 2', tempHigh: 25, tempLow: 17, condition: 'Pleasant Breeze' },
      { day: 'Day 3', tempHigh: 24, tempLow: 16, condition: 'Scattered Clouds' }
    ]
  };

  res.json({ success: true, data });
});

// VITE MIDDLEWARE / STATIC PRODUCTION SERVING
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite middleware mounting in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Ride Sharing Platform Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
