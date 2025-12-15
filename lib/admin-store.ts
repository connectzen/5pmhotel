// Simple state management for admin data
export interface KPIData {
  todayCheckIns: number
  todayCheckOuts: number
  occupancyRate: number
  revenueThisMonth: number
}

export interface Booking {
  id: string
  customer: string
  room: string
  dates: string
  status: "pending" | "approved" | "rejected" | "checked-in" | "checked-out" | "cancelled"
  amount: number
}

export type RatePlanKey =
  | "bedOnly"
  | "bedBreakfast"
  | "bedWine"
  | "bedMeal"
  | "halfBoard"
  | "fullBoard"

export interface RatePlanPrices {
  /**
   * Single amount for this plan (e.g. Bed & Breakfast rate).
   * For legacy data we may still have single/double/twin persisted;
   * helpers should treat `amount` as the source of truth.
   */
  amount?: number
  // Legacy fields kept optional for backward compatibility
  single?: number
  double?: number
  twin?: number
  note?: string
}

export type RatePlans = Partial<Record<RatePlanKey, RatePlanPrices>>

export interface Room {
  id: string
  name: string
  capacity: number
  price: number
  status: "active" | "inactive"
  amenities: string[]
  quantity: number
  images?: string[]
  /**
   * Optional per-plan pricing (e.g., Bed & Breakfast, Half Board, etc.)
   * keyed by plan name with per-occupancy rates.
   */
  ratePlans?: RatePlans
}

export interface Venue {
  id: string
  name: string
  capacity: number
  price: number
  status: "active" | "inactive"
  description?: string
  images?: string[]
  // Optional detailed configuration for events/venues
  capacities?: {
    theatre?: number
    classroom?: number
    uShape?: number
    boardroom?: number
  }
  operatingHours?: {
    start?: string // "08:00"
    end?: string   // "22:00"
  }
  setupInclusions?: string[] // e.g., ["Audio Visual", "Breakout rooms", ...]
  packages?: Array<{
    id: string
    name: string
    description?: string
    durationHours?: number
    cateringIncluded?: boolean
    price?: number
  }>
}

export interface Payment {
  id: string
  bookingId: string
  amount: number
  method: "card" | "mpesa" | "cash"
  status: "pending" | "completed" | "failed"
  date: string
}

// Mock data
export const mockKPIData: KPIData = {
  todayCheckIns: 12,
  todayCheckOuts: 8,
  occupancyRate: 87,
  revenueThisMonth: 245000,
}

export const mockBookings: Booking[] = [
  {
    id: "BK001",
    customer: "John Doe",
    room: "Deluxe Suite",
    dates: "2025-11-01 - 2025-11-03",
    status: "approved",
    amount: 45000,
  },
  {
    id: "BK002",
    customer: "Jane Smith",
    room: "Standard Room",
    dates: "2025-11-02 - 2025-11-04",
    status: "pending",
    amount: 25000,
  },
  {
    id: "BK003",
    customer: "Mike Johnson",
    room: "Presidential Suite",
    dates: "2025-11-05 - 2025-11-07",
    status: "approved",
    amount: 85000,
  },
]

export const mockRooms: Room[] = [
  {
    id: "R001",
    name: "Standard Room",
    capacity: 2,
    price: 4000,
    status: "active",
    amenities: ["WiFi", "AC", "TV"],
    quantity: 10,
    images: ["/luxury-single-room.jpg"],
    ratePlans: {
      bedOnly: { single: 4000, double: 4000 },
      bedBreakfast: { single: 5000, double: 6000 },
      bedWine: { single: 5500, double: 5500, note: "Twin includes 1 bottle" },
      bedMeal: { single: 5500, double: 7000 },
      halfBoard: { single: 6500, double: 9000 },
      fullBoard: { single: 8500, double: 13000 },
    },
  },
  {
    id: "R002",
    name: "Deluxe Suite",
    capacity: 4,
    price: 6000,
    status: "active",
    amenities: ["WiFi", "AC", "TV", "Mini Bar"],
    quantity: 8,
    images: ["/luxury-suite.jpg"],
    ratePlans: {
      bedOnly: { single: 6000, double: 6000, twin: 9000 },
      bedBreakfast: { single: 7000, double: 8000, twin: 11000 },
      bedWine: { single: 7500, double: 7500, twin: 11000, note: "Twin includes 1 bottle" },
      bedMeal: { single: 7500, double: 9000, twin: 12000 },
      halfBoard: { single: 8500, double: 11000, twin: 14000 },
      fullBoard: { single: 10500, double: 15000, twin: 18000 },
    },
  },
  {
    id: "R003",
    name: "Presidential Suite",
    capacity: 6,
    price: 8500,
    status: "active",
    amenities: ["WiFi", "AC", "TV", "Mini Bar", "Jacuzzi"],
    quantity: 3,
    images: ["/luxury-triple-room.jpg"],
    ratePlans: {
      bedOnly: { single: 8500, double: 8500, twin: 15000 },
      bedBreakfast: { single: 9500, double: 10500, twin: 17000 },
      bedWine: { single: 10000, double: 10000, twin: 17000, note: "Twin includes 1 bottle" },
      bedMeal: { single: 10000, double: 11500, twin: 17500 },
      halfBoard: { single: 11000, double: 14000, twin: 20000 },
      fullBoard: { single: 13000, double: 18000, twin: 23000 },
    },
  },
]

export const mockVenues: Venue[] = [
  {
    id: "V001",
    name: "Grand Ballroom",
    capacity: 500,
    price: 150000,
    status: "active",
    description: "Elegant ballroom suitable for large conferences and galas.",
    images: ["/luxury-ballroom.jpg"],
  },
  {
    id: "V002",
    name: "Conference Hall",
    capacity: 200,
    price: 75000,
    status: "active",
    description: "Modern hall ideal for workshops and seminars.",
    images: ["/conference-room.jpg"],
  },
  {
    id: "V003",
    name: "Garden Pavilion",
    capacity: 300,
    price: 100000,
    status: "active",
    description: "Open-air pavilion perfect for weddings and receptions.",
    images: ["/garden-venue.jpg"],
  },
]

export const mockPayments: Payment[] = [
  { id: "P001", bookingId: "BK001", amount: 45000, method: "card", status: "completed", date: "2025-10-28" },
  { id: "P002", bookingId: "BK002", amount: 25000, method: "mpesa", status: "pending", date: "2025-10-29" },
  { id: "P003", bookingId: "BK003", amount: 85000, method: "card", status: "completed", date: "2025-10-30" },
]
