"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';

export interface ScheduleCategory {
  id: string;
  label: string;
  name?: string;
  parentId?: string | null;
  icon?: string;
  color?: string;
  iconColor?: string;
  description?: string;
  spreadsheetData?: any;
  order?: number;
  [key: string]: any;
}

export interface ScheduleSong {
  id: string;
  title: string;
  artist?: string;
  category?: string;
  categoryId?: string;
  key?: string;
  tempo?: string;
  duration?: string;
  notes?: string;
  lyrics?: string;
  order?: number;
  [key: string]: any;
}

export interface ScheduleProgram {
  id: string;
  title?: string;
  program?: string;
  date?: string;
  description?: string;
  items?: any[];
  [key: string]: any;
}

export function useSchedule() {
  const { currentZone } = useZone();
  const [categories, setCategories] = useState<ScheduleCategory[]>([]);
  const [songs, setSongs] = useState<Record<string, ScheduleSong[]> | any>({});
  const [program, setProgram] = useState<ScheduleProgram | null>(null);
  const [allPrograms, setAllPrograms] = useState<ScheduleProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{ success?: boolean; data?: any[] }>('/schedule/categories');
      if (res && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      console.warn('Error loading schedule categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSongsForCategory = useCallback(async (categoryId: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/schedule/categories/${categoryId}/songs`);
      if (res && Array.isArray(res.data)) {
        setSongs((prev: any) => ({
          ...prev,
          [categoryId]: res.data
        }));
      }
    } catch (err) {
      console.warn('Error loading songs for category:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProgram = useCallback(async (dateOrId: string, categoryId?: string) => {
    try {
      setIsLoading(true);
      const url = categoryId 
        ? `/schedule/programs?date=${encodeURIComponent(dateOrId)}&categoryId=${encodeURIComponent(categoryId)}`
        : `/schedule/programs/${encodeURIComponent(dateOrId)}`;
      const res = await apiClient.get<{ success?: boolean; data?: any }>(url);
      if (res && res.data) {
        setProgram(res.data);
      }
    } catch (err) {
      console.warn('Error loading program:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, currentZone?.id]);

  return {
    categories,
    songs,
    program,
    allPrograms,
    isLoading,
    loadSongsForCategory,
    loadProgram,
    loadCategories
  };
}
