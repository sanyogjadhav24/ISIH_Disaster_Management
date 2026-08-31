'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MapContainer from './components/MapContainer'
import {
  TotalActiveFires,
  HighConfidenceFires,
  TopAffectedRegions,
  FireStats,
  DEFAULT_STATS,
} from './components/StatsDisplay'

export default function Home() {
  const [stats, setStats] = useState<FireStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let firstLoad = true
    const fetchStats = async () => {
      if (typeof document !== 'undefined' && document.hidden) return

      try {
        if (!cancelled && firstLoad) setLoading(true)
        const response = await fetch('/api/fire-stats', {
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        const data: FireStats = await response.json()
        if (!cancelled) {
          setStats(data)
          firstLoad = false
        }
      } catch (err) {
        console.error('Failed to fetch fire stats:', err)
        if (!cancelled) {
          setStats(DEFAULT_STATS)
          firstLoad = false
        }
      } finally {
        if (!cancelled && firstLoad === false) setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <p className="text-gray-100">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <main className="font-mono min-h-[calc(100vh-56px)] max-w-[1600px] mx-auto px-6 py-8">
      {/* Mobile Layout */}
      <div className="flex flex-col min-[961px]:hidden">
        <header className="flex flex-col items-start text-sm uppercase gap-2 mb-6">
          <p className="text-gray-1000 my-0 whitespace-nowrap">
            Global Disasters{' '}
            <span className="block text-gray-100">
              Active Detections
            </span>
          </p>
        </header>

        <section className="pb-6 w-full">
          <div className="flex flex-col gap-y-6">
            <TotalActiveFires stats={stats} />
            <TopAffectedRegions stats={stats} />
          </div>
          <HighConfidenceFires stats={stats} />
        </section>

        <div className="w-full flex justify-center pointer-events-none mb-8">
          <MapContainer />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/map"
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-mono uppercase text-sm transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            View Map
          </Link>
          <Link
            href="/stats"
            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-4 rounded-lg font-mono uppercase text-sm transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Statistics
          </Link>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="relative hidden min-[961px]:flex flex-row max-lg:items-end lg:items-center lg:justify-between">
        <header className="flex flex-col items-start text-sm xl:text-base uppercase gap-2 mb-16">
          <p className="text-gray-1000 my-0 whitespace-nowrap">
            Global Active Disaster{' '}
            <span className="block text-gray-100">
              Active Detections
            </span>
          </p>
          <h1 className="text-gray-1000 whitespace-nowrap text-5xl font-mono">
            FireWatch
          </h1>
          <div className="flex gap-3 mt-6">
            <Link
              href="/map"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-md font-mono uppercase text-xs transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Interactive Map
            </Link>
            <Link
              href="/stats"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-md font-mono uppercase text-xs transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Full Statistics
            </Link>
          </div>
        </header>

        <section className="lg:absolute lg:bottom-0 pb-6 w-fit z-10 relative">
          <div className="flex flex-col gap-y-8">
            <TotalActiveFires stats={stats} />
            <TopAffectedRegions stats={stats} />
          </div>
          <HighConfidenceFires stats={stats} />
        </section>

        <div className="w-full h-full pointer-events-none max-lg:scale-[1.5] max-lg:-translate-y-16 max-lg:translate-x-[-20%]">
          <MapContainer />
        </div>
      </div>
    </main>
  )
}
