// Unified Data Types for LoveWorld Singers Rehearsal Hub

export interface UserProfile {
  id: string;
  uid?: string;
  first_name?: string;
  firstName?: string;
  middle_name?: string;
  middleName?: string;
  last_name?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string | null;
  display_name?: string | null;
  username?: string;
  user_name?: string;
  alias?: string;
  email: string;
  phone_number?: string;
  phoneNumber?: string;
  gender?: string;
  birthday?: string;
  region?: string;
  zone?: string;
  zoneCode?: string;
  zone_code?: string;
  church?: string;
  designation?: string;
  administration?: string;
  role?: any;
  social_provider?: 'google' | 'kingschat' | 'email';
  social_id?: string;
  profile_image_url?: string;
  avatar?: string;
  avatar_url?: string | null;
  photoURL?: string;
  profile_completed?: boolean;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  kingschatId?: string;
  kingschatUserId?: string;
  kingschatEmail?: string;
  kingschatLinkedAt?: string;
  authProviders?: string[];
  has_seen_onboarding_tour?: boolean;
  onboarding_completed_at?: string;
  can_access_pre_rehearsal?: boolean;
  is_hq_member?: boolean;
  has_hq_access?: boolean;
  hasHqAccess?: boolean;
  can_manage_subgroups?: boolean;
  rehearsalCount?: number;
  expoPushToken?: string;
  expo_push_token?: string;
  raw?: any;
}

export interface UserGroup {
  id: string;
  user_id: string;
  group_name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  user1?: UserProfile;
  user2?: UserProfile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'voice' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  is_disappearing: boolean;
  expires_at?: string;
  is_screenshot_taken: boolean;
  screenshot_taken_at?: string;
  sender?: UserProfile;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: 'heart' | 'laugh' | 'wow' | 'sad' | 'angry' | 'thumbs_up';
  created_at: string;
  user?: UserProfile;
}

export interface Attendance {
  id: string;
  user_id: string;
  event_name: string;
  event_date: string;
  status: 'Present' | 'Late' | 'Absent';
  check_in_time?: string;
  created_at: string;
}

export interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ProfileCompletionData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: 'Male' | 'Female';
  birthday?: string;
  phoneNumber?: string;
  region?: string;
  zone?: string;
  church?: string;
  designation?: 'Soprano' | 'Alto' | 'Tenor' | 'Bass' | 'Instrumentalist' | 'Backup Singer';
  administration?: 'Coordinator' | 'Assistant Coordinator' | 'Secretary' | 'Treasurer' | 'Member';
}

// ─── Programs & Songs (Replaces PraiseNight) ───────────────────────────────

export interface Program {
  id: string;
  name: string;
  date: string;
  location?: string;
  category: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive';
  pageCategory?: string;
  scope?: 'zone' | 'subgroup';
  subGroupName?: string;
  bannerImage?: string;
  songCount?: number;
  categoryOrder?: string[];
  countdown?: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  songs?: Song[];
  zoneId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Song {
  id: string;
  title: string;
  status?: 'heard' | 'unheard';
  category?: string;
  categories?: string[];
  programId?: string;
  praiseNightId?: string; // Backward compatibility alias
  pageId?: string;
  isActive?: boolean;
  leadSinger?: string;
  writer?: string;
  conductor?: string;
  key?: string;
  tempo?: string;
  leadKeyboardist?: string;
  leadGuitarist?: string;
  bassGuitarist?: string;
  drummer?: string;
  lyrics?: string;
  solfas?: string;
  notation?: string;
  rehearsalCount?: number;
  audioFile?: string;
  mediaId?: number;
  imageUrl?: string;
  audioUrls?: Record<string, string>;
  customParts?: string[];
  availableParts?: string[];
  comments?: Comment[];
  history?: HistoryEntry[];
  zoneId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Aliases for transition
export type PraiseNight = Program;
export type PraiseNightSong = Song;

export interface Comment {
  id: string;
  text: string;
  audioUrl?: string;
  date: string;
  author: string;
}

export interface HistoryEntry {
  id: string;
  type: 'lyrics' | 'solfas' | 'notation' | 'audio' | 'comments' | 'song-details' | 'personnel' | 'music-details' | string;
  title: string;
  description: string;
  old_value: string;
  new_value: string;
  created_by: string;
  date: string | Date;
  version: string;
  audioUrl?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PageCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  zoneId?: string;
  orderIndex?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}