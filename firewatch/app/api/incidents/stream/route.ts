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

function toSseEvent(event: string, data: any) {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET() {
	await connectDB()

	const forestConn = mongoose.connection.useDb('ForestFireDB', {
		useCache: true,
	})
	const col = forestConn.db?.collection('LiveStatus')
	if (!col) throw new Error('ForestFireDB connection is not ready')

	const encoder = new TextEncoder()

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			// Initial snapshot (last 200 readings; client de-dupes by sensor_id)
			try {
				// Use aggregation to get only the most recent reading per sensor
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
						// Limit to 50 sensors for mesh network
						{ $limit: 50 },
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
						// Try direct latitude/longitude fields first
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

						// Fall back to parsing location string
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
							normalizedStatus === 'IDEAL' ||
							normalizedStatus === 'IDLE'
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
							hum:
								d.hum ??
								Math.round(getPuneHumidity() * 10) / 10,
							server_time: d.server_time ?? d.timestamp ?? null,
							active,
							status_text: statusText,
						}
					})
					.filter(
						(d: any) =>
							Number.isFinite(d.lat) && Number.isFinite(d.lng),
					)

				controller.enqueue(
					encoder.encode(
						toSseEvent('snapshot', { data: normalized }),
					),
				)
			} catch (err: any) {
				controller.enqueue(
					encoder.encode(
						toSseEvent('error', {
							message: err?.message || 'snapshot failed',
						}),
					),
				)
			}

			// Heartbeat to keep proxies from buffering
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(
						encoder.encode(`event: ping\ndata: {}\n\n`),
					)
				} catch {
					// ignore
				}
			}, 15000)

			let changeStream: any = null
			try {
				changeStream = col.watch([], { fullDocument: 'updateLookup' })

				for await (const change of changeStream) {
					const doc = change?.fullDocument
					if (!doc) continue

					// Try direct latitude/longitude fields first
					let lat: number | null = null
					let lng: number | null = null

					if (
						typeof doc.latitude === 'number' &&
						Number.isFinite(doc.latitude)
					) {
						lat = doc.latitude
					}
					if (
						typeof doc.longitude === 'number' &&
						Number.isFinite(doc.longitude)
					) {
						lng = doc.longitude
					}

					// Fall back to parsing location string
					if (lat === null || lng === null) {
						const loc = parseLocation(doc.location)
						if (loc) {
							lat = loc.lat
							lng = loc.lng
						}
					}

					if (lat === null || lng === null) continue

					const statusText =
						typeof doc?.features?.status_text === 'string'
							? doc.features.status_text
							: typeof doc?.status_text === 'string'
								? doc.status_text
								: typeof doc?.status === 'string'
									? doc.status
									: null

					const normalizedStatus =
						typeof statusText === 'string'
							? statusText.trim().toUpperCase()
							: null
					const active =
						normalizedStatus === 'IDEAL' ||
						normalizedStatus === 'IDLE'
							? false
							: normalizedStatus === 'ACTIVE'
								? true
								: typeof doc?.active === 'boolean'
									? doc.active
									: typeof doc?.active === 'string'
										? (() => {
												const v = doc.active
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

					const payload = {
						_id: String(doc._id),
						sensor_id: doc.sensor_id ?? null,
						location: doc.location ?? null,
						lat,
						lng,
						smoke: doc.smoke ?? doc.mq135 ?? null,
						co: doc.co ?? doc.mq7 ?? null,
						ch4: doc.ch4 ?? doc.mq4 ?? null,
						temp: doc.temp ?? Math.round(getPuneTemp() * 10) / 10,
						hum: doc.hum ?? Math.round(getPuneHumidity() * 10) / 10,
						server_time: doc.server_time ?? doc.timestamp ?? null,
						active,
						status_text: statusText,
					}

					controller.enqueue(
						encoder.encode(toSseEvent('incident', payload)),
					)
				}
			} catch (err: any) {
				controller.enqueue(
					encoder.encode(
						toSseEvent('error', {
							message: err?.message || 'stream failed',
						}),
					),
				)
			} finally {
				clearInterval(heartbeat)
				try {
					if (changeStream) await changeStream.close()
				} catch {
					// ignore
				}
				try {
					controller.close()
				} catch {
					// ignore
				}
			}
		},
		async cancel() {
			// No-op: change stream is closed in finally block.
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-store, no-transform',
			Connection: 'keep-alive',
		},
	})
}
