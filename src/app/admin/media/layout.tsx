import Script from 'next/script'

export default function AdminMediaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        strategy="lazyOnload"
      />
    </>
  )
}
