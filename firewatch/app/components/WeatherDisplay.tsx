'use client'

import { useState, useEffect } from 'react'

export interface WeatherPoint {
	lat: number
	lng: number
	locationName: string
	timestamp: string
	windSpeed: number
	windGust: number
	windDirection: number
	temperature: number
	humidity: number
	pressure: number
	precipitation: number
	riskLevel: 'low' | 'moderate' | 'high' | 'extreme'
	alerts: string[]
}

export interface WeatherStats {
	lastUpdated: string
	monitoredLocations: number
	weatherPoints: WeatherPoint[]
	summary: {
		avgWindSpeed: number
		maxWindGust: number
		avgTemperature: number
		avgHumidity: number
		totalPrecipitation: number
		extremeWindCount: number
		lowHumidityCount: number
		severeWeatherLocations: number
	}
	alerts: {
		type: string
		severity: 'warning' | 'watch' | 'advisory'
		message: string
		location: string
	}[]
}

export const DEFAULT_WEATHER_STATS: WeatherStats = {
	lastUpdated: new Date().toISOString(),
	monitoredLocations: 0,
	weatherPoints: [],
	summary: {
		avgWindSpeed: 0,
		maxWindGust: 0,
		avgTemperature: 0,
		avgHumidity: 0,
		totalPrecipitation: 0,
		extremeWindCount: 0,
		lowHumidityCount: 0,
		severeWeatherLocations: 0,
	},
	alerts: [],
}

function WindIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M14 5l7 7m0 0l-7 7m7-7H3"
			/>
		</svg>
	)
}

function getDirectionLabel(deg: number): string {
	const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
	const idx = Math.round(deg / 45) % 8
	return directions[idx]
}

function getRiskColor(risk: WeatherPoint['riskLevel']): string {
	switch (risk) {
		case 'extreme':
			return 'bg-red-600 text-white'
		case 'high':
			return 'bg-orange-500 text-white'
		case 'moderate':
			return 'bg-yellow-500 text-gray-900'
		default:
			return 'bg-green-500 text-white'
	}
}

function getRiskBorderColor(risk: WeatherPoint['riskLevel']): string {
	switch (risk) {
		case 'extreme':
			return 'border-red-500'
		case 'high':
			return 'border-orange-500'
		case 'moderate':
			return 'border-yellow-500'
		default:
			return 'border-green-500'
	}
}

export function WeatherSummaryCard({ stats }: { stats: WeatherStats }) {
	return (
		<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
			<h3 className="font-mono text-sm text-gray-400 uppercase mb-4 flex items-center gap-2">
				<WindIcon className="w-4 h-4" />
				Weather Conditions
			</h3>
			<div className="grid grid-cols-2 gap-4">
				<div>
					<p className="text-3xl font-mono text-white">
						{stats.summary.avgWindSpeed}
						<span className="text-sm text-gray-400 ml-1">km/h</span>
					</p>
					<p className="text-xs text-gray-500 uppercase mt-1">
						Avg Wind
					</p>
				</div>
				<div>
					<p className="text-3xl font-mono text-orange-400">
						{stats.summary.maxWindGust}
						<span className="text-sm text-gray-400 ml-1">km/h</span>
					</p>
					<p className="text-xs text-gray-500 uppercase mt-1">
						Max Gust
					</p>
				</div>
				<div>
					<p className="text-3xl font-mono text-blue-400">
						{stats.summary.avgTemperature}°
					</p>
					<p className="text-xs text-gray-500 uppercase mt-1">
						Avg Temp
					</p>
				</div>
				<div>
					<p className="text-3xl font-mono text-cyan-400">
						{stats.summary.avgHumidity}%
					</p>
					<p className="text-xs text-gray-500 uppercase mt-1">
						Humidity
					</p>
				</div>
			</div>
		</div>
	)
}

export function SevereWeatherCard({ stats }: { stats: WeatherStats }) {
	return (
		<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
			<h3 className="font-mono text-sm text-gray-400 uppercase mb-4">
				Severe Weather
			</h3>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<span className="text-gray-400 font-mono text-sm">
						Affected Locations
					</span>
					<span
						className={`font-mono text-2xl ${stats.summary.severeWeatherLocations > 0 ? 'text-red-500' : 'text-green-400'}`}
					>
						{stats.summary.severeWeatherLocations}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-gray-400 font-mono text-sm">
						Strong Winds
					</span>
					<span
						className={`font-mono text-lg ${stats.summary.extremeWindCount > 0 ? 'text-orange-500' : 'text-gray-300'}`}
					>
						{stats.summary.extremeWindCount} sites
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-gray-400 font-mono text-sm">
						Precipitation
					</span>
					<span className="font-mono text-lg text-blue-400">
						{stats.summary.totalPrecipitation.toFixed(1)} mm
					</span>
				</div>
			</div>
		</div>
	)
}

export function WeatherAlerts({ stats }: { stats: WeatherStats }) {
	if (stats.alerts.length === 0) {
		return (
			<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
				<h3 className="font-mono text-sm text-gray-400 uppercase mb-4">
					Weather Alerts
				</h3>
				<p className="text-green-400 font-mono text-sm">
					No active alerts
				</p>
			</div>
		)
	}

	return (
		<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
			<h3 className="font-mono text-sm text-gray-400 uppercase mb-4">
				Weather Alerts ({stats.alerts.length})
			</h3>
			<div className="space-y-3 max-h-48 overflow-y-auto">
				{stats.alerts.map((alert, idx) => (
					<div
						key={idx}
						className={`p-3 rounded-md border-l-4 ${
							alert.severity === 'warning'
								? 'bg-red-900/30 border-red-500'
								: alert.severity === 'watch'
									? 'bg-orange-900/30 border-orange-500'
									: 'bg-yellow-900/30 border-yellow-500'
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-mono text-xs uppercase text-gray-400">
								{alert.type}
							</span>
							<span
								className={`text-xs uppercase font-semibold ${
									alert.severity === 'warning'
										? 'text-red-400'
										: alert.severity === 'watch'
											? 'text-orange-400'
											: 'text-yellow-400'
								}`}
							>
								{alert.severity}
							</span>
						</div>
						<p className="text-white text-sm mt-1">
							{alert.message}
						</p>
						<p className="text-gray-500 text-xs mt-1">
							{alert.location}
						</p>
					</div>
				))}
			</div>
		</div>
	)
}

export function WeatherPointsList({ stats }: { stats: WeatherStats }) {
	return (
		<div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
			<h3 className="font-mono text-sm text-gray-400 uppercase mb-4">
				Monitored Locations ({stats.monitoredLocations})
			</h3>
			<div className="space-y-2 max-h-64 overflow-y-auto">
				{stats.weatherPoints.map((point, idx) => (
					<div
						key={idx}
						className={`p-3 rounded-md bg-gray-800 border-l-4 ${getRiskBorderColor(point.riskLevel)}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-mono text-sm text-white">
								{point.locationName}
							</span>
							<span
								className={`px-2 py-0.5 rounded text-xs font-mono ${getRiskColor(point.riskLevel)}`}
							>
								{point.riskLevel.toUpperCase()}
							</span>
						</div>
						<div className="grid grid-cols-4 gap-2 mt-2 text-xs">
							<div>
								<span className="text-gray-500">Wind</span>
								<p className="text-gray-300 font-mono">
									{point.windSpeed} km/h{' '}
									{getDirectionLabel(point.windDirection)}
								</p>
							</div>
							<div>
								<span className="text-gray-500">Gust</span>
								<p className="text-orange-400 font-mono">
									{point.windGust} km/h
								</p>
							</div>
							<div>
								<span className="text-gray-500">Temp</span>
								<p className="text-gray-300 font-mono">
									{point.temperature}°C
								</p>
							</div>
							<div>
								<span className="text-gray-500">Humidity</span>
								<p className="text-cyan-400 font-mono">
									{point.humidity}%
								</p>
							</div>
						</div>
						{point.alerts.length > 0 && (
							<div className="mt-2 pt-2 border-t border-gray-700">
								{point.alerts.map((alert, aidx) => (
									<p
										key={aidx}
										className="text-yellow-400 text-xs"
									>
										⚠ {alert}
									</p>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

export function WeatherStatsSection() {
	const [stats, setStats] = useState<WeatherStats>(DEFAULT_WEATHER_STATS)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchWeather = async () => {
			try {
				setLoading(true)
				const response = await fetch('/api/weather', {
					cache: 'no-store',
				})
				if (!response.ok) {
					throw new Error(`API error: ${response.status}`)
				}
				const data = await response.json()
				setStats(data)
				setError(null)
			} catch (err) {
				console.error('Failed to fetch weather:', err)
				setError('Failed to load weather data')
			} finally {
				setLoading(false)
			}
		}

		fetchWeather()
		const interval = setInterval(fetchWeather, 300000) // 5 minutes
		return () => clearInterval(interval)
	}, [])

	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="bg-gray-900 rounded-lg p-6 border border-gray-800 animate-pulse"
					>
						<div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
						<div className="h-8 bg-gray-700 rounded w-1/2" />
					</div>
				))}
			</div>
		)
	}

	if (error) {
		return (
			<div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
				{error}
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<WeatherSummaryCard stats={stats} />
				<SevereWeatherCard stats={stats} />
				<WeatherAlerts stats={stats} />
			</div>
			<WeatherPointsList stats={stats} />
		</div>
	)
}
