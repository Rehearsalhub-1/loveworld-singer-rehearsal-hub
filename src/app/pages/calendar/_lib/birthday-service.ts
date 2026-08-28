import { apiClient } from '@/lib/api-client';

export interface BirthdayUser {
  id: string;
  first_name: string;
  last_name: string;
  birthday: string;
  profile_image_url?: string;
  age?: number;
  isToday: boolean;
  zoneId?: string;
}

export class BirthdayService {
  /**
   * Get users with birthdays today and upcoming for a specific zone directly from the API
   */
  static async getTodayAndUpcomingBirthdays(zoneId?: string): Promise<BirthdayUser[]> {
    try {
      const zoneParam = zoneId && zoneId !== 'all' ? `?zoneId=${encodeURIComponent(zoneId)}` : '';
      const res = await apiClient.get<{ success: boolean; data?: BirthdayUser[] }>(`/profiles/birthdays${zoneParam}`);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (error) {
      console.error('[BirthdayService] Error fetching birthdays:', error);
      return [];
    }
  }
}
