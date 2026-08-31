'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
	TotalActiveFires,
	HighConfidenceFires,
	TopAffectedRegions,
	FireStatsGrid,
	FireStats,
	DEFAULT_STATS,
} from '../components/StatsDisplay'
import { WeatherStatsSection } from '../components/WeatherDisplay'

export default function StatsPage() {
	const [stats, setStats] = useState<FireStats>(DEFAULT_STATS)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdate, setLastUpdate] = useState<string>('')

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
					setError(null)
					setLastUpdate(new Date().toLocaleTimeString())
					firstLoad = false
				}
			} catch (err) {
				console.error('Failed to fetch fire stats:', err)
				if (!cancelled) {
					setStats(DEFAULT_STATS)
					setError('Failed to load live data. Showing sample data.')
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
				<p className="text-gray-100 font-mono">Loading statistics...</p>
			</div>
		)
	}

	return (
		<main className="min-h-[calc(100vh-56px)] bg-gray-950">
			<div className="max-w-[1600px] mx-auto px-6 py-8">
				{/* Header */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
					<div>
						<h1 className="font-mono text-2xl font-semibold text-white">
							Fire Statistics
						</h1>
						<p className="font-mono text-sm text-gray-400 mt-1">
							Comprehensive fire detection analytics from NASA
							FIRMS
						</p>
					</div>
					<div className="flex items-center gap-4">
						{lastUpdate && (
							<span className="text-sm text-gray-500 font-mono">
								Last updated: {lastUpdate}
							</span>
						)}
						<Link
							href="/map"
							className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-mono uppercase text-xs transition-colors"
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
							View on Map
						</Link>
					</div>
				</div>

				{/* Error Banner */}
				{error && (
					<div className="bg-yellow-900/50 border border-yellow-700 p-3 rounded-lg text-yellow-200 text-sm font-mono mb-6">
						{error}
					</div>
				)}

				{/* Key Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
						<TotalActiveFires stats={stats} />
					</div>
					<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
						<TopAffectedRegions stats={stats} />
					</div>
					<div className="bg-gray-900 rounded-lg p-6 border border-gray-800 flex flex-col justify-center">
						<div className="space-y-4">
							<HighConfidenceFires stats={stats} />
							<div className="pt-4 border-t border-gray-700">
								<h3 className="font-mono text-sm text-gray-400 uppercase mb-2">
									Quick Stats
								</h3>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span className="text-gray-400 font-mono text-sm">
											Avg Brightness
										</span>
										<span className="text-white font-mono">
											{stats.avgBrightness}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400 font-mono text-sm">
											Avg Confidence
										</span>
										<span className="text-white font-mono">
											{stats.avgConfidence}%
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Detailed Stats Grid */}
				<section>
					<h2 className="font-mono text-lg font-medium text-white mb-4 uppercase tracking-wide">
						Detailed Analytics
					</h2>
					<FireStatsGrid stats={stats} />
				</section>

				{/* Satellite Breakdown */}
				<section className="mt-8">
					<h2 className="font-mono text-lg font-medium text-white mb-4 uppercase tracking-wide">
						Detection Sources
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
							<h3 className="font-mono text-sm text-gray-400 uppercase mb-4">
								By Satellite
							</h3>
							<div className="space-y-4">
								<div>
									<div className="flex justify-between mb-1">
										<span className="font-mono text-sm text-white">
											MODIS
										</span>
										<span className="font-mono text-sm text-gray-400">
											{stats.detectionsBySatellite.MODIS.toLocaleString()}
										</span>
									</div>
									<div className="w-full bg-gray-700 rounded-full h-2">
										<div
											className="bg-blue-500 h-2 rounded-full transition-all"
											style={{
												width: `${(stats.detectionsBySatellite.MODIS / (stats.detectionsBySatellite.MODIS + stats.detectionsBySatellite.VIIRS)) * 100}%`,
											}}
										/>
									</div>
								</div>
								<div>
									<div className="flex justify-between mb-1">
										<span className="font-mono text-sm text-white">
											VIIRS
										</span>
										<span className="font-mono text-sm text-gray-400">
											{stats.detectionsBySatellite.VIIRS.toLocaleString()}
										</span>
									</div>
									<div className="w-full bg-gray-700 rounded-full h-2">
										<div
											className="bg-orange-500 h-2 rounded-full transition-all"
											style={{
												width: `${(stats.detectionsBySatellite.VIIRS / (stats.detectionsBySatellite.MODIS + stats.detectionsBySatellite.VIIRS)) * 100}%`,
											}}
										/>
									</div>
								</div>
							</div>
						</div>
						<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
							<h3 className="font-mono text-sm text-gray-400 uppercase mb-4">
								Recent Detections
							</h3>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="font-mono text-sm text-white">
										Today
									</span>
									<span className="font-mono text-lg text-red-500 font-semibold">
										{stats.detectionsByDay.today.toLocaleString()}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="font-mono text-sm text-gray-400">
										Yesterday
									</span>
									<span className="font-mono text-gray-300">
										{stats.detectionsByDay.yesterday.toLocaleString()}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="font-mono text-sm text-gray-400">
										2 Days Ago
									</span>
									<span className="font-mono text-gray-300">
										{stats.detectionsByDay.twoAgo.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Weather & Wind Forecast */}
				<section className="mt-8">
					<h2 className="font-mono text-lg font-medium text-white mb-4 uppercase tracking-wide">
						Weather & Fire Risk Forecast
					</h2>
					<WeatherStatsSection />
				</section>
			</div>
		</main>
	)
}
