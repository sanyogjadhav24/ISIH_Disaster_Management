import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Windy Point Forecast API response types
interface WindyForecastResponse {
	ts: number[] // timestamps
	units: {
		wind_u_surface: string
		wind_v_surface: string
		gust_surface: string
		temp: string
		rh: string
		pressure: string
		precip: string
	}
	wind_u_surface: number[] // U component of wind (m/s)
	wind_v_surface: number[] // V component of wind (m/s)
	gust_surface: number[] // Wind gust (m/s)
	temp: number[] // Temperature (K or C)
	rh: number[] // Relative humidity (%)
	pressure: number[] // Surface pressure (Pa)
	precip: number[] // Precipitation (mm)
}

export interface WeatherPoint {
	lat: number
	lng: number
	locationName: string
	timestamp: string
	windSpeed: number // km/h
	windGust: number // km/h
	windDirection: number // degrees
	temperature: number // Celsius
	humidity: number // %
	pressure: number // hPa
	precipitation: number // mm
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

// Key fire-prone locations to monitor
const MONITOR_LOCATIONS = [
	{ lat: 20.5937, lng: 78.9629, name: 'Central India' },
	{ lat: 28.6139, lng: 77.209, name: 'Delhi Region' },
	{ lat: 23.2599, lng: 77.4126, name: 'Madhya Pradesh' },
	{ lat: 22.9734, lng: 78.6569, name: 'Vindhya Range' },
	{ lat: 15.3173, lng: 75.7139, name: 'Karnataka' },
	{ lat: 19.7515, lng: 75.7139, name: 'Maharashtra' },
	{ lat: 26.8467, lng: 80.9462, name: 'Uttar Pradesh' },
	{ lat: 23.6102, lng: 85.2799, name: 'Jharkhand' },
	{ lat: 20.9517, lng: 85.0985, name: 'Odisha' },
	{ lat: 25.0961, lng: 85.3131, name: 'Bihar' },
]

// Generate realistic mock weather data for demo/fallback
function generateMockWeatherPoint(location: {
	lat: number
	lng: number
	name: string
}): WeatherPoint {
	// Seed-based pseudo-random for consistency
	const seed = (location.lat * 1000 + location.lng * 100) % 1000
	const rand = (offset: number) =>
		(((seed + offset) * 9301 + 49297) % 233280) / 233280

	const windSpeed = Math.round((rand(1) * 40 + 5) * 10) / 10 // 5-45 km/h
	const windGust = Math.round((windSpeed + rand(2) * 30) * 10) / 10 // wind + 0-30
	const windDirection = Math.round(rand(3) * 360)
	const temperature = Math.round((rand(4) * 20 + 25) * 10) / 10 // 25-45°C
	const humidity = Math.round(rand(5) * 60 + 20) // 20-80%
	const pressure = Math.round(1000 + rand(6) * 30) // 1000-1030 hPa
	const precipitation = Math.round(rand(7) * 5 * 10) / 10 // 0-5 mm

	const riskLevel = assessRiskLevel(
		windSpeed,
		windGust,
		humidity,
		temperature,
		precipitation,
	)

	const point: WeatherPoint = {
		lat: location.lat,
		lng: location.lng,
		locationName: location.name,
		timestamp: new Date().toISOString(),
		windSpeed,
		windGust,
		windDirection,
		temperature,
		humidity,
		pressure,
		precipitation,
		riskLevel,
		alerts: [],
	}

	point.alerts = generateAlerts(point)
	return point
}

function calculateWindSpeed(u: number, v: number): number {
	// Wind speed from U and V components, convert to km/h
	return Math.sqrt(u * u + v * v) * 3.6
}

function calculateWindDirection(u: number, v: number): number {
	// Wind direction from U and V components
	return ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360
}

function kelvinToCelsius(k: number): number {
	return k - 273.15
}

function pascalToHpa(pa: number): number {
	return pa / 100
}

function assessRiskLevel(
	windSpeed: number,
	windGust: number,
	humidity: number,
	temperature: number,
	precipitation: number = 0,
): 'low' | 'moderate' | 'high' | 'extreme' {
	let riskScore = 0

	// High wind - severe weather risk
	if (windSpeed > 60) riskScore += 3
	else if (windSpeed > 40) riskScore += 2
	else if (windSpeed > 25) riskScore += 1

	// Wind gusts - storm risk
	if (windGust > 80) riskScore += 3
	else if (windGust > 60) riskScore += 2
	else if (windGust > 40) riskScore += 1

	// Extreme temperatures
	if (temperature > 42 || temperature < 0) riskScore += 2
	else if (temperature > 38 || temperature < 5) riskScore += 1

	// Heavy precipitation
	if (precipitation > 30) riskScore += 3
	else if (precipitation > 15) riskScore += 2
	else if (precipitation > 5) riskScore += 1

	if (riskScore >= 7) return 'extreme'
	if (riskScore >= 4) return 'high'
	if (riskScore >= 2) return 'moderate'
	return 'low'
}

function generateAlerts(point: WeatherPoint): string[] {
	const alerts: string[] = []

	// Wind alerts
	if (point.windGust > 80) {
		alerts.push('Severe storm warning: Damaging wind gusts expected')
	} else if (point.windGust > 60) {
		alerts.push('Wind advisory: Strong gusts possible')
	}

	// Temperature alerts
	if (point.temperature > 42) {
		alerts.push('Extreme heat warning: Stay indoors and hydrate')
	} else if (point.temperature > 38) {
		alerts.push('Heat advisory: High temperatures expected')
	} else if (point.temperature < 0) {
		alerts.push('Freeze warning: Sub-zero temperatures')
	} else if (point.temperature < 5) {
		alerts.push('Cold weather advisory')
	}

	// Precipitation alerts
	if (point.precipitation > 30) {
		alerts.push('Heavy rain warning: Flooding possible')
	} else if (point.precipitation > 15) {
		alerts.push('Rain advisory: Significant precipitation expected')
	}

	// Humidity alerts
	if (point.humidity > 90) {
		alerts.push('High humidity advisory: Uncomfortable conditions')
	} else if (point.humidity < 20) {
		alerts.push('Very dry conditions: Stay hydrated')
	}

	return alerts
}

async function fetchWindyForecast(
	lat: number,
	lng: number,
): Promise<WindyForecastResponse | null> {
	const apiKey = process.env.WINDY_API_KEY

	if (!apiKey) {
		console.warn('WINDY_API_KEY not configured, using mock data')
		return null
	}

	try {
		const response = await fetch(
			'https://api.windy.com/api/point-forecast/v2',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					key: apiKey,
					lat,
					lon: lng,
					model: 'gfs', // Global Forecast System
					parameters: [
						'wind',
						'temp',
						'rh',
						'pressure',
						'precip',
						'gust',
					],
					levels: ['surface'],
				}),
			},
		)

		if (!response.ok) {
			console.warn(`Windy API error: ${response.status}, using mock data`)
			return null
		}

		return await response.json()
	} catch (error) {
		console.error('Failed to fetch Windy forecast:', error)
		return null
	}
}

export async function GET() {
	try {
		const weatherPoints: WeatherPoint[] = []
		const allAlerts: WeatherStats['alerts'] = []

		// Fetch weather for all monitored locations
		const promises = MONITOR_LOCATIONS.map(async (location) => {
			const forecast = await fetchWindyForecast(
				location.lat,
				location.lng,
			)

			// Use mock data if API fails or returns no data
			if (!forecast || !forecast.ts?.length) {
				return generateMockWeatherPoint(location)
			}

			// Get current/latest forecast (first timestamp)
			const idx = 0
			const windU = forecast.wind_u_surface?.[idx] ?? 0
			const windV = forecast.wind_v_surface?.[idx] ?? 0

			const windSpeed = calculateWindSpeed(windU, windV)
			const windDirection = calculateWindDirection(windU, windV)
			const windGust = (forecast.gust_surface?.[idx] ?? 0) * 3.6 // m/s to km/h
			const temperature = kelvinToCelsius(forecast.temp?.[idx] ?? 293)
			const humidity = forecast.rh?.[idx] ?? 50
			const pressure = pascalToHpa(forecast.pressure?.[idx] ?? 101325)
			const precipitation = forecast.precip?.[idx] ?? 0

			const riskLevel = assessRiskLevel(
				windSpeed,
				windGust,
				humidity,
				temperature,
				precipitation,
			)

			const point: WeatherPoint = {
				lat: location.lat,
				lng: location.lng,
				locationName: location.name,
				timestamp: new Date(forecast.ts[idx] * 1000).toISOString(),
				windSpeed: Math.round(windSpeed * 10) / 10,
				windGust: Math.round(windGust * 10) / 10,
				windDirection: Math.round(windDirection),
				temperature: Math.round(temperature * 10) / 10,
				humidity: Math.round(humidity),
				pressure: Math.round(pressure),
				precipitation: Math.round(precipitation * 10) / 10,
				riskLevel,
				alerts: [],
			}

			point.alerts = generateAlerts(point)

			// Add to global alerts if severe weather
			if (riskLevel === 'extreme' || riskLevel === 'high') {
				const alertType =
					windGust > 60
						? 'Storm'
						: temperature > 38
							? 'Heat'
							: precipitation > 15
								? 'Rain'
								: 'Weather'
				allAlerts.push({
					type: alertType,
					severity: riskLevel === 'extreme' ? 'warning' : 'watch',
					message: `${riskLevel.toUpperCase()} weather conditions - ${alertType.toLowerCase()} alert`,
					location: location.name,
				})
			}

			return point
		})

		const results = await Promise.all(promises)
		weatherPoints.push(
			...results.filter((p): p is WeatherPoint => p !== null),
		)

		// Calculate summary statistics
		const validPoints = weatherPoints.filter(
			(p) => p.windSpeed > 0 || p.temperature > -50,
		)

		const summary = {
			avgWindSpeed:
				validPoints.length > 0
					? Math.round(
							(validPoints.reduce(
								(sum, p) => sum + p.windSpeed,
								0,
							) /
								validPoints.length) *
								10,
						) / 10
					: 0,
			maxWindGust:
				validPoints.length > 0
					? Math.max(...validPoints.map((p) => p.windGust))
					: 0,
			avgTemperature:
				validPoints.length > 0
					? Math.round(
							(validPoints.reduce(
								(sum, p) => sum + p.temperature,
								0,
							) /
								validPoints.length) *
								10,
						) / 10
					: 0,
			avgHumidity:
				validPoints.length > 0
					? Math.round(
							validPoints.reduce(
								(sum, p) => sum + p.humidity,
								0,
							) / validPoints.length,
						)
					: 0,
			totalPrecipitation: validPoints.reduce(
				(sum, p) => sum + p.precipitation,
				0,
			),
			extremeWindCount: validPoints.filter((p) => p.windGust > 50).length,
			lowHumidityCount: validPoints.filter((p) => p.humidity < 30).length,
			severeWeatherLocations: validPoints.filter(
				(p) => p.riskLevel === 'high' || p.riskLevel === 'extreme',
			).length,
		}

		const stats: WeatherStats = {
			lastUpdated: new Date().toISOString(),
			monitoredLocations: MONITOR_LOCATIONS.length,
			weatherPoints,
			summary,
			alerts: allAlerts,
		}

		return NextResponse.json(stats, {
			headers: {
				'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
			},
		})
	} catch (error) {
		console.error('Weather API error:', error)
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to fetch weather data',
			},
			{ status: 500 },
		)
	}
}
