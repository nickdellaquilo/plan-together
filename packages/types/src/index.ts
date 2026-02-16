// User types
export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  bio?: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  hasCar: boolean;
  carSeats?: number;
  carMpg?: number;
  avatarColor: string;
  createdAt: Date;
  updatedAt: Date;
}

// Friend types
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendWithProfile extends Friendship {
  profile: Profile;
}

// Event types
export type EventStatus = 'planning' | 'confirmed' | 'cancelled';

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  invitedAt: Date;
  respondedAt?: Date;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  token: string;
  user: User & { profile: Profile };
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Profile update types
export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  phoneNumber?: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  hasCar?: boolean;
  carSeats?: number;
  carMpg?: number;
}