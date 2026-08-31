'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { WeatherPoint, WeatherStats } from './WeatherDisplay'

interface IncidentReading {
	_id: string
	sensor_id: string | null
	location: string | null
	lat: number | null
	lng: number | null
	smoke: number | null
	co: number | null
	ch4: number | null
	temp: number | null
	hum: number | null
	server_time: string | null
	active?: boolean | null
	status_text?: string | null
}

// Dynamic import to avoid SSR issues with ArcGIS
const DynamicMap = dynamic(
	() => import('./FireMapInner').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-96 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
				Loading Map...
			</div>
		),
	},
) as React.ComponentType<{
	fires: FireLocation[]
	manualReports?: ManualReportLocation[]
	incidents?: IncidentReading[]
	weatherPoints?: WeatherPoint[]
	dataSource?: 'nasa' | 'manual' | 'all'
	showFires?: boolean
	showIncidents?: boolean
	showWeather?: boolean
	enableFirePopup?: boolean
	showPopulation?: boolean
	enablePopulationPopup?: boolean
	populationOpacity?: number
}>

interface FireLocation {
	latitude: number
	longitude: number
	brightness: number
	confidence: number | string
	satellite: string
	acq_date: string
	acq_time: string
	frp?: number
	scan: number
	track: number
	version: string
	bright_t31: number
	daynight: string
}

interface ManualReportLocation {
	_id?: string
	uid?: string
	title?: string
	description?: string
	severity?: string
	lat: number
	lng: number
	deviceName?: string
	deviceTime?: string
	status?: string
	createdAt?: string
}

interface FireMapProps {
	refreshInterval?: number
}

const FireMap: React.FC<FireMapProps> = ({ refreshInterval = 30000 }) => {
	const [fires, setFires] = useState<FireLocation[]>([])
	const [manualReports, setManualReports] = useState<ManualReportLocation[]>(
		[],
	)
	const [incidents, setIncidents] = useState<IncidentReading[]>([])
	const [weatherPoints, setWeatherPoints] = useState<WeatherPoint[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [lastUpdate, setLastUpdate] = useState<string>('')
	const [error, setError] = useState<string>('')

	// Population layer controls
	const [showPopulation, setShowPopulation] = useState(false)
	const [populationOpacity, setPopulationOpacity] = useState(0.6)

	// Weather layer toggle
	const [showWeather, setShowWeather] = useState(true)

	// Sensors/Incidents layer toggle
	const [showIncidents, setShowIncidents] = useState(true)

	// Popup toggles
	const [enableFirePopup, setEnableFirePopup] = useState(true)
	const [enablePopulationPopup, setEnablePopulationPopup] = useState(false)

	// Clear mode (hide everything, including fire dots)
	const [clearMode, setClearMode] = useState(false)

	// Data source (NASA vs manual reports)
	const [dataSource, setDataSource] = useState<'nasa' | 'manual' | 'all'>(
		'nasa',
	)

	// Fetch fire data from our simple API
	const fetchFireData = async () => {
		try {
			setIsLoading(true)
			setError('')

			const response = await fetch('/api/fires')
			if (!response.ok) {
				throw new Error(`API error: ${response.status}`)
			}
			const data = await response.json()

			if (data.success && data.data) {
				setFires(data.data)
				setLastUpdate(new Date().toLocaleTimeString())
			} else {
				setError(data.error || 'Failed to fetch fire data')
			}
		} catch (err) {
			setError('Network error occurred')
			console.error('Error:', err)
		} finally {
			setIsLoading(false)
		}
	}

	const fetchManualReports = async () => {
		try {
			setError('')
			const response = await fetch('/api/reports?scope=india', {
				cache: 'no-store',
			})
			if (!response.ok) {
				throw new Error(`API error: ${response.status}`)
			}
			const data = await response.json()
			if (data.success && Array.isArray(data.data)) {
				setManualReports(data.data)
			} else {
				setError(data.error || 'Failed to fetch manual reports')
			}
		} catch (err) {
			setError('Network error occurred')
			console.error('Error:', err)
		}
	}

	// Fetch weather data from Windy API
	const fetchWeatherData = async () => {
		try {
			const response = await fetch('/api/weather', { cache: 'no-store' })
			if (!response.ok) {
				console.warn('Weather API not available')
				return
			}
			const data: WeatherStats = await response.json()
			if (data.weatherPoints) {
				setWeatherPoints(data.weatherPoints)
			}
		} catch (err) {
			console.warn('Failed to fetch weather data:', err)
		}
	}

	// Fetch live sensor/incident data (limit 50 sensors)
	const fetchIncidents = async () => {
		try {
			const response = await fetch('/api/incidents/latest?limit=50', {
				cache: 'no-store',
			})
			if (!response.ok) {
				console.warn('Incidents API not available')
				return
			}
			const data = await response.json()
			if (data.success && Array.isArray(data.data)) {
				setIncidents(data.data)
			}
		} catch (err) {
			console.warn('Failed to fetch incidents:', err)
		}
	}

	// Fetch new data from NASA and update database
	const updateFireData = async () => {
		try {
			setError('')
			const response = await fetch('/api/fires/update', {
				method: 'POST',
			})
			if (!response.ok) {
				throw new Error(`API error: ${response.status}`)
			}
			const data = await response.json()

			if (data.success) {
				// Refresh the displayed data
				fetchFireData()
			} else {
				setError(data.error || 'Failed to update fire data')
			}
		} catch (err) {
			setError('Failed to update data')
			console.error('Error:', err)
		}
	}

	// Test MongoDB connection
	const testConnection = async () => {
		try {
			setError('')
			const response = await fetch('/api/fires/test')
			if (!response.ok) {
				throw new Error(`API error: ${response.status}`)
			}
			const data = await response.json()

			console.log('Test result:', data)

			if (data.success) {
				alert(
					`✅ MongoDB Test Successful!\n\nTotal Records: ${data.totalRecords}\nToday's Records: ${data.todayRecords}\nCollection: ${data.collection}`,
				)
			} else {
				setError(data.error || 'Test failed')
			}
		} catch (err) {
			setError('Test connection failed')
			console.error('Error:', err)
		}
	}

	// Test population data
	const testPopulationData = async () => {
		try {
			setError('')
			const response = await fetch('/api/population/test')
			if (!response.ok) {
				throw new Error(`API error: ${response.status}`)
			}
			const data = await response.json()

			console.log('Population test result:', data)

			if (data.success) {
				alert(
					`✅ Population Data Test Successful!\n\nTotal Districts: ${data.totalDistricts}\nTotal Population: ${data.statistics.totalPopulation?.toLocaleString()}\nTop States: ${data.topStatesByDistricts
						?.slice(0, 3)
						.map((s: any) => s._id)
						.join(', ')}`,
				)
			} else {
				setError(data.error || 'Population test failed')
			}
		} catch (err) {
			setError('Population test failed')
			console.error('Error:', err)
		}
	}

	useEffect(() => {
		fetchFireData()
		fetchManualReports()
		fetchWeatherData()
		fetchIncidents()

		// Poll manual reports so new MongoDB entries show up automatically.
		// (Realtime change streams would require a server push channel; polling is the simplest reliable approach.)
		const pollMs = 5000
		const id = setInterval(() => {
			fetchManualReports()
		}, pollMs)

		// Poll incidents/sensors every 10 seconds
		const incidentsId = setInterval(fetchIncidents, 10000)

		// Weather updates every 5 minutes
		const weatherId = setInterval(fetchWeatherData, 300000)

		return () => {
			clearInterval(id)
			clearInterval(incidentsId)
			clearInterval(weatherId)
		}
	}, [])

	return (
		<div className="w-full">
			{/* Controls */}
			<div className="bg-white shadow-sm border rounded-lg p-4 mb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<button
							onClick={fetchFireData}
							disabled={isLoading}
							className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
						>
							{isLoading ? 'Loading...' : 'Refresh Data'}
						</button>
						<button
							onClick={updateFireData}
							disabled={isLoading}
							className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
						>
							Update from NASA
						</button>
					</div>
					<div className="flex items-center space-x-4 text-sm text-gray-600">
						{lastUpdate && <span>Last update: {lastUpdate}</span>}
						<span className="flex items-center">
							<div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
							{fires.length} active fires
						</span>
					</div>
				</div>
				{error && (
					<div className="mt-2 text-red-600 text-sm">{error}</div>
				)}

				{/* Population Layer Controls */}
				<div className="mt-4 pt-4 border-t border-gray-200">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-6">
							<div className="flex items-center space-x-3">
								<span className="text-sm font-medium text-gray-700">
									Data:
								</span>
								<label className="flex items-center cursor-pointer">
									<input
										type="radio"
										name="dataSource"
										value="nasa"
										checked={dataSource === 'nasa'}
										onChange={() => setDataSource('nasa')}
										className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
									/>
									<span className="text-sm text-gray-700">
										NASA
									</span>
								</label>
								<label className="flex items-center cursor-pointer">
									<input
										type="radio"
										name="dataSource"
										value="manual"
										checked={dataSource === 'manual'}
										onChange={() => setDataSource('manual')}
										className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
									/>
									<span className="text-sm text-gray-700">
										Manual
									</span>
								</label>
								<label className="flex items-center cursor-pointer">
									<input
										type="radio"
										name="dataSource"
										value="all"
										checked={dataSource === 'all'}
										onChange={() => setDataSource('all')}
										className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
									/>
									<span className="text-sm text-gray-700">
										All
									</span>
								</label>
							</div>

							<div className="flex items-center">
								<label className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={clearMode}
										onChange={(e) =>
											setClearMode(e.target.checked)
										}
										className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
									/>
									<span className="text-sm font-medium text-gray-700">
										Clear (hide everything)
									</span>
								</label>
							</div>

							<div className="flex items-center">
								<label className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={enableFirePopup}
										onChange={(e) =>
											setEnableFirePopup(e.target.checked)
										}
										className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
									/>
									<span className="text-sm font-medium text-gray-700">
										Area Affected
									</span>
								</label>
							</div>

							<div className="flex items-center">
								<label className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={enablePopulationPopup}
										onChange={(e) =>
											setEnablePopulationPopup(
												e.target.checked,
											)
										}
										className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
									/>
									<span className="text-sm font-medium text-gray-700">
										Active Disasters
									</span>
								</label>
							</div>

							<div className="flex items-center">
								<label className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={showWeather}
										onChange={(e) =>
											setShowWeather(e.target.checked)
										}
										className="mr-2 h-4 w-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
									/>
									<span className="text-sm font-medium text-gray-700">
										Weather
									</span>
								</label>
							</div>

							<div className="flex items-center">
								<label className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={showIncidents}
										onChange={(e) =>
											setShowIncidents(e.target.checked)
										}
										className="mr-2 h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
									/>
									<span className="text-sm font-medium text-gray-700">
										Sensors ({incidents.length})
									</span>
								</label>
							</div>

							{showPopulation && (
								<div className="flex items-center space-x-2">
									<label className="text-sm text-gray-600">
										Opacity:
									</label>
									<input
										type="range"
										min="0.1"
										max="1"
										step="0.1"
										value={populationOpacity}
										onChange={(e) =>
											setPopulationOpacity(
												parseFloat(e.target.value),
											)
										}
										className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
									/>
									<span className="text-sm text-gray-600 w-10">
										{Math.round(populationOpacity * 100)}%
									</span>
								</div>
							)}
						</div>

						{showPopulation && (
							<div className="flex items-center text-xs text-gray-500">
								<div className="flex items-center space-x-2">
									<div className="flex space-x-1">
										<div className="w-3 h-3 bg-yellow-300 border border-white"></div>
										<span>&lt;100K</span>
									</div>
									<div className="flex space-x-1">
										<div className="w-3 h-3 bg-orange-300 border border-white"></div>
										<span>500K</span>
									</div>
									<div className="flex space-x-1">
										<div className="w-3 h-3 bg-orange-500 border border-white"></div>
										<span>1M</span>
									</div>
									<div className="flex space-x-1">
										<div className="w-3 h-3 bg-red-500 border border-white"></div>
										<span>&gt;5M</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Map */}
			<div className="w-full h-96 rounded-lg overflow-hidden shadow-lg">
				<DynamicMap
					fires={fires}
					manualReports={manualReports}
					incidents={incidents}
					weatherPoints={weatherPoints}
					dataSource={dataSource}
					showFires={!clearMode}
					showIncidents={showIncidents && !clearMode}
					showWeather={showWeather && !clearMode}
					enableFirePopup={enableFirePopup}
					showPopulation={showPopulation && !clearMode}
					enablePopulationPopup={enablePopulationPopup}
					populationOpacity={populationOpacity}
				/>
			</div>

			{/* Weather Legend */}
			{showWeather && weatherPoints.length > 0 && (
				<div className="mt-4 bg-white shadow-sm border rounded-lg p-4">
					<h4 className="text-sm font-medium text-gray-700 mb-2">
						Weather Risk Legend
					</h4>
					<div className="flex items-center space-x-6 text-xs">
						<div className="flex items-center space-x-1">
							<div className="w-3 h-3 rounded-full bg-green-500"></div>
							<span className="text-gray-600">Low Risk</span>
						</div>
						<div className="flex items-center space-x-1">
							<div className="w-3 h-3 rounded-full bg-yellow-500"></div>
							<span className="text-gray-600">Moderate</span>
						</div>
						<div className="flex items-center space-x-1">
							<div className="w-3 h-3 rounded-full bg-orange-500"></div>
							<span className="text-gray-600">High Risk</span>
						</div>
						<div className="flex items-center space-x-1">
							<div className="w-3 h-3 rounded-full bg-red-600"></div>
							<span className="text-gray-600">Extreme</span>
						</div>
						<span className="text-gray-400 ml-4">|</span>
						<span className="text-gray-500">
							{weatherPoints.length} monitored locations
						</span>
					</div>
				</div>
			)}
		</div>
	)
}

export default FireMap
