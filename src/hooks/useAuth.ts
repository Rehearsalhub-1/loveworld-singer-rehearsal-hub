/**
 * useAuth hook — COMPATIBILITY RE-EXPORT
 *
 * All logic has moved to `@/stores/authStore`.
 * This file is kept so existing imports of `useAuth` from `@/hooks/useAuth`
 * continue working without any changes to consumer files.
 *
 * Migration: change import to `import { useAuth } from '@/stores/authStore'`
 */

export { useAuth } from '@/stores/authStore'
