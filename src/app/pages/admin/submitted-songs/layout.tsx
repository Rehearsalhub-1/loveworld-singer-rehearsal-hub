import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider'

export default function SubmittedSongsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>
}
