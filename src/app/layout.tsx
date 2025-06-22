import './globals.css'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import NextBreadcrumb from './components/NextBreadcrumb'

export const metadata: Metadata = {
  title: 'Sathiyan Sports',
  description: 'Multi-sport slot booking app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="Arial">
        <Suspense fallback={<div>Loading...</div>}>
          <NextBreadcrumb
            homeElement="Home"
            separator={<span> | </span>}
            activeClasses="text-amber-500"
            containerClasses="flex py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4"
            listClasses="hover:underline mx-2 font-bold"
            capitalizeLinks
          />
          {children}
        </Suspense>
      </body>
    </html>
  )
}
