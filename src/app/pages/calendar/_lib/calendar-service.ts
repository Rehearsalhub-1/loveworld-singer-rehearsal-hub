import { UpcomingEventsService, UpcomingEvent } from './upcoming-events-service'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  color?: string
  location?: string
  attendees?: string[]
  createdBy: string
  createdByName: string
  zoneId: string
  isGlobal?: boolean
  type: 'rehearsal' | 'performance' | 'meeting' | 'other'
  isRecurring?: boolean
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    endDate?: Date
  }
  reminders?: {
    type: 'email' | 'notification'
    minutes: number
  }[]
  createdAt: Date
  updatedAt: Date
}

export interface EventAttendee {
  userId: string
  userName: string
  email: string
  status: 'pending' | 'accepted' | 'declined'
  respondedAt?: Date
}

function toDate(val: unknown): Date {
  if (val instanceof Date) return val
  if (val && typeof val === 'object' && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate()
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (val && typeof val === 'object') {
    const rec = val as { seconds?: number; _seconds?: number }
    const sec = rec.seconds ?? rec._seconds
    if (typeof sec === 'number') return new Date(sec * 1000)
  }
  return new Date()
}

export class CalendarService {
  async createEvent(eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const created = await UpcomingEventsService.createEvent(this.toUpcomingEvent(eventData));
    return created.id;
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    await UpcomingEventsService.updateEvent(eventId, this.toUpcomingUpdates(updates), updates.zoneId);
  }

  async deleteEvent(eventId: string): Promise<void> {
    await UpcomingEventsService.deleteEvent(eventId);
  }

  private async listScheduleEvents(): Promise<CalendarEvent[]> {
    const rows = await UpcomingEventsService.getAllEvents(undefined, true)
    return rows.map((row) => this.convertApiEvent(row.id, row as unknown as Record<string, unknown>))
  }

  async getZoneEvents(zoneId: string, userId?: string, userRole?: string): Promise<CalendarEvent[]> {
    try {
      const allEvents = await this.listScheduleEvents()

      if (userRole === 'boss') {
        return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
      }

      return allEvents.filter(event =>
        event.zoneId === zoneId ||
        event.isGlobal === true ||
        (userId && event.createdBy === userId)
      ).sort((a, b) => a.start.getTime() - b.start.getTime())
    } catch (error) {
 console.error('Error fetching zone events:', error)
      throw error
    }
  }

  async getEventsInRange(zoneId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const all = await this.listScheduleEvents()
      return all
        .filter((e) => e.zoneId === zoneId && e.start >= startDate && e.start <= endDate)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    } catch (error) {
 console.error('Error fetching events in range:', error)
      throw error
    }
  }

  async getUserEvents(userId: string, zoneId: string): Promise<CalendarEvent[]> {
    try {
      const all = await this.listScheduleEvents()
      return all
        .filter((e) => e.zoneId === zoneId && e.createdBy === userId)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    } catch (error) {
 console.error('Error fetching user events:', error)
      throw error
    }
  }

  subscribeToZoneEvents(zoneId: string, callback: (events: CalendarEvent[]) => void, userId?: string, userRole?: string): () => void {
    let cancelled = false
    const load = async () => {
      try {
        const events = await this.getZoneEvents(zoneId, userId, userRole)
        if (!cancelled) callback(events)
      } catch (error) {
        console.error('Error in events subscription:', error)
      }
    }

    void load()
    const refreshTimer = window.setInterval(load, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
    }
  }

  async addAttendee(eventId: string, attendee: Omit<EventAttendee, 'respondedAt'>): Promise<void> {
    console.warn('[migration] calendar-service.ts: addAttendee — no JWT write route yet');
    void eventId;
    void attendee;
  }

  private toUpcomingEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Omit<UpcomingEvent, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      title: event.title,
      description: event.description,
      date: event.start.toISOString(),
      endDate: event.end.toISOString(),
      location: event.location,
      type: event.type === 'performance' || event.type === 'other' ? 'event' : event.type,
      showInCarousel: true,
      isGlobal: event.isGlobal,
      zoneId: event.zoneId,
      createdBy: event.createdBy,
    }
  }

  private toUpcomingUpdates(updates: Partial<CalendarEvent>): Partial<UpcomingEvent> {
    return {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.start !== undefined ? { date: updates.start.toISOString() } : {}),
      ...(updates.end !== undefined ? { endDate: updates.end.toISOString() } : {}),
      ...(updates.location !== undefined ? { location: updates.location } : {}),
      ...(updates.type !== undefined ? { type: updates.type === 'performance' || updates.type === 'other' ? 'event' : updates.type } : {}),
      ...(updates.isGlobal !== undefined ? { isGlobal: updates.isGlobal } : {}),
      ...(updates.zoneId !== undefined ? { zoneId: updates.zoneId } : {}),
    }
  }

  async updateAttendeeStatus(eventId: string, userId: string, status: EventAttendee['status']): Promise<void> {
    void eventId
    void userId
    void status
    console.warn('[migration] event_attendees reads not on JWT API yet')
  }

  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    void eventId
    console.warn('[migration] event_attendees reads not on JWT API yet')
    return []
  }

  private convertApiEvent(id: string, data: Record<string, unknown>): CalendarEvent {
    return {
      id,
      title: String(data.title ?? ''),
      description: typeof data.description === 'string' ? data.description : undefined,
      start: toDate(data.start ?? data.startDate ?? data.date),
      end: toDate(data.end ?? data.endDate ?? data.start ?? data.date),
      allDay: Boolean(data.allDay),
      color: typeof data.color === 'string' ? data.color : undefined,
      location: typeof data.location === 'string' ? data.location : undefined,
      attendees: Array.isArray(data.attendees) ? (data.attendees as string[]) : [],
      createdBy: String(data.createdBy ?? data.created_by ?? ''),
      createdByName: String(data.createdByName ?? data.created_by_name ?? ''),
      zoneId: String(data.zoneId ?? data.zone_id ?? ''),
      isGlobal: Boolean(data.isGlobal ?? data.is_global),
      type: (data.type as CalendarEvent['type']) || 'other',
      isRecurring: Boolean(data.isRecurring),
      reminders: Array.isArray(data.reminders) ? (data.reminders as CalendarEvent['reminders']) : [],
      createdAt: toDate(data.createdAt ?? data.created_at),
      updatedAt: toDate(data.updatedAt ?? data.updated_at),
    }
  }

  private convertFirestoreEvent(id: string, data: Record<string, unknown>): CalendarEvent {
    const start = data.start as { toDate?: () => Date }
    const end = data.end as { toDate?: () => Date }
    const createdAt = data.createdAt as { toDate?: () => Date }
    const updatedAt = data.updatedAt as { toDate?: () => Date }
    const pattern = data.recurringPattern as { endDate?: { toDate?: () => Date } } | undefined
    return {
      id,
      title: String(data.title ?? ''),
      description: typeof data.description === 'string' ? data.description : undefined,
      start: start?.toDate?.() ?? toDate(data.start),
      end: end?.toDate?.() ?? toDate(data.end),
      allDay: Boolean(data.allDay),
      color: typeof data.color === 'string' ? data.color : undefined,
      location: typeof data.location === 'string' ? data.location : undefined,
      attendees: Array.isArray(data.attendees) ? (data.attendees as string[]) : [],
      createdBy: String(data.createdBy ?? ''),
      createdByName: String(data.createdByName ?? ''),
      zoneId: String(data.zoneId ?? ''),
      isGlobal: Boolean(data.isGlobal),
      type: (data.type as CalendarEvent['type']) || 'other',
      isRecurring: Boolean(data.isRecurring),
      recurringPattern: pattern ? {
        ...(pattern as CalendarEvent['recurringPattern']),
        endDate: pattern.endDate?.toDate?.()
      } as CalendarEvent['recurringPattern'] : undefined,
      reminders: Array.isArray(data.reminders) ? (data.reminders as CalendarEvent['reminders']) : [],
      createdAt: createdAt?.toDate?.() || new Date(),
      updatedAt: updatedAt?.toDate?.() || new Date()
    }
  }

  generateRecurringEvents(baseEvent: CalendarEvent, endDate: Date): CalendarEvent[] {
    if (!baseEvent.isRecurring || !baseEvent.recurringPattern) {
      return [baseEvent]
    }

    const events: CalendarEvent[] = []
    const { frequency, interval } = baseEvent.recurringPattern
    let currentStart = new Date(baseEvent.start)
    let currentEnd = new Date(baseEvent.end)
    const duration = currentEnd.getTime() - currentStart.getTime()

    while (currentStart <= endDate) {
      events.push({
        ...baseEvent,
        id: `${baseEvent.id}_${currentStart.getTime()}`,
        start: new Date(currentStart),
        end: new Date(currentStart.getTime() + duration)
      })

      if (frequency === 'daily') {
        currentStart.setDate(currentStart.getDate() + interval)
      } else if (frequency === 'weekly') {
        currentStart.setDate(currentStart.getDate() + (7 * interval))
      } else if (frequency === 'monthly') {
        currentStart.setMonth(currentStart.getMonth() + interval)
      } else {
        break
      }
    }

    return events
  }
}

export const calendarService = new CalendarService()
