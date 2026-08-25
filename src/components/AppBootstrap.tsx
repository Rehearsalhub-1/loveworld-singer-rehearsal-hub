"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useZoneStore } from '@/stores/zoneStore';
import { useNotificationStore } from '@/stores/notificationStore';

/**
 * AppBootstrap — Runs once on client mount.
 * Initializes core Zustand stores (auth, zone, notifications).
 */
export default function AppBootstrap() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // ── Initialize Auth Store ────────────────────────────────────────────────
    useEffect(() => {
        const { initialize } = useAuthStore.getState();
        initialize();

        return () => {
            useAuthStore.getState().cleanup();
        };
    }, []);

    // ── Wire Zone Store: load zones when user becomes available ───────────────
    useEffect(() => {
        const unsub = useAuthStore.subscribe(
            (state) => ({ user: state.user, loading: state.loading }),
            ({ user, loading }) => {
                if (!loading && user?.id && user?.email) {
                    useZoneStore.getState().loadUserZones(user.id, user.email);
                } else if (!user) {
                    useZoneStore.getState().clearZoneState();
                }
            },
            { equalityFn: (a, b) => a.user?.id === b.user?.id && a.loading === b.loading }
        );

        // Handle the case where user is already logged in when this mounts
        const { user, loading } = useAuthStore.getState();
        if (!loading && user?.id && user?.email) {
            useZoneStore.getState().loadUserZones(user.id, user.email);
        }

        return () => unsub();
    }, []);

    // ── Wire Notification Store: start listeners when user + zone are ready ───
    useEffect(() => {
        let lastKey = '';

        const startListeners = () => {
            const { user } = useAuthStore.getState();
            const { currentZone } = useZoneStore.getState();

            if (user?.id && currentZone?.id) {
                const key = `${user.id}:${currentZone.id}`;
                if (key !== lastKey) {
                    lastKey = key;
                    useNotificationStore.getState().initialize(user.id, currentZone.id);
                }
            }
        };

        const unsubAuth = useAuthStore.subscribe(startListeners);
        const unsubZone = useZoneStore.subscribe(startListeners);

        startListeners();

        return () => {
            unsubAuth();
            unsubZone();
            useNotificationStore.getState().cleanup();
        };
    }, []);

    return null;
}

