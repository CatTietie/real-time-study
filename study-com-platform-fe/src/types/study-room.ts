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
}

export interface RoomReservation {
  id: number;
  user_id: number;
  room_id: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'ended';
  created_at: string;
  updated_at: string;
  StudyRoom?: {
    id: number;
    name: string;
    location: string;
  };
}