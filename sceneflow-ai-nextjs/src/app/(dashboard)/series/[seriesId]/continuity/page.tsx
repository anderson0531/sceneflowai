'use client'

import React from 'react'
import Link from 'next/link'

export default function ContinuityDashboard() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Continuity Engine</h1>
      <p className="text-gray-500">Manage Series Bible, Characters, Locations, and Aesthetic Blueprint.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="characters" className="border rounded p-4 hover:bg-gray-50">Characters</Link>
        <Link href="locations" className="border rounded p-4 hover:bg-gray-50">Locations</Link>
        <Link href="aesthetics" className="border rounded p-4 hover:bg-gray-50">Aesthetic Blueprint</Link>
      </div>
    </div>
  )
}
