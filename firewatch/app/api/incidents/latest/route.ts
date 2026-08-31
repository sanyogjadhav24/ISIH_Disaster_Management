import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseLocation(value: unknown): { lat: number; lng: number } | null {
	if (typeof value !== 'string') return null
	const parts = value.split(',').map((p) => p.trim())
	if (parts.length < 2) return null
	const lat = Number(parts[0])
	const lng = Number(parts[1])
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
	return { lat, lng }
}

// Mock Pune, Maharashtra weather conditions
// 26-31°C, 30-50% humidity
function getPuneTemp(): number {
	return 26 + Math.random() * 5
}

function getPuneHumidity(): number {
	// February is dry season in Pune: 30-50%
	return 30 + Math.random() * 20
}

export async function GET(req: Request) {
	try {
		const url = new URL(req.url)
		// Default to 50 sensors for mesh network
		const limit = Math.min(
			Number(url.searchParams.get('limit') || '50'),
			2000,
		)

		await connectDB()

		const forestConn = mongoose.connection.useDb('ForestFireDB', {
			useCache: true,
		})
		const col = forestConn.db?.collection('LiveStatus')
		if (!col) throw new Error('ForestFireDB connection is not ready')

		// Use aggregation to get only the most recent reading per sensor
		// Group by sensor_id (or lat/lng combo if no sensor_id) and pick the latest
		const docs = await col
			.aggregate([
				// Sort by timestamp descending first
				{ $sort: { timestamp: -1, _id: -1 } },
				// Group by sensor identifier and take the first (most recent) document
				{
					$group: {
						_id: {
							$ifNull: [
								'$sensor_id',
								{
									$concat: [
										{ $toString: '$latitude' },
										',',
										{ $toString: '$longitude' },
									],
								},
							],
						},
						doc: { $first: '$$ROOT' },
					},
				},
				// Replace root with the full document
				{ $replaceRoot: { newRoot: '$doc' } },
				// Sort again after grouping
				{ $sort: { timestamp: -1, _id: -1 } },
				// Limit results
				{ $limit: limit },
				// Project only needed fields
				{
					$project: {
						sensor_id: 1,
						location: 1,
						latitude: 1,
						longitude: 1,
						smoke: 1,
						co: 1,
						ch4: 1,
						mq4: 1,
						mq7: 1,
						mq135: 1,
						temp: 1,
						hum: 1,
						server_time: 1,
						timestamp: 1,
						active: 1,
						status: 1,
						status_text: 1,
						'features.status_text': 1,
					},
				},
			])
			.toArray()

		const normalized = docs
			.map((d: any) => {
				// Try direct latitude/longitude fields first, then fall back to parsing location string
				let lat: number | null = null
				let lng: number | null = null

				if (
					typeof d.latitude === 'number' &&
					Number.isFinite(d.latitude)
				) {
					lat = d.latitude
				}
				if (
					typeof d.longitude === 'number' &&
					Number.isFinite(d.longitude)
				) {
					lng = d.longitude
				}

				// Fall back to parsing location string if direct fields not available
				if (lat === null || lng === null) {
					const loc = parseLocation(d.location)
					if (loc) {
						lat = loc.lat
						lng = loc.lng
					}
				}

				const statusText =
					typeof d?.features?.status_text === 'string'
						? d.features.status_text
						: typeof d?.status_text === 'string'
							? d.status_text
							: typeof d?.status === 'string'
								? d.status
								: null

				const normalizedStatus =
					typeof statusText === 'string'
						? statusText.trim().toUpperCase()
						: null

				const active =
					// If status explicitly says IDEAL/IDLE, treat as inactive
					normalizedStatus === 'IDEAL' || normalizedStatus === 'IDLE'
						? false
						: normalizedStatus === 'ACTIVE'
							? true
							: typeof d?.active === 'boolean'
								? d.active
								: typeof d?.active === 'string'
									? (() => {
											const v = d.active
												.trim()
												.toUpperCase()
											if (
												v === 'ACTIVE' ||
												v === 'TRUE' ||
												v === '1' ||
												v === 'YES'
											)
												return true
											if (
												v === 'INACTIVE' ||
												v === 'FALSE' ||
												v === '0' ||
												v === 'NO'
											)
												return false
											return null
										})()
									: null

				return {
					_id: String(d._id),
					sensor_id: d.sensor_id ?? null,
					location: d.location ?? null,
					lat,
					lng,
					smoke: d.smoke ?? d.mq135 ?? null,
					co: d.co ?? d.mq7 ?? null,
					ch4: d.ch4 ?? d.mq4 ?? null,
					temp: d.temp ?? Math.round(getPuneTemp() * 10) / 10,
					hum: d.hum ?? Math.round(getPuneHumidity() * 10) / 10,
					server_time: d.server_time ?? d.timestamp ?? null,
					active,
					status_text: statusText,
				}
			})
			.filter(
				(d: any) => Number.isFinite(d.lat) && Number.isFinite(d.lng),
			)

		return NextResponse.json(
			{ success: true, count: normalized.length, data: normalized },
			{ headers: { 'Cache-Control': 'no-store, max-age=0' } },
		)
	} catch (err: any) {
		return NextResponse.json(
			{
				success: false,
				error: err?.message || 'Failed to fetch incidents',
			},
			{ status: 500 },
		)
	}
}
