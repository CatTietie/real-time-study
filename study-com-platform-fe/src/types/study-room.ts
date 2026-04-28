export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface StudyRoom {
  id: number;
  name: string;
  description: string;
  capacity: number;
  current_occupancy: number;
  location: string;
  facilities: Record<string, unknown>;
  image_url: string;
  status: 'active' | 'maintenance' | 'closed';
  created_at: string;
  updated_at: string;
  reserved_time_slots?: TimeSlot[];
}

export interface RoomReservation {
  id: number;
  user_id: number;
  room_id: number;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'ended';
  created_at: string;
  updated_at: string;
  StudyRoom?: {
    id: number;
    name: string;
    location: string;
  };
}

// 时间轴视图相关类型
export interface HourlyData {
  hour: number;
  reserved: number;
  available: number;
}

export interface RoomHourlyAvailability {
  id: number;
  name: string;
  capacity: number;
  location: string;
  image_url: string;
  hourlyData: HourlyData[];
}

export interface HourlyAvailabilityResponse {
  date: string;
  rooms: RoomHourlyAvailability[];
}