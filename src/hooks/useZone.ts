/**
 * useZone hook — COMPATIBILITY RE-EXPORT
 *
 * All logic has moved to `@/stores/zoneStore`.
 * This file is kept so existing imports of `useZone` from `@/hooks/useZone`
 * continue working without any changes to consumer files.
 *
 * Migration: change import to `import { useZone } from '@/stores/zoneStore'`
 */

export { useZone } from '@/stores/zoneStore'
