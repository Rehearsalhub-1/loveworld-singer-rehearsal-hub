const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').replace(/\/+$/, '');
const REFRESH_COOKIE = 'lwsrh_refresh';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
}

function setSessionCookies(accessToken: string): void {
  if (typeof document === 'undefined') return;
  // Readable by Next middleware for route + role gates (not HttpOnly — access token also in sessionStorage).
  document.cookie = `lwsrh_jwt=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Strict`;
  document.cookie = 'lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax';
}

function clearSessionCookies(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'lwsrh_jwt=; path=/; max-age=0; SameSite=Strict';
  document.cookie = 'lwsrh_is_logged_in=; path=/; max-age=0; SameSite=Lax';
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userId') || sessionStorage.getItem('userId');
}

function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('refreshToken', token);
  sessionStorage.setItem('refreshToken', token);
}

export function setUserId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('userId', id);
  sessionStorage.setItem('userId', id);
}

function setAccessToken(token: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('jwt', token);
  localStorage.setItem('jwt', token);
  if (refreshToken) setRefreshToken(refreshToken);
  setSessionCookies(token);
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('jwt');
  localStorage.removeItem('jwt');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('userId');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  clearSessionCookies();
}

async function refreshSession(): Promise<string> {
  const refreshToken = getRefreshToken();
  const userId = getUserId();
  if (!refreshToken || !userId) {
    clearAccessToken();
    throw new SessionExpiredError();
  }
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, userId }),
  });

  if (!res.ok) {
    clearAccessToken();
    throw new SessionExpiredError();
  }

  const body = await res.json();
  const newAccess = body.data?.accessToken || body.accessToken;
  const newRefresh = body.data?.refreshToken || body.refreshToken || refreshToken;
  setAccessToken(newAccess, newRefresh);
  return newAccess;
}

const apiGetCache = new Map<string, any>();

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (typeof window !== 'undefined') {
    const activeZone = localStorage.getItem('lwsrh_active_zone_id') || sessionStorage.getItem('admin_selected_zone_id');
    if (activeZone) {
      headers['x-zone-id'] = activeZone;
      headers['x-zone-code'] = activeZone;
    }
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh');

    if (res.status === 401 && !isAuthRoute) {
      const refreshToken = getRefreshToken();
      const userId = getUserId();

      if (!retried && refreshToken && userId) {
        try {
          const newToken = await refreshSession();
          const retryRes = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          });
          if (retryRes.status !== 401) {
            const data = await retryRes.json();
            if (method === 'GET' && data?.success !== false) {
              apiGetCache.set(path, data);
            }
            return data as T;
          }
        } catch {}
      }

      clearAccessToken();
      return { success: false, error: 'Session expired', data: null } as T;
    }

    const json = await res.json();
    if (method === 'GET' && json?.success !== false && json?.data !== undefined) {
      apiGetCache.set(path, json);
    }
    return json as T;
  } catch (netErr) {
    // If offline or connection dropped, return cached data if available
    if (method === 'GET' && apiGetCache.has(path)) {
      console.warn(`[apiClient] Network drop detected. Serving cached response for ${path}`);
      return apiGetCache.get(path) as T;
    }
    throw netErr;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  setAccessToken,
  clearAccessToken,
  setUserId,
};

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  count?: number;
  nextCursor?: string | null;
  error?: string;
};

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec.zoneMembers) || Array.isArray(rec.hqMembers)) {
      return [
        ...(Array.isArray(rec.zoneMembers) ? rec.zoneMembers : []),
        ...(Array.isArray(rec.hqMembers) ? rec.hqMembers : []),
      ];
    }
  }
  return [];
}

function fieldMatch(row: Record<string, unknown>, field: string, value: unknown, operator = '=='): boolean {
  const candidates = [
    row[field],
    row[field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())],
    row[field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)],
  ];
  const actual = candidates.find((v) => v !== undefined);
  if (operator === '==' || operator === '===') return actual === value || String(actual) === String(value);
  if (operator === 'in' && Array.isArray(value)) return value.includes(actual);
  if (operator === 'array-contains' && Array.isArray(actual)) return actual.includes(value);
  return actual === value;
}

async function listCollection(
  collectionName: string,
  maxLimit = 500,
  field?: string,
  value?: unknown,
  operator = '==',
): Promise<ApiEnvelope<unknown[]>> {
  // Specialized member filters (avoid full-table scans)
  if (collectionName === 'zone_members' && field && (field === 'userId' || field === 'user_id') && value != null) {
    const res = await apiClient.get<ApiEnvelope<{ zoneMembers?: unknown[]; hqMembers?: unknown[] }>>(
      `/members/by-user/${encodeURIComponent(String(value))}`,
    );
    return { success: true, data: (res.data?.zoneMembers ?? []) as unknown[] };
  }
  if (collectionName === 'zone_members' && field && (field === 'zoneId' || field === 'zone_id') && value != null) {
    const res = await apiClient.get<ApiEnvelope<unknown[]>>(
      `/members/zone/${encodeURIComponent(String(value))}`,
    );
    return { success: true, data: asArray(res.data) };
  }
  if (collectionName === 'hq_members' && field && (field === 'hqGroupId' || field === 'hq_group_id') && value != null) {
    const res = await apiClient.get<ApiEnvelope<unknown[]>>(
      `/members/hq/${encodeURIComponent(String(value))}?enrich=1`,
    );
    return { success: true, data: asArray(res.data) };
  }
  if (collectionName === 'hq_members' && field && (field === 'userId' || field === 'user_id') && value != null) {
    const res = await apiClient.get<ApiEnvelope<{ zoneMembers?: unknown[]; hqMembers?: unknown[] }>>(
      `/members/by-user/${encodeURIComponent(String(value))}`,
    );
    return { success: true, data: (res.data?.hqMembers ?? []) as unknown[] };
  }

  const pathByCollection: Record<string, string> = {
    profiles: '/profiles/directory',
    hq_members: '/members/hq',
    zone_members: '/members/mine',
    subgroups: '/subgroups/mine',
    praise_nights: '/praise-nights',
    categories: '/categories',
    submitted_songs: '/submitted-songs',
    schedule: '/schedule',
    schedule_programs: '/schedule',
    notifications: '/notifications',
    attendance: '/attendance/mine',
    master_songs: '/songs/master',
    praise_night_songs: '/songs/praise-night',
    zones: '/zones',
    chats_v2: '/chats',
    chats: '/chats',
    activity_logs: '/activity-logs',
    activityLogs: '/activity-logs',
    favorites: '/favorites/me',
    user_favorites: '/favorites/me',
    playlists: '/playlists/me',
    user_playlists: '/playlists/me',
    settings: '/settings/geofence_hq',
  };

  const path = pathByCollection[collectionName];
  if (!path) {
    console.warn(`[BackendAPI] No list mapping for collection "${collectionName}"`);
    return { success: false, data: [], error: `No list mapping for ${collectionName}` };
  }

  const res = await apiClient.get<ApiEnvelope<unknown>>(path);
  let rows = asArray(res.data);
  // favorites/me returns { songs: string[] } not a row list
  if (collectionName === 'favorites' || collectionName === 'user_favorites') {
    const songs =
      res.data && typeof res.data === 'object' && Array.isArray((res.data as { songs?: unknown }).songs)
        ? ((res.data as { songs: string[] }).songs)
        : [];
    rows = [{ id: 'me', songs }];
  }
  if (collectionName === 'settings') {
    rows = res.data ? [res.data as Record<string, unknown>] : [];
  }
  if (field !== undefined && value !== undefined) {
    rows = rows.filter((row) =>
      row && typeof row === 'object'
        ? fieldMatch(row as Record<string, unknown>, field, value, operator)
        : false,
    );
  }
  if (typeof maxLimit === 'number' && maxLimit > 0) {
    rows = rows.slice(0, maxLimit);
  }
  return { success: true, data: rows, count: rows.length };
}

async function getDocument(collectionName: string, docId: string): Promise<ApiEnvelope<unknown>> {
  // Subscriptions keyed by user id
  if (collectionName === 'individual_subscriptions') {
    const res = await apiClient.get<ApiEnvelope<unknown>>(
      `/subscriptions/${encodeURIComponent(docId)}`,
    );
    return { success: res.success !== false, data: res.data };
  }

  const pathByCollection: Record<string, string> = {
    profiles: `/profiles/${encodeURIComponent(docId)}`,
    subgroups: `/subgroups/${encodeURIComponent(docId)}`,
    praise_nights: `/praise-nights/${encodeURIComponent(docId)}`,
    schedule: `/schedule/${encodeURIComponent(docId)}`,
    schedule_programs: `/schedule/${encodeURIComponent(docId)}`,
    zones: `/zones/${encodeURIComponent(docId)}`,
    master_songs: `/songs/master/${encodeURIComponent(docId)}`,
    praise_night_songs: `/songs/praise-night/${encodeURIComponent(docId)}`,
    chats_v2: `/chats/${encodeURIComponent(docId)}`,
    chats: `/chats/${encodeURIComponent(docId)}`,
    settings: `/settings/${encodeURIComponent(docId)}`,
    zone_songs: `/songs/zone/${encodeURIComponent(docId)}`,
    subgroup_songs: `/songs/subgroup/${encodeURIComponent(docId)}`,
    zone_praise_nights: `/songs/zone-praise-nights/${encodeURIComponent(docId)}`,
    subgroup_praise_nights: `/songs/subgroup-praise-nights/${encodeURIComponent(docId)}`,
  };

  const path = pathByCollection[collectionName];
  if (path) {
    const res = await apiClient.get<ApiEnvelope<unknown>>(path);
    return { success: res.success !== false, data: res.data };
  }

  const listed = await listCollection(collectionName, 10000);
  const found = (listed.data || []).find(
    (row) => row && typeof row === 'object' && (row as { id?: string }).id === docId,
  );
  return { success: true, data: found ?? null };
}

/**
 * Compatibility façade used by DataService and domain services.
 * Maps Firestore-shaped collection names onto JWT rehearsalhub-api routes.
 */
export const BackendAPI = {
  profiles: {
    get: async (userId: string) => getDocument('profiles', userId),
    update: async (userId: string, updates: unknown) =>
      apiClient.patch<ApiEnvelope>(`/profiles/${encodeURIComponent(userId)}`, updates),
  },

  songs: {
    getAll: async (limitCount = 50, _cursor?: string, searchTerm?: string) => {
      const res = await apiClient.get<ApiEnvelope<unknown[]>>('/songs/master');
      let rows = asArray(res.data);
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        rows = rows.filter((row) => {
          if (!row || typeof row !== 'object') return false;
          const r = row as Record<string, unknown>;
          return (
            String(r.title || '').toLowerCase().includes(q) ||
            String(r.writer || '').toLowerCase().includes(q) ||
            String(r.category || '').toLowerCase().includes(q)
          );
        });
      }
      return { success: true, data: rows.slice(0, limitCount), nextCursor: null as string | null };
    },
    getById: async (songId: string) => getDocument('master_songs', songId),
    create: async (_data: unknown) => ({ success: false, error: 'Song create not available via Portal API yet' }),
    update: async (_id: string, _data: unknown) => ({ success: false, error: 'Song update not available via Portal API yet' }),
    delete: async (_id: string) => ({ success: false, error: 'Song delete not available via Portal API yet' }),
  },

  attendance: {
    mark: async (_payload: unknown) => ({ success: false, message: 'Attendance mark not available via Portal API yet' }),
    getByUser: async (userId: string) => {
      // API currently exposes /attendance/mine for the JWT subject only
      void userId;
      return apiClient.get<ApiEnvelope<unknown[]>>('/attendance/mine');
    },
    getAll: async (_zoneId?: string) => apiClient.get<ApiEnvelope<unknown[]>>('/attendance/mine'),
  },

  generic: {
    list: listCollection,
    get: getDocument,
    create: async (collectionName: string, data: unknown) => {
      if (collectionName === 'chats' || collectionName === 'chats_v2') {
        const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
        const members = Array.isArray(row.member_ids)
          ? (row.member_ids as string[])
          : Array.isArray(row.participants)
            ? (row.participants as string[])
            : Array.isArray(row.memberIds)
              ? (row.memberIds as string[])
              : [];
        if (members.length === 0 || typeof row.type !== 'string') {
          return { success: false, error: 'Invalid chat create payload' };
        }
        return apiClient.post<ApiEnvelope>(`/chats`, {
          type: row.type,
          member_ids: members,
          ...(typeof row.name === 'string' ? { name: row.name } : {}),
          ...(typeof row.zone_id === 'string'
            ? { zone_id: row.zone_id }
            : typeof row.zoneId === 'string'
              ? { zone_id: row.zoneId }
              : {}),
        });
      }
      console.warn(`[BackendAPI] create(${collectionName}) not mapped`);
      return { success: false, error: `Create not available for ${collectionName}`, data };
    },
    update: async (collectionName: string, id: string, data: unknown) => {
      if (collectionName === 'profiles') {
        return apiClient.patch<ApiEnvelope>(`/profiles/${encodeURIComponent(id)}`, data);
      }
      if (collectionName === 'chats' || collectionName === 'chats_v2') {
        const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
        const body: Record<string, unknown> = {};
        if (typeof row.name === 'string') body.name = row.name;
        if (typeof row.last_message === 'string') body.last_message = row.last_message;
        if (typeof row.lastMessage === 'string') body.last_message = row.lastMessage;
        if (typeof row.last_message_at === 'string') body.last_message_at = row.last_message_at;
        if (Array.isArray(row.member_ids)) body.member_ids = row.member_ids;
        if (Array.isArray(row.participants)) body.member_ids = row.participants;
        if (Object.keys(body).length === 0) {
          return { success: false, error: 'Empty chat update' };
        }
        return apiClient.patch<ApiEnvelope>(`/chats/${encodeURIComponent(id)}`, body);
      }
      console.warn(`[BackendAPI] update(${collectionName}, ${id}) not mapped`);
      return { success: false, error: `Update not available for ${collectionName}` };
    },
    delete: async (collectionName: string, id: string) => {
      console.warn(`[BackendAPI] delete(${collectionName}, ${id}) not mapped`);
      return { success: false, error: `Delete not available for ${collectionName}` };
    },
  },

  programs: {
    list: async () => apiClient.get<ApiEnvelope<unknown[]>>('/programs'),
    get: async (id: string) => getDocument('praise_nights', id),
  },

  praiseNights: {
    list: async () => apiClient.get<ApiEnvelope<unknown[]>>('/programs'),
    get: async (id: string) => getDocument('praise_nights', id),
  },

  subscriptions: {
    get: async (userId: string) => getDocument('individual_subscriptions', userId),
    update: async (userId: string, data: unknown) => apiClient.patch<ApiEnvelope>(`/subscriptions/${encodeURIComponent(userId)}`, data),
  },

  rehearsals: {
    list: async (zoneId?: string) => apiClient.get<ApiEnvelope<unknown[]>>(zoneId ? `/rehearsals?zoneId=${zoneId}` : '/rehearsals'),
    get: async (id: string) => getDocument('schedule', id),
  },
};

