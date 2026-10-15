/**
 * mockData.ts
 * All seed data has been removed. The app now runs exclusively on
 * real Firestore data. These empty exports are kept so existing
 * imports don't break — they simply return empty arrays/objects.
 */

import { Trip, UserProfile, Memory, EncryptedMessage, PackingItem, TripWeatherInfo } from '../types';

export const INITIAL_USERS: UserProfile[]          = [];
export const INITIAL_TRIPS: Trip[]                 = [];
export const INITIAL_MEMORIES: Memory[]            = [];
export const INITIAL_MESSAGES: EncryptedMessage[]  = [];
export const INITIAL_PACKING_ITEMS: PackingItem[]  = [];
export const INITIAL_WEATHER_DATA: Record<string, TripWeatherInfo> = {};
