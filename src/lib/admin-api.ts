import { apiClient } from './api-client'

type ApiResponse<T = unknown> = {
  success?: boolean
  data?: T
  error?: string
  [key: string]: unknown
}

type IdResponse = ApiResponse<{ id?: string }>
type DataResponse = ApiResponse<Record<string, unknown>>

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Request failed')
}

async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    const response = await operation()
    if (response && typeof response === 'object' && 'success' in response && (response as ApiResponse).success === false) {
      throw new Error(String((response as ApiResponse).error || 'Request failed'))
    }
    return response
  } catch (error) {
    throw normalizeError(error)
  }
}

export const adminApi = {
  get: <T>(path: string) => request(() => apiClient.get<T>(path)),
  post: <T>(path: string, body?: unknown) => request(() => apiClient.post<T>(path, body)),
  patch: <T>(path: string, body?: unknown) => request(() => apiClient.patch<T>(path, body)),
  delete: <T>(path: string) => request(() => apiClient.delete<T>(path)),
  media: {
    list: (options: { zoneId?: string | null; type?: string; search?: string; page?: number; limit?: number } = {}) => {
      const params = new URLSearchParams()
      if (options.limit) params.set('limit', String(options.limit))
      if (options.page) params.set('page', String(options.page))
      if (options.zoneId) params.set('zoneId', options.zoneId)
      if (options.type && options.type !== 'all') params.set('type', options.type)
      if (options.search?.trim()) params.set('search', options.search.trim())
      const query = params.toString()
      return request(() => apiClient.get<{ success?: boolean; data?: unknown[] }>(`/media${query ? `?${query}` : ''}`))
    },
    create: (payload: unknown) => request(() => apiClient.post<{ success?: boolean; data?: unknown }>('/media', payload)),
    update: (id: string, payload: unknown) => request(() => apiClient.patch<{ success?: boolean; data?: unknown }>(`/media/${encodeURIComponent(id)}`, payload)),
    remove: (id: string) => request(() => apiClient.delete<ApiResponse>(`/media/${encodeURIComponent(id)}`)),
  },
  programs: {
    list: (scope?: { zoneId?: string | null; churchId?: string | null }) => {
      if (scope?.churchId) return request(() => apiClient.get<{ success?: boolean; data?: Record<string, unknown>[]; error?: string }>(`/subgroups/${encodeURIComponent(scope.churchId as string)}/praise-nights`))
      const query = scope?.zoneId ? `?zoneId=${encodeURIComponent(scope.zoneId)}` : ''
      return request(() => apiClient.get<{ success?: boolean; data?: Record<string, unknown>[]; error?: string }>(`/programs${query}`))
    },
    create: (payload: unknown, scope?: { zoneId?: string | null; churchId?: string | null }) => {
      if (scope?.churchId) return request(() => apiClient.post<IdResponse>('/subgroups/praise-nights', { ...payload as object, subGroupId: scope.churchId }))
      return request(() => apiClient.post<IdResponse>('/programs', { ...payload as object, ...(scope?.zoneId ? { zoneId: scope.zoneId } : {}) }))
    },
    update: (id: string, payload: unknown, scope?: { zoneId?: string | null; churchId?: string | null }) => {
      if (scope?.churchId) return request(() => apiClient.patch<DataResponse>(`/subgroups/praise-nights/${encodeURIComponent(id)}`, payload))
      return request(() => apiClient.patch<DataResponse>(`/programs/${encodeURIComponent(id)}`, { ...payload as object, ...(scope?.zoneId ? { zoneId: scope.zoneId } : {}) }))
    },
    remove: (id: string) => request(() => apiClient.delete<ApiResponse>(`/programs/${encodeURIComponent(id)}`)),
  },
  categories: {
    list: (zoneId?: string | null) => request(() => apiClient.get<{ success?: boolean; data?: Record<string, unknown>[]; error?: string }>(zoneId && zoneId !== 'all' && zoneId !== 'global' ? `/categories?zoneId=${encodeURIComponent(zoneId)}` : '/categories')),
    create: (payload: unknown) => request(() => apiClient.post<DataResponse>('/categories', payload)),
    update: (id: string, payload: unknown) => request(() => apiClient.patch<DataResponse>(`/categories/${encodeURIComponent(id)}`, payload)),
    remove: (id: string) => request(() => apiClient.delete<ApiResponse>(`/categories/${encodeURIComponent(id)}`)),
    pageList: (zoneId?: string | null) => {
      const isExternalZone = Boolean(
        zoneId &&
        zoneId !== 'all' &&
        zoneId !== 'global' &&
        zoneId !== 'zone-001' &&
        zoneId !== 'ZONE001' &&
        !zoneId.toLowerCase().includes('hq')
      );
      return request(() => apiClient.get<{ success?: boolean; data?: Record<string, unknown>[]; error?: string }>(
        isExternalZone ? `/categories/zone-page?zoneId=${encodeURIComponent(zoneId as string)}` : '/categories/page'
      ));
    },
    pageCreate: (payload: unknown) => request(() => apiClient.post<IdResponse>('/categories/page', payload)),
    pageUpdate: (id: string, payload: unknown) => request(() => apiClient.patch<DataResponse>(`/categories/page/${encodeURIComponent(id)}`, payload)),
    pageRemove: (id: string) => request(() => apiClient.delete<ApiResponse>(`/categories/page/${encodeURIComponent(id)}`)),
    pageReorder: (order: unknown[], zoneId?: string | null) => request(() => apiClient.post<ApiResponse>('/categories/page/order', { order, zoneId })),
  },
  songs: {
    list: (options: { programId?: string; pageId?: string; zoneId?: string | null; churchId?: string | null } = {}) => {
      if (options.churchId) return request(() => apiClient.get<{ success?: boolean; data?: Record<string, unknown>[]; error?: string }>(`/subgroups/${encodeURIComponent(options.churchId as string)}/songs`))
      const params = new URLSearchParams()
      if (options.programId) params.set('programId', options.programId)
      if (options.pageId) params.set('pageId', options.pageId)
      if (options.zoneId) params.set('zoneId', options.zoneId)
      const query = params.toString()
      return request(() => apiClient.get<{ success?: boolean; data?: Record<string, unknown>[]; error?: string }>(`/songs/praise-night${query ? `?${query}` : ''}`))
    },
    create: (payload: unknown, zoneId?: string | null) => request(() => apiClient.post<IdResponse>('/songs/praise-night', { ...payload as object, ...(zoneId ? { zoneId } : {}) })),
    update: (id: string, payload: unknown, zoneId?: string | null) => request(() => apiClient.patch<DataResponse>(`/songs/praise-night/${encodeURIComponent(id)}`, { ...payload as object, ...(zoneId ? { zoneId } : {}) })),
    updateStatus: (id: string, status: string) => request(() => apiClient.patch<ApiResponse>(`/songs/praise-night/${encodeURIComponent(id)}/status`, { status })),
    remove: (id: string) => request(() => apiClient.delete<ApiResponse>(`/songs/praise-night/${encodeURIComponent(id)}`)),
  },
  activity: {
    record: (payload: unknown) => request(() => apiClient.post<{ success?: boolean }>('/activity-logs', payload)),
  },
  members: {
    pendingRequests: (zoneId?: string | null) => request(() => apiClient.get<{ data?: unknown[] }>(zoneId ? `/members/admin-requests?zoneId=${encodeURIComponent(zoneId)}` : '/members/admin-requests')),
  },
}
