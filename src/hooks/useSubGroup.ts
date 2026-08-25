"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '@/lib/api-client';

export interface SubGroup {
  id: string;
  name: string;
  zoneId?: string;
  zoneName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  status?: string;
  memberIds?: string[];
  [key: string]: any;
}

export function useSubGroup() {
  const { user, profile } = useAuth();
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [memberSubGroups, setMemberSubGroups] = useState<SubGroup[]>([]);
  const [coordinatedSubGroups, setCoordinatedSubGroups] = useState<SubGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubGroups = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [mineRes, coordRes] = await Promise.all([
        apiClient.get<any>('/subgroups/mine').catch(() => ({ data: [] })),
        apiClient.get<any>('/subgroups/coordinated').catch(() => ({ data: [] }))
      ]);

      const mine = Array.isArray(mineRes?.data) ? mineRes.data : [];
      const coord = Array.isArray(coordRes?.data) ? coordRes.data : [];

      setMemberSubGroups(mine);
      setCoordinatedSubGroups(coord);
      setSubGroups([...mine, ...coord.filter((c: SubGroup) => !mine.some((m: SubGroup) => m.id === c.id))]);
    } catch (err) {
      console.error('[useSubGroup] load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubGroups();
  }, [fetchSubGroups]);

  const isCoordinatorFromData = coordinatedSubGroups.length > 0;
  const isCoordinatorFromProfile = Boolean(
    (profile as any)?.is_subgroup_coordinator ||
    (profile as any)?.role === 'subgroup_admin' ||
    (profile as any)?.role === 'zone_admin' ||
    (profile as any)?.role === 'hq_admin' ||
    (profile as any)?.role === 'admin' ||
    (profile as any)?.role === 'boss'
  );

  const isSubGroupCoordinator = isCoordinatorFromData || isCoordinatorFromProfile;

  return {
    subGroups,
    memberSubGroups,
    coordinatedSubGroups,
    isSubGroupCoordinator,
    isLoading,
    refreshSubGroups: fetchSubGroups,
  };
}
