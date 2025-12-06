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

export interface Room {
  id: string
  name: string
  capacity: number
  price: number
  status: "active" | "inactive"
  amenities: string[]
  quantity: number
  images?: string[]
  paymentUrl?: string
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
    paymentUrl?: string
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
    price: 12500,
    status: "active",
    amenities: ["WiFi", "AC", "TV"],
    quantity: 10,
    images: ["/luxury-single-room.jpg"],
  },
  {
    id: "R002",
    name: "Deluxe Suite",
    capacity: 4,
    price: 22500,
    status: "active",
    amenities: ["WiFi", "AC", "TV", "Mini Bar"],
    quantity: 8,
    images: ["/luxury-suite.jpg"],
  },
  {
    id: "R003",
    name: "Presidential Suite",
    capacity: 6,
    price: 42500,
    status: "active",
    amenities: ["WiFi", "AC", "TV", "Mini Bar", "Jacuzzi"],
    quantity: 3,
    images: ["/luxury-triple-room.jpg"],
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
