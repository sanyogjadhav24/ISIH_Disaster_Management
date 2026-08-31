'use client'

import { useMemo, memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { geoMercator, geoPath } from 'd3-geo'
import type {
	FeatureCollection,
	Feature,
	Geometry,
	GeoJsonProperties,
} from 'geojson'
import { FireData } from '../types'
// import { dummyFireData, type FireData } from '../data/fire-data'

const getBrightnessColor = (
	brightness: number,
	confidence: number | string,
): string => {
	const conf =
		typeof confidence === 'string'
			? Number.parseInt(confidence)
			: confidence
	const bright = brightness

	// High confidence, high brightness - deep dark red
	if (conf >= 90 && bright >= 320) return '#8b0000'
	// High confidence, moderate brightness - dark crimson
	if (conf >= 90 && bright >= 300) return '#a11b1b'
	// Moderate confidence - dark maroon
	if (conf >= 80) return '#b22222'
	// Lower confidence - muted dark red
	return '#943030'
}

const StaticPixel = memo(({ x, y }: { x: number; y: number }) => (
	<circle cx={x} cy={y} r={1} fill="#1a1a2e" fillOpacity={0.5} />
))
StaticPixel.displayName = 'StaticPixel'

const FirePixel = memo(
	({
		x,
		y,
		brightness,
		confidence,
		canPulse,
		index,
		onEnter,
		onLeave,
	}: {
		x: number
		y: number
		brightness: number
		confidence: number | string
		canPulse: boolean
		index: number
		onEnter?: () => void
		onLeave?: () => void
	}) => {
		const color = getBrightnessColor(brightness, confidence)
		const delay = useMemo(() => (index * 0.08) % 1, [index])

		// Only animate high confidence fires, and reduce animation complexity
		const animate = canPulse
			? {
					scale: [1, 1.3, 1],
					opacity: [1, 0.8, 1],
				}
			: { scale: 1, opacity: 1 }

		const transition = canPulse
			? {
					opacity: {
						duration: 2.5,
						repeat: Number.POSITIVE_INFINITY,
						ease: 'easeInOut' as const,
						delay,
						repeatDelay: 1,
					},
					scale: {
						duration: 2.5,
						repeat: Number.POSITIVE_INFINITY,
						ease: 'easeInOut' as const,
						delay,
						repeatDelay: 1,
					},
				}
			: { type: 'spring' as const, stiffness: 260, damping: 20 }

		return (
			<motion.circle
				cx={x}
				cy={y}
				r={1.8}
				fill={color}
				animate={animate}
				transition={transition}
				onMouseEnter={onEnter}
				onMouseLeave={onLeave}
				style={{
					filter: canPulse
						? `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 6px ${color}40)`
						: `drop-shadow(0 0 1px ${color}80)`,
					willChange: canPulse ? 'transform, opacity' : undefined,
					cursor: onEnter ? 'pointer' : undefined,
				}}
			/>
		)
	},
)
FirePixel.displayName = 'FirePixel'

interface DottedMapProps {
	width?: number
	height?: number
	// optional GeoJSON URL for admin1 / state boundaries
	stateGeoJsonUrl?: string
}

export default function DottedMap({
	width = 1000,
	height = 560,
	stateGeoJsonUrl,
}: DottedMapProps) {
	const [hoveredFire, setHoveredFire] = useState<FireData | null>(null)
	const [fires, setFires] = useState<FireData[]>([])

	const projection = useMemo(
		() =>
			geoMercator()
				.scale(140)
				.center([15, 25])
				.rotate([0, 0, 0])
				.translate([width / 2, height / 2]),
		[width, height],
	)

	const { staticPixels, firePixels } = useMemo(() => {
		const staticArr: Array<{ key: string; x: number; y: number }> = []
		const fireArr: Array<{
			key: string
			x: number
			y: number
			fire: FireData
			index: number
		}> = []

		fires.forEach((fire, index) => {
			const coords = projection([fire.longitude, fire.latitude])
			if (!coords) return

			const [x, y] = coords
			if (x < 0 || x > width || y < 0 || y > height) return

			const key = `fire-${index}`

			fireArr.push({
				key,
				x,
				y,
				fire,
				index,
			})
		})
		console.log('static pixels', staticArr)
		return { staticPixels: staticArr, firePixels: fireArr }
	}, [projection, width, height, fires])

	const [countriesGeo, setCountriesGeo] = useState<FeatureCollection<
		Geometry,
		GeoJsonProperties
	> | null>(null)
	const [statesGeo, setStatesGeo] = useState<FeatureCollection<
		Geometry,
		GeoJsonProperties
	> | null>(null)

	const pathGenerator = useMemo(
		() => geoPath().projection(projection),
		[projection],
	)

	useEffect(() => {
		let mounted = true
		const COUNTRIES_URL =
			'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'

		;(async () => {
			try {
				const res = await fetch(COUNTRIES_URL)
				const json = await res.json()
				if (!mounted) return
				setCountriesGeo(json)
			} catch (e) {
				console.error('Failed to load countries geojson:', e)
			}
		})()

		return () => {
			mounted = false
		}
	}, [])

	useEffect(() => {
		if (!stateGeoJsonUrl) return
		let mounted = true
		;(async () => {
			try {
				const res = await fetch(stateGeoJsonUrl)
				const json = await res.json()
				if (!mounted) return
				setStatesGeo(json)
			} catch (e) {
				console.error('Failed to load states geojson:', e)
			}
		})()

		return () => {
			mounted = false
		}
	}, [stateGeoJsonUrl])

	useEffect(() => {
		let mounted = true
		let abortController: AbortController | null = null
		let timeoutId: number | undefined

		const initialDelay = 5000
		const maxDelay = 60000
		let currentDelay = initialDelay

		const fetchOnce = async () => {
			if (!mounted) return
			abortController = new AbortController()
			try {
				const res = await fetch('/api/fires', {
					signal: abortController.signal,
				})
				const json = await res.json()
				if (!mounted) return
				if (json && json.success && Array.isArray(json.data)) {
					setFires(json.data)
				} else if (Array.isArray(json)) {
					setFires(json)
				} else {
					setFires([])
				}
				// success -> reset delay
				currentDelay = initialDelay
			} catch (err) {
				if (!mounted) return
				console.error('Failed to fetch fires:', err)
				// exponential backoff on error
				currentDelay = Math.min(
					maxDelay,
					Math.max(initialDelay, currentDelay * 2),
				)
			} finally {
				if (!mounted) return
				timeoutId = window.setTimeout(fetchOnce, currentDelay)
			}
		}

		fetchOnce()

		return () => {
			mounted = false
			if (abortController) abortController.abort()
			if (timeoutId) clearTimeout(timeoutId)
		}
	}, [])

	return (
		<div className="relative w-full">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="w-full h-auto bg-[var(--ds-background-100)]"
			>
				<defs>
					<filter id="fireGlow">
						<feGaussianBlur stdDeviation="2" result="coloredBlur" />
						<feMerge>
							<feMergeNode in="coloredBlur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				<g>
					{staticPixels.map((p) => (
						<StaticPixel key={p.key} x={p.x} y={p.y} />
					))}
				</g>

				{/* country + state boundaries (dotted white) */}
				{countriesGeo && (
					<g className="boundaries" pointerEvents="none">
						{countriesGeo.features.map(
							(
								f: Feature<Geometry, GeoJsonProperties>,
								i: number,
							) => {
								const d = pathGenerator(
									f as Feature<Geometry, GeoJsonProperties>,
								)
								return (
									<path
										key={`c-${i}`}
										d={d ?? undefined}
										fill="none"
										stroke="white"
										strokeWidth={0.8}
										strokeDasharray="3 3"
										strokeLinecap="round"
										strokeLinejoin="round"
										style={{ opacity: 0.9 }}
									/>
								)
							},
						)}
					</g>
				)}
				{statesGeo && (
					<g className="boundaries states" pointerEvents="none">
						{statesGeo.features.map(
							(
								f: Feature<Geometry, GeoJsonProperties>,
								i: number,
							) => {
								const d = pathGenerator(
									f as Feature<Geometry, GeoJsonProperties>,
								)
								return (
									<path
										key={`s-${i}`}
										d={d ?? undefined}
										fill="none"
										stroke="white"
										strokeWidth={0.6}
										strokeDasharray="2 2"
										strokeLinecap="round"
										strokeLinejoin="round"
										style={{ opacity: 0.85 }}
									/>
								)
							},
						)}
					</g>
				)}

				<g filter="url(#fireGlow)">
					{firePixels.map((p) => {
						const conf =
							typeof p.fire.confidence === 'number'
								? p.fire.confidence
								: Number.parseInt(p.fire.confidence)
						// Only pulse fires with confidence >= 95 to reduce animations
						return (
							<FirePixel
								key={p.key}
								x={p.x}
								y={p.y}
								brightness={p.fire.brightness}
								confidence={p.fire.confidence}
								canPulse={conf >= 95}
								index={p.index}
								onEnter={() => setHoveredFire(p.fire)}
								onLeave={() => setHoveredFire(null)}
							/>
						)
					})}
				</g>
			</svg>

			<AnimatePresence>
				{hoveredFire &&
					(() => {
						const coords = projection([
							hoveredFire.longitude,
							hoveredFire.latitude,
						])
						if (!coords) return null
						return (
							<div
								// initial={{ opacity: 0, y: 5 }}
								// animate={{ opacity: 1, y: 0 }}
								// exit={{ opacity: 0, y: 5 }}
								// transition={{ duration: 0.15 }}
								className="absolute pointer-events-none z-10 bg-[var(--ds-background-200)] border border-[var(--ds-gray-200)] rounded px-3 py-2 text-xs font-mono shadow-lg"
								style={{
									left: `${(coords[0] / width) * 100}%`,
									top: `${(coords[1] / height) * 100}%`,
									transform: 'translate(-50%, -140%)',
									maxWidth: '180px',
								}}
							>
								<div className="space-y-1">
									<div className="flex items-center gap-1.5 text-[var(--ds-gray-1000)]">
										<span>Fire Detection</span>
									</div>
									<div className="text-[var(--ds-gray-900)] space-y-0.5">
										<div>
											Brightness: {hoveredFire.brightness}
										</div>
										<div>
											Confidence: {hoveredFire.confidence}
											%
										</div>
										<div>
											FRP: {hoveredFire.frp.toFixed(1)} MW
										</div>
										<div>
											{hoveredFire.acq_date}{' '}
											{hoveredFire.acq_time}
										</div>
									</div>
								</div>
							</div>
						)
					})()}
			</AnimatePresence>
		</div>
	)
}
