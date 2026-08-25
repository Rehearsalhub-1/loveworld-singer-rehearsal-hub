import { BackendAPI } from '@/lib/api-client';
import { UserProfile } from '@/types/supabase'
import moment from 'moment'

export interface BirthdayUser {
  id: string
  first_name: string
  last_name: string
  birthday: string
  profile_image_url?: string
  age?: number
  isToday: boolean
  zoneId?: string
}

// OPTIMIZED: Cache birthdays for 1 hour to reduce reads (per zone)
const BIRTHDAY_CACHE_KEY = 'lwsrh-birthday-cache'
const BIRTHDAY_CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface BirthdayCache {
  data: BirthdayUser[]
  timestamp: number
  dateKey: string // To invalidate when day changes
  zoneId: string // Cache per zone
}

function getBirthdayCache(zoneId: string): BirthdayCache | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(`${BIRTHDAY_CACHE_KEY}-${zoneId}`)
    if (!cached) return null
    const data: BirthdayCache = JSON.parse(cached)
    const today = moment().format('YYYY-MM-DD')
    // Invalidate if day changed, zone changed, or TTL expired
    if (data.dateKey !== today || data.zoneId !== zoneId || Date.now() - data.timestamp > BIRTHDAY_CACHE_TTL) {
      return null
    }
    return data
  } catch {
    return null
  }
}

function setBirthdayCache(zoneId: string, data: BirthdayUser[]) {
  if (typeof window === 'undefined') return
  try {
    const cache: BirthdayCache = {
      data,
      timestamp: Date.now(),
      dateKey: moment().format('YYYY-MM-DD'),
      zoneId
    }
    localStorage.setItem(`${BIRTHDAY_CACHE_KEY}-${zoneId}`, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

export class BirthdayService {
  /**
   * Get users with birthdays today and upcoming (next 7 days) for a specific zone
   * OPTIMIZED: Uses caching to reduce Firebase reads
   * @param zoneId - The zone ID to filter birthdays by
   */
  static async getTodayAndUpcomingBirthdays(zoneId?: string): Promise<BirthdayUser[]> {
    try {
      // Check cache first (zone-specific)
      if (zoneId) {
        const cached = getBirthdayCache(zoneId)
        if (cached) {
          return cached.data
        }
      }

      // Get zone members if zoneId provided
      let memberUserIds: Set<string> | null = null
      if (zoneId) {
        try {
          const zoneMembers = await Promise.resolve([]) as any[]
          if (zoneMembers && zoneMembers.length > 0) {
            memberUserIds = new Set(zoneMembers.map(m => m.userId || m.id))
          }
        } catch (error) {
 console.error('Error fetching zone members for birthdays:', error)
        }
      }

      // Get profiles with limit (birthday data doesn't need all profiles)
      const profiles = await Promise.resolve([]) as unknown as UserProfile[]

      if (!profiles || profiles.length === 0) {
        return []
      }

      const today = moment()
      const nextWeek = moment().add(7, 'days')

      const birthdayUsers: BirthdayUser[] = profiles
        .filter(profile => {
          // Must have birthday
          if (!profile.birthday) return false

          // Show birthday if:
          // 1. User is in the specific zone (via zone field)
          // 2. User is an HQ member (global birthdays)
          // 3. User is in the zone's member sub-collection (legacy/robust check)
          const isInZoneField = profile.zone === zoneId
          const isHQMember = profile.is_hq_member === true
          const isInMemberCollection = memberUserIds?.has(profile.id)

          if (!isInZoneField && !isHQMember && !isInMemberCollection) return false
          return true
        })
        .map(profile => {
          const birthday = moment(profile.birthday)

          // Get birthday this year
          const birthdayThisYear = moment(profile.birthday).year(today.year())

          const isToday = birthdayThisYear.isSame(today, 'day')

          const isUpcoming = birthdayThisYear.isBetween(today, nextWeek, 'day', '[]')

          if (!isToday && !isUpcoming) {
            return null
          }

          // Calculate age
          const age = today.year() - birthday.year()

          return {
            id: profile.id,
            first_name: profile.first_name || 'Unknown',
            last_name: profile.last_name || '',
            birthday: profile.birthday,
            profile_image_url: profile.profile_image_url,
            age,
            isToday,
            zoneId
          }
        })
        .filter(Boolean) as BirthdayUser[]

      // Sort: today's birthdays first, then by date
      const sortedBirthdays = birthdayUsers.sort((a, b) => {
        if (a.isToday && !b.isToday) return -1
        if (!a.isToday && b.isToday) return 1

        const dateA = moment(a.birthday).month() * 100 + moment(a.birthday).date()
        const dateB = moment(b.birthday).month() * 100 + moment(b.birthday).date()
        return dateA - dateB
      })

      // Cache the results (zone-specific)
      if (zoneId) {
        setBirthdayCache(zoneId, sortedBirthdays)
      }

      return sortedBirthdays
    } catch (error) {
 console.error('Error fetching birthdays:', error)
      return []
    }
  }

  /**
   * Get only today's birthdays for a specific zone
   * @param zoneId - The zone ID to filter birthdays by
   */
  static async getTodaysBirthdays(zoneId?: string): Promise<BirthdayUser[]> {
    const allBirthdays = await this.getTodayAndUpcomingBirthdays(zoneId)
    return allBirthdays.filter(user => user.isToday)
  }
}
