import { apiClient } from '@/lib/api-client';
import moment from 'moment';
import { isHQGroup } from '@/config/zones';

export interface UpcomingEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  time?: string;
  location?: string;
  image?: string;
  type: 'announcement' | 'event' | 'reminder' | 'meeting' | 'rehearsal';
  showInCarousel: boolean;
  isGlobal?: boolean;
  zoneId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

const EVENTS_CACHE_KEY = 'lwsrh-upcoming-events-cache';
const EVENTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface EventsCache {
  data: UpcomingEvent[];
  timestamp: number;
}

function getEventsCache(cacheKey: string): EventsCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const data: EventsCache = JSON.parse(cached);
    if (Date.now() - data.timestamp > EVENTS_CACHE_TTL) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setEventsCache(cacheKey: string, data: UpcomingEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    const cache: EventsCache = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export class UpcomingEventsService {
  /**
   * Get all upcoming events (next 60 days) for a specific zone
   * Includes global events automatically
   */
  static async getUpcomingEvents(zoneId: string, forceRefresh = false): Promise<UpcomingEvent[]> {
    try {
      const cacheKey = `${EVENTS_CACHE_KEY}_${zoneId || 'all'}`;
      if (!forceRefresh) {
        const cached = getEventsCache(cacheKey);
        if (cached) {
          return cached.data;
        }
      }

      const zoneParam = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : '';
      const res = await apiClient.get<any>(`/upcoming-events${zoneParam}`);
      let allEvents: UpcomingEvent[] = [];

      if (Array.isArray(res)) {
        allEvents = res;
      } else if (res && typeof res === 'object') {
        if (Array.isArray((res as any).data)) allEvents = (res as any).data;
        else if (Array.isArray((res as any).items)) allEvents = (res as any).items;
      }

      // Filter for zone-specific OR global events
      const filteredForZone = allEvents.filter(event => {
        if (!zoneId) return true;
        const isTargetZone = event.zoneId === zoneId;
        const isGlobal = event.isGlobal === true || !event.zoneId;
        const isBothHQ = isHQGroup(zoneId) && isHQGroup(event.zoneId);
        return isTargetZone || isGlobal || isBothHQ;
      });

      filteredForZone.sort((a, b) => moment(a.date).diff(moment(b.date)));

      setEventsCache(cacheKey, filteredForZone);
      return filteredForZone;
    } catch (error) {
      console.error(`[UpcomingEventsService] Error fetching events for zone ${zoneId}:`, error);
      return [];
    }
  }

  /**
   * Get events for carousel (showInCarousel !== false)
   */
  static async getCarouselEvents(zoneId: string): Promise<UpcomingEvent[]> {
    const allEvents = await this.getUpcomingEvents(zoneId);
    return allEvents.filter(event => event.showInCarousel !== false);
  }

  /**
   * Create a new upcoming event
   */
  static async createEvent(
    eventData: Omit<UpcomingEvent, 'id' | 'createdAt' | 'updatedAt'> & { zoneId?: string }
  ): Promise<UpcomingEvent> {
    try {
      const payload = {
        ...eventData,
        showInCarousel: eventData.showInCarousel !== false,
      };

      const res = await apiClient.post<any>('/upcoming-events', payload);
      const created = (res && res.data) ? res.data : res;

      // Invalidate cache
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`${EVENTS_CACHE_KEY}_${eventData.zoneId || 'all'}`);
        localStorage.removeItem(`${EVENTS_CACHE_KEY}_all`);
      }

      return created as UpcomingEvent;
    } catch (error) {
      console.error('[UpcomingEventsService] Error creating upcoming event:', error);
      throw error;
    }
  }

  /**
   * Update an existing upcoming event
   */
  static async updateEvent(
    eventId: string,
    eventData: Partial<UpcomingEvent>,
    zoneId?: string
  ): Promise<void> {
    try {
      await apiClient.patch(`/upcoming-events/${eventId}`, eventData);

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`${EVENTS_CACHE_KEY}_${zoneId || 'all'}`);
        localStorage.removeItem(`${EVENTS_CACHE_KEY}_all`);
      }
    } catch (error) {
      console.error('[UpcomingEventsService] Error updating upcoming event:', error);
      throw error;
    }
  }

  /**
   * Delete an upcoming event
   */
  static async deleteEvent(eventId: string, zoneId?: string): Promise<void> {
    try {
      await apiClient.delete(`/upcoming-events/${eventId}`);

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`${EVENTS_CACHE_KEY}_${zoneId || 'all'}`);
        localStorage.removeItem(`${EVENTS_CACHE_KEY}_all`);
      }
    } catch (error) {
      console.error('[UpcomingEventsService] Error deleting upcoming event:', error);
      throw error;
    }
  }

  /**
   * Get all events (for admin management)
   */
  static async getAllEvents(zoneId?: string, forceRefresh = false): Promise<UpcomingEvent[]> {
    try {
      const cacheKey = `${EVENTS_CACHE_KEY}_all_${zoneId || 'all'}`;
      if (!forceRefresh) {
        const cached = getEventsCache(cacheKey);
        if (cached) {
          return cached.data;
        }
      }

      const res = await apiClient.get<any>('/upcoming-events');
      let allEvents: UpcomingEvent[] = [];

      if (Array.isArray(res)) {
        allEvents = res;
      } else if (res && typeof res === 'object') {
        if (Array.isArray((res as any).data)) allEvents = (res as any).data;
        else if (Array.isArray((res as any).items)) allEvents = (res as any).items;
      }

      const filtered = (!zoneId || isHQGroup(zoneId))
        ? allEvents
        : allEvents.filter(v => v.zoneId === zoneId || v.isGlobal === true);

      filtered.sort((a, b) => moment(b.date).diff(moment(a.date)));

      setEventsCache(cacheKey, filtered);
      return filtered;
    } catch (error) {
      console.error(`[UpcomingEventsService] Error fetching all events for zone ${zoneId}:`, error);
      return [];
    }
  }
}
