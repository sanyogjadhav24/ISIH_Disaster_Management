'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
	createGeoJsonUrl,
	createIncidentsGlowLayer,
	createIncidentsLayer,
	createManualReportsLayer,
	createNasaFiresLayer,
} from './map/arcgisLayerFactories'
import { registerImpactClick } from './map/registerImpactClick'

// ArcGIS imports - using dynamic imports to avoid SSR issues
let Map: any,
	MapView: any,
	GeoJSONLayer: any,
	SimpleMarkerSymbol: any,
	SimpleRenderer: any,
	Graphic: any,
	Point: any,
	PopupTemplate: any,
	UniqueValueRenderer: any,
	ClassBreaksRenderer: any,
	SimpleFillSymbol: any,
	GraphicsLayer: any,
	Circle: any,
	TextSymbol: any
let esriConfig: any
let Basemap: any

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
	status?: string | null
}

interface WeatherPoint {
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

interface FireMapInnerProps {
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
}

const FireMapInner: React.FC<FireMapInnerProps> = ({
	fires,
	manualReports = [],
	incidents = [],
	weatherPoints = [],
	dataSource = 'nasa',
	showFires = true,
	showIncidents = true,
	showWeather = true,
	enableFirePopup = true,
	showPopulation = false,
	enablePopulationPopup = false,
	populationOpacity = 0.6,
}) => {
	// Store pending revocations to allow cleanup
	const pendingRevocations = useRef<Set<number>>(new Set())

	const queueRevokeUrl = (url: string) => {
		// Increased delay from 15s to 60s to allow ArcGIS layers to fully load
		const timeoutId = window.setTimeout(() => {
			try {
				URL.revokeObjectURL(url)
				pendingRevocations.current.delete(timeoutId)
			} catch {
				// ignore
			}
		}, 60000)
		pendingRevocations.current.add(timeoutId)
	}

	// Cleanup all pending revocations on unmount
	useEffect(() => {
		return () => {
			pendingRevocations.current.forEach((id) => clearTimeout(id))
			pendingRevocations.current.clear()
		}
	}, [])

	const mapDiv = useRef<HTMLDivElement>(null)
	const view = useRef<any>(null)
	const mapRef = useRef<any>(null)
	const fireLayerRef = useRef<any>(null)
	const manualLayerRef = useRef<any>(null)
	const incidentLayerRef = useRef<any>(null)
	const incidentGlowLayerRef = useRef<any>(null)
	const sensorNetworkLayerRef = useRef<any>(null)
	const populationLayerRef = useRef<any>(null)
	const impactLayerRef = useRef<any>(null)
	const weatherLayerRef = useRef<any>(null)
	const clickHandlesRef = useRef<any[]>([])
	const initializedRef = useRef(false)
	const [arcgisReady, setArcgisReady] = useState(false)
	const firesUrlRef = useRef<string | null>(null)
	const manualUrlRef = useRef<string | null>(null)
	const incidentsUrlRef = useRef<string | null>(null)
	const incidentsGlowUrlRef = useRef<string | null>(null)
	const populationUrlRef = useRef<string | null>(null)
	const weatherUrlRef = useRef<string | null>(null)
	// Debounce layer updates to prevent rapid changes
	const layerUpdateTimeoutRef = useRef<number | null>(null)

	// Helper function to safely add layers with error handling
	const addLayerWithErrorHandling = useCallback(
		(map: any, layer: any, layerName: string) => {
			if (!layer || !map) return false

			try {
				map.add(layer)

				// Add promise-based error handling for layer loading
				layer.when(
					() => {
						// Layer loaded successfully - can add custom logic here
					},
					(error: any) => {
						console.warn(`Failed to load ${layerName}:`, error)
						// Layer failed to load but won't crash the app
					},
				)
				return true
			} catch (error) {
				console.error(`Failed to add ${layerName} to map:`, error)
				return false
			}
		},
		[],
	)

	const isIncidentActive = useCallback((r: IncidentReading) => {
		const status =
			typeof r?.status_text === 'string'
				? r.status_text.trim().toUpperCase()
				: typeof r?.status === 'string'
					? r.status.trim().toUpperCase()
					: ''
		if (status === 'IDEAL' || status === 'IDLE') return false

		if (r?.active === true) return true
		if (typeof (r as any)?.active === 'string') {
			const v = String((r as any).active)
				.trim()
				.toUpperCase()
			if (v === 'ACTIVE' || v === 'TRUE' || v === '1' || v === 'YES')
				return true
		}
		if (status) return status === 'ACTIVE'
		return false
	}, [])

	const nasaKey = useMemo(() => {
		const len = fires.length
		if (len === 0) return '0'
		const first = fires[0]
		const last = fires[len - 1]
		const firstKey = `${first.latitude},${first.longitude},${
			first.acq_date ?? ''
		}${first.acq_time ?? ''}`
		const lastKey = `${last.latitude},${last.longitude},${
			last.acq_date ?? ''
		}${last.acq_time ?? ''}`
		return `${len}:${firstKey}:${lastKey}`
	}, [fires])

	const manualKey = useMemo(() => {
		const len = manualReports.length
		if (len === 0) return '0'
		const first = manualReports[0]
		const last = manualReports[len - 1]
		const firstId =
			first._id ??
			first.uid ??
			`${first.lat},${first.lng},${
				first.createdAt ?? first.deviceTime ?? ''
			}`
		const lastId =
			last._id ??
			last.uid ??
			`${last.lat},${last.lng},${last.createdAt ?? last.deviceTime ?? ''}`
		return `${len}:${firstId}:${lastId}`
	}, [manualReports])

	const incidentsKey = useMemo(() => {
		const len = incidents.length
		if (len === 0) return '0'

		// Hash over the whole list so any sensor value/status change refreshes the layer.
		let hash = 5381
		const push = (s: string) => {
			for (let i = 0; i < s.length; i++) {
				hash = ((hash << 5) + hash) ^ s.charCodeAt(i)
			}
		}
		for (const r of incidents) {
			push(String(r.sensor_id ?? ''))
			push(String(r.server_time ?? ''))
			push(String(r.smoke ?? ''))
			push(String(r.co ?? ''))
			push(String(r.ch4 ?? ''))
			push(String(r.temp ?? ''))
			push(String(r.hum ?? ''))
			push(String(r.active ?? ''))
			push(String(r.status_text ?? ''))
			push(String(r.status ?? ''))
		}
		return `${len}:${hash >>> 0}`
	}, [incidents])

	const weatherKey = useMemo(() => {
		const len = weatherPoints.length
		if (len === 0) return '0'
		let hash = 5381
		for (const p of weatherPoints) {
			const s = `${p.lat},${p.lng},${p.windSpeed},${p.riskLevel}`
			for (let i = 0; i < s.length; i++) {
				hash = ((hash << 5) + hash) ^ s.charCodeAt(i)
			}
		}
		return `${len}:${hash >>> 0}`
	}, [weatherPoints])

	const buildNasaFeatureCollection = useCallback(
		(firesInput: FireLocation[]) => ({
			type: 'FeatureCollection',
			features: firesInput.map((fire, index) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [fire.longitude, fire.latitude],
				},
				properties: {
					OBJECTID: index + 1,
					brightness: fire.brightness,
					confidence: String(fire.confidence),
					satellite: String(fire.satellite),
					acq_date: String(fire.acq_date),
					acq_time: String(fire.acq_time),
					frp: fire.frp || 0,
					scan: fire.scan,
					track: fire.track,
					daynight: String(fire.daynight),
					bright_t31: fire.bright_t31,
				},
			})),
		}),
		[],
	)

	const buildIncidentsFeatureCollection = useCallback(
		(items: IncidentReading[]) => ({
			type: 'FeatureCollection',
			features: items
				.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
				.map((r, index) => ({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [r.lng as number, r.lat as number],
					},
					properties: {
						OBJECTID: index + 1,
						sensor_id: String(r.sensor_id ?? 'N/A'),
						smoke: r.smoke ?? 0,
						co: r.co ?? 0,
						ch4: r.ch4 ?? 0,
						temp: r.temp ?? 0,
						hum: r.hum ?? 0,
						server_time: String(r.server_time ?? 'N/A'),
						active: isIncidentActive(r),
						marker_kind: isIncidentActive(r)
							? 'active'
							: 'inactive',
					},
				})),
		}),
		[isIncidentActive],
	)

	const buildWeatherFeatureCollection = useCallback(
		(points: WeatherPoint[]) => ({
			type: 'FeatureCollection',
			features: points.map((p, index) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [p.lng, p.lat],
				},
				properties: {
					OBJECTID: index + 1,
					locationName: p.locationName,
					windSpeed: p.windSpeed,
					windGust: p.windGust,
					windDirection: p.windDirection,
					temperature: p.temperature,
					humidity: p.humidity,
					pressure: p.pressure,
					precipitation: p.precipitation,
					riskLevel: p.riskLevel,
					alerts: p.alerts.join('; '),
					timestamp: p.timestamp,
				},
			})),
		}),
		[],
	)

	const buildManualFeatureCollection = useCallback(
		(reportsInput: ManualReportLocation[]) => ({
			type: 'FeatureCollection',
			features: (() => {
				// Cluster manual reports that are close in space and time into a single feature.
				const spatialRadiusKm = 3 // reports within 3 km
				const timeWindowMs = 3 * 60 * 60 * 1000 // 3 hours

				const toMs = (s?: string) => {
					if (!s) return NaN
					const d = new Date(s)
					return isNaN(d.getTime()) ? NaN : d.getTime()
				}

				const haversineKm = (
					lat1: number,
					lon1: number,
					lat2: number,
					lon2: number,
				) => {
					const R = 6371 // km
					const dLat = (lat2 - lat1) * (Math.PI / 180)
					const dLon = (lon2 - lon1) * (Math.PI / 180)
					const a =
						Math.sin(dLat / 2) * Math.sin(dLat / 2) +
						Math.cos(lat1 * (Math.PI / 180)) *
							Math.cos(lat2 * (Math.PI / 180)) *
							Math.sin(dLon / 2) *
							Math.sin(dLon / 2)
					const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
					return R * c
				}

				const used = new Array(reportsInput.length).fill(false)
				const groups: Array<ManualReportLocation[]> = []

				for (let i = 0; i < reportsInput.length; i++) {
					if (used[i]) continue
					const base = reportsInput[i]
					used[i] = true
					const group: ManualReportLocation[] = [base]
					const baseTime = toMs(base.createdAt ?? base.deviceTime)

					// expand group by checking remaining reports
					for (let j = i + 1; j < reportsInput.length; j++) {
						if (used[j]) continue
						const cand = reportsInput[j]
						const candTime = toMs(cand.createdAt ?? cand.deviceTime)
						const timeOk =
							!isNaN(baseTime) && !isNaN(candTime)
								? Math.abs(candTime - baseTime) <= timeWindowMs
								: true // if time not available, allow spatial match only

						const distKm = haversineKm(
							base.lat,
							base.lng,
							cand.lat,
							cand.lng,
						)
						const spatialOk = distKm <= spatialRadiusKm

						if (spatialOk && timeOk) {
							used[j] = true
							group.push(cand)
						}
					}

					groups.push(group)
				}

				// convert groups into GeoJSON features
				const features = groups
					.map((g, idx) => {
						// centroid
						const lat = g.reduce((s, r) => s + r.lat, 0) / g.length
						const lng = g.reduce((s, r) => s + r.lng, 0) / g.length

						// Validate coordinates
						if (
							!isFinite(lat) ||
							!isFinite(lng) ||
							lat < -90 ||
							lat > 90 ||
							lng < -180 ||
							lng > 180
						) {
							console.warn(
								'Invalid coordinates for report group:',
								{ lat, lng, group: g },
							)
							return null
						}

						const times = g
							.map((r) => r.createdAt ?? r.deviceTime)
							.filter(Boolean)
							.map((t) => new Date(t as string).toISOString())

						const earliest = times.length ? times.sort()[0] : 'N/A'
						const latest = times.length
							? times.sort()[times.length - 1]
							: 'N/A'

						const title =
							g.length === 1
								? (g[0].title ?? 'Report')
								: `${g.length} reports`
						const description =
							g.length === 1
								? (g[0].description ?? '')
								: g
										.map(
											(r) =>
												`• ${r.title ?? ''} ${
													r.description ?? ''
												}`,
										)
										.join('<br/>')

						return {
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [lng, lat],
							},
							properties: {
								OBJECTID: idx + 1, // ArcGIS expects OBJECTID starting from 1
								report_count: g.length,
								ids: String(
									g.map((r) => r._id ?? 'unknown').join(', '),
								),
								titles: String(
									g
										.map((r) => r.title ?? '')
										.filter(Boolean)
										.join(', ') || 'N/A',
								),
								severity: String(
									g
										.map((r) => r.severity)
										.filter(Boolean)
										.join(', ') || 'N/A',
								),
								deviceNames: String(
									g
										.map((r) => r.deviceName)
										.filter(Boolean)
										.join(', ') || 'N/A',
								),
								status: String(
									g
										.map((r) => r.status)
										.filter(Boolean)
										.join(', ') || 'N/A',
								),
								createdAt: String(earliest),
								latestAt: String(latest),
								title: String(title),
								description: String(description),
							},
						}
					})
					.filter(Boolean) // Remove null entries

				return features
			})(),
		}),
		[],
	)

	// Init map ONCE (preserve view across toggles)
	useEffect(() => {
		if (initializedRef.current) return

		const initializeMapOnce = async () => {
			initializedRef.current = true

			const [
				mapModule,
				mapViewModule,
				geoJSONLayerModule,
				simpleMarkerSymbolModule,
				simpleRendererModule,
				graphicModule,
				pointModule,
				popupTemplateModule,
				uniqueValueRendererModule,
				classBreaksRendererModule,
				simpleFillSymbolModule,
				graphicsLayerModule,
				circleModule,
				textSymbolModule,
				esriConfigModule,
				basemapModule,
			] = await Promise.all([
				import('@arcgis/core/Map'),
				import('@arcgis/core/views/MapView'),
				import('@arcgis/core/layers/GeoJSONLayer'),
				import('@arcgis/core/symbols/SimpleMarkerSymbol'),
				import('@arcgis/core/renderers/SimpleRenderer'),
				import('@arcgis/core/Graphic'),
				import('@arcgis/core/geometry/Point'),
				import('@arcgis/core/PopupTemplate'),
				import('@arcgis/core/renderers/UniqueValueRenderer'),
				import('@arcgis/core/renderers/ClassBreaksRenderer'),
				import('@arcgis/core/symbols/SimpleFillSymbol'),
				import('@arcgis/core/layers/GraphicsLayer'),
				import('@arcgis/core/geometry/Circle'),
				import('@arcgis/core/symbols/TextSymbol'),
				import('@arcgis/core/config'),
				import('@arcgis/core/Basemap'),
			])

			// Assign modules to variables
			Map = mapModule.default
			MapView = mapViewModule.default
			GeoJSONLayer = geoJSONLayerModule.default
			SimpleMarkerSymbol = simpleMarkerSymbolModule.default
			SimpleRenderer = simpleRendererModule.default
			Graphic = graphicModule.default
			Point = pointModule.default
			PopupTemplate = popupTemplateModule.default
			UniqueValueRenderer = uniqueValueRendererModule.default
			ClassBreaksRenderer = classBreaksRendererModule.default
			SimpleFillSymbol = simpleFillSymbolModule.default
			GraphicsLayer = graphicsLayerModule.default
			Circle = circleModule.default
			TextSymbol = textSymbolModule.default
			esriConfig = esriConfigModule.default
			Basemap = basemapModule.default

			// Configure ArcGIS services access (basemaps can require an API key)
			try {
				// NOTE: NEXT_PUBLIC_* is required for client-side access.
				// Some env files may accidentally contain a typo; we accept it to keep the app working.
				const clientKey =
					process.env.NEXT_PUBLIC_ARCGIS_API_KEY ||
					(process.env as any).NEXT_PIUBLIC_ARCGIS_API_KEY
				if (clientKey) {
					esriConfig.apiKey = clientKey
				} else {
					console.warn(
						'NEXT_PUBLIC_ARCGIS_API_KEY is not set; ArcGIS basemaps may fail to load. Add it to .env.local and restart dev server.',
					)
				}
				esriConfig.portalUrl = 'https://www.arcgis.com'
			} catch {
				// ignore
			}

			if (mapDiv.current) {
				// Create map
				// Start with a basemap that does not require ArcGIS auth, then upgrade to satellite only if it loads.
				const map = new Map({ basemap: 'osm' })
				mapRef.current = map

				// Try to load satellite basemap only after it successfully loads (prevents noisy console errors).
				try {
					const clientKey =
						process.env.NEXT_PUBLIC_ARCGIS_API_KEY ||
						(process.env as any).NEXT_PIUBLIC_ARCGIS_API_KEY

					if (clientKey) {
						const satelliteBasemap = Basemap.fromId('satellite')
						satelliteBasemap
							.load()
							.then(() => {
								map.basemap = satelliteBasemap
							})
							.catch((e: any) => {
								console.warn(
									"ArcGIS satellite basemap failed to load. Staying on 'osm'. Common causes: invalid API key, blocked *.arcgisonline.com, or no internet.",
									e,
								)
							})
					}
				} catch {
					// ignore
				}

				// Impact layer (used for 3km buffer graphic)
				const impactLayer = new GraphicsLayer({
					title: 'Fire Impact (3km)',
				})
				map.add(impactLayer)
				impactLayerRef.current = impactLayer

				// Create view (will auto-zoom to fires when available)
				view.current = new MapView({
					container: mapDiv.current,
					map: map,
					center: [78.9629, 20.5937], // Center of India
					zoom: 5, // Show India and surrounding regions
					constraints: {
						minZoom: 2,
						maxZoom: 18,
					},
				})
				await view.current.when()
				setArcgisReady(true)
			}
		}

		// (createFireLayer is hoisted to component scope)

		const createPopulationLayer = async () => {
			try {
				// Fetch population district data from our API
				const response = await fetch(
					'/api/population/districts?simplify=true',
				)
				const data = await response.json()

				if (!data.success || !data.data) {
					console.error('Failed to load population data:', data.error)
					return
				}

				// Create popup template for population districts
				const popupTemplate = new PopupTemplate({
					title: '🏘️ {properties.district_name}',
					content: `
            <div style="font-size: 14px;">
              <p><strong>State:</strong> {properties.state_name}</p>
              <p><strong>Population:</strong> {properties.population:NumberFormat}</p>
              <p><strong>District Code:</strong> {properties.district_code}</p>
            </div>
          `,
				})

				// Create choropleth renderer based on population
				const renderer = new ClassBreaksRenderer({
					field: 'properties.population',
					defaultSymbol: new SimpleFillSymbol({
						color: [200, 200, 200, 0.3],
						outline: {
							color: 'white',
							width: 0.5,
						},
					}),
					classBreakInfos: [
						{
							minValue: 0,
							maxValue: 100000,
							symbol: new SimpleFillSymbol({
								color: [255, 245, 157, populationOpacity], // Light yellow - low population
								outline: { color: 'white', width: 0.5 },
							}),
							label: '< 100K',
						},
						{
							minValue: 100000,
							maxValue: 500000,
							symbol: new SimpleFillSymbol({
								color: [254, 217, 118, populationOpacity], // Orange - medium population
								outline: { color: 'white', width: 0.5 },
							}),
							label: '100K - 500K',
						},
						{
							minValue: 500000,
							maxValue: 1000000,
							symbol: new SimpleFillSymbol({
								color: [254, 178, 76, populationOpacity], // Dark orange - high population
								outline: { color: 'white', width: 0.5 },
							}),
							label: '500K - 1M',
						},
						{
							minValue: 1000000,
							maxValue: 5000000,
							symbol: new SimpleFillSymbol({
								color: [253, 141, 60, populationOpacity], // Red-orange - very high population
								outline: { color: 'white', width: 0.5 },
							}),
							label: '1M - 5M',
						},
						{
							minValue: 5000000,
							maxValue: Infinity,
							symbol: new SimpleFillSymbol({
								color: [227, 74, 51, populationOpacity], // Deep red - extremely high population
								outline: { color: 'white', width: 0.5 },
							}),
							label: '> 5M',
						},
					],
				})

				// Convert to blob URL for the GeoJSON layer
				const blob = new Blob([JSON.stringify(data.data)], {
					type: 'application/json',
				})
				const url = URL.createObjectURL(blob)

				// Create population GeoJSON layer
				const populationLayer = new GeoJSONLayer({
					url: url,
					renderer: renderer,
					popupEnabled: enablePopulationPopup,
					popupTemplate: popupTemplate,
					opacity: populationOpacity,
					title: 'Population Districts',
				})

				// Keep URL so we can revoke it on cleanup/removal
				populationUrlRef.current = url

				console.log(
					`✅ Added population layer with ${data.count} districts`,
				)

				return populationLayer
			} catch (error) {
				console.error('Error creating population layer:', error)
			}

			return null
		}

		initializeMapOnce().catch((e) => {
			console.error(e)
			initializedRef.current = false
			setArcgisReady(false)
		})

		// Cleanup function
		return () => {
			if (view.current) {
				if (
					Array.isArray(clickHandlesRef.current) &&
					clickHandlesRef.current.length
				) {
					for (const h of clickHandlesRef.current) {
						try {
							if (h && typeof h.remove === 'function') h.remove()
						} catch {
							// ignore
						}
					}
					clickHandlesRef.current = []
				}
				view.current.destroy()
				view.current = null
			}

			if (firesUrlRef.current) {
				queueRevokeUrl(firesUrlRef.current)
				firesUrlRef.current = null
			}
			if (manualUrlRef.current) {
				queueRevokeUrl(manualUrlRef.current)
				manualUrlRef.current = null
			}
			if (incidentsUrlRef.current) {
				queueRevokeUrl(incidentsUrlRef.current)
				incidentsUrlRef.current = null
			}
			if (populationUrlRef.current) {
				queueRevokeUrl(populationUrlRef.current)
				populationUrlRef.current = null
			}
		}
	}, [])

	// Update fire layer without resetting view
	useEffect(() => {
		const v = view.current
		const map = mapRef.current
		if (!arcgisReady || !v || !map) return

		// Keep camera position; just clear impact overlay when swapping layers
		try {
			impactLayerRef.current?.removeAll()
			v.popup?.close()
		} catch {
			// ignore
		}

		const removeLayerAndUrl = (
			layerRef: React.MutableRefObject<any>,
			urlRef: React.MutableRefObject<string | null>,
		) => {
			if (layerRef.current) {
				try {
					map.remove(layerRef.current)
				} catch {}
				layerRef.current = null
			}
			if (urlRef.current) {
				queueRevokeUrl(urlRef.current)
				urlRef.current = null
			}
		}

		// Clear mode -> remove both point layers
		if (!showFires) {
			removeLayerAndUrl(fireLayerRef, firesUrlRef)
			removeLayerAndUrl(manualLayerRef, manualUrlRef)
			return
		}

		const arcMods = {
			GeoJSONLayer,
			PopupTemplate,
			ClassBreaksRenderer,
			SimpleRenderer,
			SimpleMarkerSymbol,
		}

		const wantsNasa = dataSource === 'nasa' || dataSource === 'all'
		const wantsManual = dataSource === 'manual' || dataSource === 'all'

		if (!wantsNasa) {
			removeLayerAndUrl(fireLayerRef, firesUrlRef)
		} else if (fires.length === 0) {
			removeLayerAndUrl(fireLayerRef, firesUrlRef)
		} else {
			const nextUrl = createGeoJsonUrl(buildNasaFeatureCollection(fires))
			const prevUrl = firesUrlRef.current
			firesUrlRef.current = nextUrl

			if (fireLayerRef.current) {
				try {
					map.remove(fireLayerRef.current)
				} catch {}
				fireLayerRef.current = null
			}

			const layer = createNasaFiresLayer(arcMods as any, nextUrl)
			if (layer) {
				fireLayerRef.current = layer
				map.add(layer)

				// Add error handling for layer loading
				layer.when(
					() => {
						// Layer loaded successfully
					},
					(error: any) => {
						console.warn('Failed to load fire layer:', error)
					},
				)
			}

			if (prevUrl) {
				queueRevokeUrl(prevUrl)
			}
		}

		if (!wantsManual) {
			removeLayerAndUrl(manualLayerRef, manualUrlRef)
		} else if (manualReports.length === 0) {
			console.log('No manual reports to display')
			removeLayerAndUrl(manualLayerRef, manualUrlRef)
		} else {
			console.log(
				`Creating manual reports layer with ${manualReports.length} reports`,
			)
			const nextUrl = createGeoJsonUrl(
				buildManualFeatureCollection(manualReports),
			)
			const prevUrl = manualUrlRef.current
			manualUrlRef.current = nextUrl

			if (manualLayerRef.current) {
				try {
					map.remove(manualLayerRef.current)
				} catch {}
				manualLayerRef.current = null
			}

			const layer = createManualReportsLayer(arcMods as any, nextUrl)
			if (layer) {
				manualLayerRef.current = layer
				map.add(layer)
				console.log('Manual reports layer added to map')

				// Add error handling for layer loading
				layer.when(
					() => {
						console.log('Manual reports layer loaded successfully')
					},
					(error: any) => {
						console.warn(
							'Failed to load manual reports layer:',
							error,
						)
					},
				)
			}

			if (prevUrl) {
				queueRevokeUrl(prevUrl)
			}
		}
	}, [arcgisReady, showFires, dataSource, nasaKey, manualKey])

	// Update incidents (sensor readings) layer
	useEffect(() => {
		const map = mapRef.current
		if (!arcgisReady || !map) return

		const removeLayerAndUrl = (
			layerRef: React.MutableRefObject<any>,
			urlRef: React.MutableRefObject<string | null>,
		) => {
			if (layerRef.current) {
				try {
					map.remove(layerRef.current)
				} catch {}
				layerRef.current = null
			}
			if (urlRef.current) {
				queueRevokeUrl(urlRef.current)
				urlRef.current = null
			}
		}

		const removeNetworkLayer = () => {
			if (sensorNetworkLayerRef.current) {
				try {
					map.remove(sensorNetworkLayerRef.current)
				} catch {}
				sensorNetworkLayerRef.current = null
			}
		}

		if (!showIncidents || incidents.length === 0) {
			removeLayerAndUrl(incidentLayerRef, incidentsUrlRef)
			removeLayerAndUrl(incidentGlowLayerRef, incidentsGlowUrlRef)
			removeNetworkLayer()
			return
		}

		if (
			!GeoJSONLayer ||
			!PopupTemplate ||
			!SimpleRenderer ||
			!SimpleMarkerSymbol
		) {
			return
		}
		if (!GraphicsLayer || !Graphic || !Point) return

		// 1) Build and update sensor network layer (5 extra sensors around each real sensor)
		const ensureNetworkLayer = () => {
			if (!sensorNetworkLayerRef.current) {
				const layer = new GraphicsLayer({ title: 'Sensor Network' })
				sensorNetworkLayerRef.current = layer
				map.add(layer)
			}
			return sensorNetworkLayerRef.current
		}

		const metersToLatDegrees = (meters: number) => meters / 111320
		const metersToLngDegrees = (meters: number, latDegrees: number) => {
			const latRad = (latDegrees * Math.PI) / 180
			const denom = 111320 * Math.cos(latRad)
			if (!Number.isFinite(denom) || denom === 0) return 0
			return meters / denom
		}

		const buildNetworkRingBySpacing = (
			lat: number,
			lng: number,
			spacingMeters: number,
			count: number,
		) => {
			// Place points evenly around a circle such that arc-length between neighbors
			// is approximately `spacingMeters`.
			const radiusMeters = (count * spacingMeters) / (2 * Math.PI)
			const points: Array<{ lat: number; lng: number }> = []
			for (let i = 0; i < count; i++) {
				const angle = (i / count) * Math.PI * 2
				const dx = Math.cos(angle) * radiusMeters // meters east
				const dy = Math.sin(angle) * radiusMeters // meters north
				const dLat = metersToLatDegrees(dy)
				const dLng = metersToLngDegrees(dx, lat)
				points.push({ lat: lat + dLat, lng: lng + dLng })
			}
			return points
		}

		const networkLayer = ensureNetworkLayer()
		try {
			networkLayer.removeAll()
		} catch {
			// ignore
		}

		const networkSymbol = new SimpleMarkerSymbol({
			color: [255, 255, 255, 0.7],
			size: '8px',
			outline: { color: [0, 0, 0, 0.45], width: 1 },
		})

		const networkGraphics: any[] = []
		const networkSources = incidents.filter(isIncidentActive)
		for (const r of networkSources) {
			if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue
			const lat = r.lat as number
			const lng = r.lng as number
			// 20 virtual sensors with ~10km spacing between neighbors.
			const pts = buildNetworkRingBySpacing(lat, lng, 10_000, 20)
			for (const p of pts) {
				networkGraphics.push(
					new Graphic({
						geometry: new Point({
							latitude: p.lat,
							longitude: p.lng,
						}),
						symbol: networkSymbol,
						attributes: {
							sensor_id: r.sensor_id,
							is_virtual: true,
						},
					}),
				)
			}
		}
		try {
			networkLayer.addMany(networkGraphics)
		} catch {
			// ignore
		}

		// 2) Glow layer for ACTIVE sensors only (behind main sensor markers)
		const arcModsGlow = {
			GeoJSONLayer,
			PopupTemplate,
			SimpleRenderer,
			SimpleMarkerSymbol,
		}
		const activeOnly = incidents.filter(isIncidentActive)
		const nextGlowUrl = createGeoJsonUrl(
			buildIncidentsFeatureCollection(activeOnly),
		)
		const prevGlowUrl = incidentsGlowUrlRef.current
		incidentsGlowUrlRef.current = nextGlowUrl

		if (incidentGlowLayerRef.current) {
			try {
				map.remove(incidentGlowLayerRef.current)
			} catch {}
			incidentGlowLayerRef.current = null
		}
		const glowLayer = createIncidentsGlowLayer(
			arcModsGlow as any,
			nextGlowUrl,
		)
		if (glowLayer) {
			incidentGlowLayerRef.current = glowLayer
			map.add(glowLayer)

			// Add error handling for layer loading
			glowLayer.when(
				() => {
					// Layer loaded successfully
				},
				(error: any) => {
					console.warn('Failed to load incidents glow layer:', error)
				},
			)
		}
		if (prevGlowUrl) {
			queueRevokeUrl(prevGlowUrl)
		}

		// 3) Main incidents layer (ACTIVE colored, INACTIVE white)
		const arcModsMain = {
			GeoJSONLayer,
			PopupTemplate,
			SimpleRenderer,
			UniqueValueRenderer,
			SimpleMarkerSymbol,
		}
		const nextUrl = createGeoJsonUrl(
			buildIncidentsFeatureCollection(incidents),
		)
		const prevUrl = incidentsUrlRef.current
		incidentsUrlRef.current = nextUrl

		if (incidentLayerRef.current) {
			try {
				map.remove(incidentLayerRef.current)
			} catch {}
			incidentLayerRef.current = null
		}
		const layer = createIncidentsLayer(arcModsMain as any, nextUrl)
		if (layer) {
			incidentLayerRef.current = layer
			map.add(layer)

			// Add error handling for layer loading
			layer.when(
				() => {
					// Layer loaded successfully
				},
				(error: any) => {
					console.warn('Failed to load incidents layer:', error)
				},
			)
		}
		if (prevUrl) {
			queueRevokeUrl(prevUrl)
		}
	}, [arcgisReady, showIncidents, incidentsKey])

	// Update weather layer
	useEffect(() => {
		const map = mapRef.current
		if (!arcgisReady || !map) return

		const removeWeatherLayer = () => {
			if (weatherLayerRef.current) {
				try {
					map.remove(weatherLayerRef.current)
				} catch {}
				weatherLayerRef.current = null
			}
			if (weatherUrlRef.current) {
				queueRevokeUrl(weatherUrlRef.current)
				weatherUrlRef.current = null
			}
		}

		if (!showWeather || weatherPoints.length === 0) {
			removeWeatherLayer()
			return
		}

		if (
			!GeoJSONLayer ||
			!PopupTemplate ||
			!SimpleMarkerSymbol ||
			!UniqueValueRenderer
		) {
			return
		}

		const nextUrl = createGeoJsonUrl(
			buildWeatherFeatureCollection(weatherPoints),
		)
		const prevUrl = weatherUrlRef.current
		weatherUrlRef.current = nextUrl

		if (weatherLayerRef.current) {
			try {
				map.remove(weatherLayerRef.current)
			} catch {}
			weatherLayerRef.current = null
		}

		// Create weather layer with risk-based coloring
		const layer = new GeoJSONLayer({
			url: nextUrl,
			title: 'Weather Risk Points',
			outFields: ['*'],
			renderer: new UniqueValueRenderer({
				field: 'riskLevel',
				uniqueValueInfos: [
					{
						value: 'low',
						symbol: new SimpleMarkerSymbol({
							color: [34, 197, 94, 0.9], // green-500
							size: '18px',
							outline: { color: [255, 255, 255], width: 2 },
						}),
						label: 'Low Risk',
					},
					{
						value: 'moderate',
						symbol: new SimpleMarkerSymbol({
							color: [234, 179, 8, 0.9], // yellow-500
							size: '20px',
							outline: { color: [255, 255, 255], width: 2 },
						}),
						label: 'Moderate Risk',
					},
					{
						value: 'high',
						symbol: new SimpleMarkerSymbol({
							color: [249, 115, 22, 0.9], // orange-500
							size: '22px',
							outline: { color: [255, 255, 255], width: 2 },
						}),
						label: 'High Risk',
					},
					{
						value: 'extreme',
						symbol: new SimpleMarkerSymbol({
							color: [220, 38, 38, 0.9], // red-600
							size: '24px',
							outline: { color: [255, 255, 255], width: 3 },
						}),
						label: 'Extreme Risk',
					},
				],
				defaultSymbol: new SimpleMarkerSymbol({
					color: [156, 163, 175, 0.8], // gray-400
					size: '16px',
					outline: { color: [255, 255, 255], width: 1 },
				}),
			}),
			popupTemplate: new PopupTemplate({
				title: '🌬️ {locationName}',
				content: [
					{
						type: 'fields',
						fieldInfos: [
							{
								fieldName: 'riskLevel',
								label: 'Fire Risk Level',
							},
							{
								fieldName: 'windSpeed',
								label: 'Wind Speed (km/h)',
							},
							{
								fieldName: 'windGust',
								label: 'Wind Gust (km/h)',
							},
							{
								fieldName: 'windDirection',
								label: 'Wind Direction (°)',
							},
							{
								fieldName: 'temperature',
								label: 'Temperature (°C)',
							},
							{ fieldName: 'humidity', label: 'Humidity (%)' },
							{ fieldName: 'pressure', label: 'Pressure (hPa)' },
							{
								fieldName: 'precipitation',
								label: 'Precipitation (mm)',
							},
							{ fieldName: 'alerts', label: 'Active Alerts' },
						],
					},
				],
			}),
		})

		weatherLayerRef.current = layer
		map.add(layer)

		layer.when(
			() => {
				// Weather layer loaded successfully
			},
			(error: any) => {
				console.warn('Failed to load weather layer:', error)
			},
		)

		if (prevUrl) {
			queueRevokeUrl(prevUrl)
		}
	}, [
		arcgisReady,
		showWeather,
		weatherKey,
		weatherPoints,
		buildWeatherFeatureCollection,
	])

	// Update population layer and popup toggle without resetting view
	useEffect(() => {
		const map = mapRef.current
		if (!arcgisReady || !map) return

		const removePopulation = () => {
			if (populationLayerRef.current) {
				try {
					map.remove(populationLayerRef.current)
				} catch {}
				populationLayerRef.current = null
			}
			if (populationUrlRef.current) {
				queueRevokeUrl(populationUrlRef.current)
				populationUrlRef.current = null
			}
		}

		if (!showPopulation) {
			removePopulation()
			return
		}

		// If layer exists, just update popupEnabled + opacity (cheap)
		if (populationLayerRef.current) {
			try {
				populationLayerRef.current.popupEnabled = enablePopulationPopup
				populationLayerRef.current.opacity = populationOpacity
			} catch {
				// ignore
			}
			return
		}

		// Otherwise create it
		;(async () => {
			const layer = await (async () => {
				// createPopulationLayer is inside init effect scope; so if init hasn't completed yet, skip
				// (init runs once and imports ArcGIS modules)
				if (!GeoJSONLayer) return null
				try {
					// Reuse the same logic as the original helper
					const response = await fetch(
						'/api/population/districts?simplify=true',
					)
					const data = await response.json()
					if (!data.success || !data.data) return null

					const popupTemplate = new PopupTemplate({
						title: '🏘️ {properties.district_name}',
						content: `
              <div style="font-size: 14px;">
                <p><strong>State:</strong> {properties.state_name}</p>
                <p><strong>Population:</strong> {properties.population:NumberFormat}</p>
                <p><strong>District Code:</strong> {properties.district_code}</p>
              </div>
            `,
					})

					const renderer = new ClassBreaksRenderer({
						field: 'properties.population',
						defaultSymbol: new SimpleFillSymbol({
							color: [200, 200, 200, 0.3],
							outline: { color: 'white', width: 0.5 },
						}),
						classBreakInfos: [
							{
								minValue: 0,
								maxValue: 100000,
								symbol: new SimpleFillSymbol({
									color: [255, 245, 157, populationOpacity],
									outline: { color: 'white', width: 0.5 },
								}),
								label: '< 100K',
							},
							{
								minValue: 100000,
								maxValue: 500000,
								symbol: new SimpleFillSymbol({
									color: [254, 217, 118, populationOpacity],
									outline: { color: 'white', width: 0.5 },
								}),
								label: '100K - 500K',
							},
							{
								minValue: 500000,
								maxValue: 1000000,
								symbol: new SimpleFillSymbol({
									color: [254, 178, 76, populationOpacity],
									outline: { color: 'white', width: 0.5 },
								}),
								label: '500K - 1M',
							},
							{
								minValue: 1000000,
								maxValue: 5000000,
								symbol: new SimpleFillSymbol({
									color: [253, 141, 60, populationOpacity],
									outline: { color: 'white', width: 0.5 },
								}),
								label: '1M - 5M',
							},
							{
								minValue: 5000000,
								maxValue: Infinity,
								symbol: new SimpleFillSymbol({
									color: [227, 74, 51, populationOpacity],
									outline: { color: 'white', width: 0.5 },
								}),
								label: '> 5M',
							},
						],
					})

					const blob = new Blob([JSON.stringify(data.data)], {
						type: 'application/geo+json; charset=utf-8',
					})
					const url = URL.createObjectURL(blob)
					populationUrlRef.current = url

					const populationLayer = new GeoJSONLayer({
						url,
						renderer,
						popupEnabled: enablePopulationPopup,
						popupTemplate,
						opacity: populationOpacity,
						title: 'Population Districts',
					})

					return populationLayer
				} catch {
					return null
				}
			})()

			if (!layer) return
			if (!mapRef.current) return
			if (!showPopulation) {
				// toggled off while loading
				try {
					if (populationUrlRef.current)
						queueRevokeUrl(populationUrlRef.current)
				} catch {
					// ignore
				}
				populationUrlRef.current = null
				return
			}

			populationLayerRef.current = layer
			try {
				mapRef.current.add(layer, 0)

				// Add error handling for layer loading
				layer.when(
					() => {
						// Layer loaded successfully
					},
					(error: any) => {
						console.warn('Failed to load population layer:', error)
					},
				)
			} catch {
				// ignore
			}
		})()
	}, [arcgisReady, showPopulation, enablePopulationPopup, populationOpacity])

	// Enable/disable fire click popup without resetting view
	useEffect(() => {
		const v = view.current
		if (!arcgisReady || !v) return

		// Remove existing handler
		if (
			Array.isArray(clickHandlesRef.current) &&
			clickHandlesRef.current.length
		) {
			for (const h of clickHandlesRef.current) {
				try {
					if (h && typeof h.remove === 'function') h.remove()
				} catch {
					// ignore
				}
			}
			clickHandlesRef.current = []
		}

		// Clear impact graphics + close popup when disabled
		if (!enableFirePopup) {
			try {
				impactLayerRef.current?.removeAll()
				v.popup?.close()
			} catch {
				// ignore
			}
			return
		}

		if (!showFires) return

		const impactLayer = impactLayerRef.current
		if (!impactLayer) return

		const getPopupHtmlForSource =
			(source: 'nasa' | 'manual') =>
			({
				isCluster,
				attrs,
				radiusKm,
				affectedAreaKm2,
				popText,
				districtCount,
				sourceText,
			}: any) => {
				if (source === 'manual') {
					const manualInfo = !isCluster
						? `<p><strong>Title:</strong> ${attrs?.title ?? ''}</p>
               <p><strong>Severity:</strong> ${attrs?.severity ?? ''}</p>
               <p><strong>Status:</strong> ${attrs?.status ?? ''}</p>
               <p><strong>Device:</strong> ${attrs?.deviceName ?? ''}</p>`
						: `<p><strong>Cluster reports:</strong> ${
								attrs?.cluster_count ?? ''
							}</p>`

					return {
						title: isCluster
							? '📝 Report Cluster Impact (3km)'
							: '📝 Report Impact (3km)',
						content: `
              <div style="font-size: 14px;">
                ${manualInfo}
                <p><strong>Impact radius:</strong> ${radiusKm} km</p>
                <p><strong>Affected area (circle):</strong> ${affectedAreaKm2.toFixed(
					2,
				)} km²</p>
                <p><strong>Estimated people affected:</strong> ${popText}</p>
                ${
					districtCount === null
						? ''
						: `<p><strong>Intersecting districts:</strong> ${districtCount}</p>`
				}
                <p><strong>Population source:</strong> ${sourceText}</p>
              </div>
            `,
					}
				}

				const fireInfo = !isCluster
					? `<p><strong>Brightness:</strong> ${
							attrs?.brightness ?? ''
						}K</p>
             <p><strong>Confidence:</strong> ${attrs?.confidence ?? ''}</p>
             <p><strong>Date:</strong> ${attrs?.acq_date ?? ''} ${
					attrs?.acq_time ?? ''
				}</p>`
					: `<p><strong>Cluster fires:</strong> ${
							attrs?.cluster_count ?? ''
						}</p>`

				return {
					title: isCluster
						? '🔥 Fire Cluster Impact (3km)'
						: '🔥 Fire Impact (3km)',
					content: `
            <div style="font-size: 14px;">
              ${fireInfo}
              <p><strong>Impact radius:</strong> ${radiusKm} km</p>
              <p><strong>Affected area (circle):</strong> ${affectedAreaKm2.toFixed(
					2,
				)} km²</p>
              <p><strong>Estimated people affected:</strong> ${popText}</p>
              ${
					districtCount === null
						? ''
						: `<p><strong>Intersecting districts:</strong> ${districtCount}</p>`
				}
              <p><strong>Population source:</strong> ${sourceText}</p>
            </div>
          `,
				}
			}

		const wantsNasa = dataSource === 'nasa' || dataSource === 'all'
		const wantsManual = dataSource === 'manual' || dataSource === 'all'

		const handles: any[] = []
		if (wantsNasa && fireLayerRef.current) {
			const h = registerImpactClick({
				view: v,
				layer: fireLayerRef.current,
				impactLayer,
				mods: { Point, Circle, Graphic, SimpleFillSymbol, TextSymbol },
				getPopupHtml: getPopupHtmlForSource('nasa'),
			})
			if (h) handles.push(h)
		}
		if (wantsManual && manualLayerRef.current) {
			const h = registerImpactClick({
				view: v,
				layer: manualLayerRef.current,
				impactLayer,
				mods: { Point, Circle, Graphic, SimpleFillSymbol, TextSymbol },
				getPopupHtml: getPopupHtmlForSource('manual'),
			})
			if (h) handles.push(h)
		}

		clickHandlesRef.current = handles
	}, [
		arcgisReady,
		enableFirePopup,
		dataSource,
		showFires,
		nasaKey,
		manualKey,
	])

	return (
		<div
			ref={mapDiv}
			style={{ height: '100%', width: '100%' }}
			className="rounded-lg overflow-hidden"
		/>
	)
}

export default FireMapInner
