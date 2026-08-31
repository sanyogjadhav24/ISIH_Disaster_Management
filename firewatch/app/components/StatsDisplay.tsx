'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

const formatNumber = (num: number): string => {
	return num.toLocaleString('en-US')
}

type TopRegion = { region: string; fires: number; brightness: number }

export interface FireStats {
	totalActiveFires: number
	topAffectedRegions: TopRegion[]
	highConfidenceFires: number
	avgBrightness: number
	detectionsBySatellite: { MODIS: number; VIIRS: number }
	detectionsByDay: { today: number; yesterday: number; twoAgo: number }
	avgFRP: number
	avgConfidence: number
}

export const DEFAULT_STATS: FireStats = {
	totalActiveFires: 1234,
	topAffectedRegions: [
		{ region: 'Northern Region', fires: 120, brightness: 340 },
		{ region: 'Coastal Area', fires: 95, brightness: 310 },
		{ region: 'Highlands', fires: 60, brightness: 290 },
	],
	highConfidenceFires: 456,
	avgBrightness: 285,
	detectionsBySatellite: { MODIS: 420, VIIRS: 860 },
	detectionsByDay: { today: 230, yesterday: 180, twoAgo: 150 },
	avgFRP: 12.4,
	avgConfidence: 88,
}

function InfoIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="8"
				cy="8"
				r="7"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<path
				d="M8 7V11"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<circle cx="8" cy="5" r="0.75" fill="currentColor" />
		</svg>
	)
}

function PixelGridTransition({
	firstContent,
	secondContent,
	isActive,
	gridSize = 30,
	animationStepDuration = 0.3,
	className,
}: {
	firstContent: React.ReactNode
	secondContent: React.ReactNode
	isActive: boolean
	gridSize?: number
	animationStepDuration?: number
	className?: string
}) {
	const [showPixels, setShowPixels] = useState(false)
	const [animState, setAnimState] = useState<
		'idle' | 'growing' | 'shrinking'
	>('idle')
	const hasActivatedRef = useRef(false)

	const pixels = useMemo(() => {
		const total = gridSize * gridSize
		const result = []
		for (let n = 0; n < total; n++) {
			const row = Math.floor(n / gridSize)
			const col = n % gridSize
			const rnd = Math.abs(Math.sin(n * 12.9898 + gridSize * 78.233)) % 1
			const color =
				rnd > 0.85
					? 'var(--ds-red-600, #dc2626)'
					: 'var(--ds-gray-200, #333)'
			result.push({ id: n, row, col, color })
		}
		return result
	}, [gridSize])

	const [shuffledOrder, setShuffledOrder] = useState<number[]>([])

	useEffect(() => {
		if (!hasActivatedRef.current && !isActive) return
		if (isActive) hasActivatedRef.current = true

		const indices = pixels.map((_, i) => i)
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[indices[i], indices[j]] = [indices[j], indices[i]]
		}
		setTimeout(() => {
			setShuffledOrder(indices)
			setShowPixels(true)
			setAnimState('growing')
		}, 0)

		const shrinkTimer = setTimeout(
			() => setAnimState('shrinking'),
			animationStepDuration * 1000,
		)
		const hideTimer = setTimeout(() => {
			setShowPixels(false)
			setAnimState('idle')
		}, animationStepDuration * 2000)

		return () => {
			clearTimeout(shrinkTimer)
			clearTimeout(hideTimer)
		}
	}, [isActive, animationStepDuration, pixels])

	const delayPerPixel = useMemo(
		() => animationStepDuration / pixels.length,
		[animationStepDuration, pixels.length],
	)
	const orderMap = useMemo(() => {
		const map = new Map<number, number>()
		shuffledOrder.forEach((idx, order) => map.set(idx, order))
		return map
	}, [shuffledOrder])

	return (
		<div
			className={`w-full overflow-hidden max-w-full relative ${
				className || ''
			}`}
		>
			<div
				className="h-full"
				aria-hidden={isActive}
				style={{ display: isActive ? 'none' : 'block' }}
			>
				{firstContent}
			</div>

			<div
				className="absolute inset-0 w-full h-full z-[2] overflow-hidden"
				style={{
					pointerEvents: isActive ? 'auto' : 'none',
					display: isActive ? 'block' : 'none',
				}}
				aria-hidden={!isActive}
			>
				{secondContent}
			</div>

			<div
				className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
				style={{
					display: 'grid',
					gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
				}}
			>
				{showPixels &&
					pixels.map((pixel) => {
						const order = orderMap.get(pixel.id) ?? 0
						return (
							<div
								key={pixel.id}
								style={{
									backgroundColor: pixel.color,
									aspectRatio: '1 / 1',
									gridArea: `${pixel.row + 1} / ${
										pixel.col + 1
									}`,
									opacity: animState === 'growing' ? 1 : 0,
									transform:
										animState === 'growing'
											? 'scale(1)'
											: 'scale(0)',
									transition: `opacity 0.01s ease, transform 0.01s ease ${
										order * delayPerPixel
									}s`,
								}}
							/>
						)
					})}
			</div>
		</div>
	)
}

function StatCard({
	title,
	value,
	children,
	infoContent,
	href,
	className,
}: {
	title: string
	value?: number
	children?: React.ReactNode
	infoContent?: string
	href?: string
	className?: string
}) {
	const [showInfo, setShowInfo] = useState(false)

	const statsContent = (
		<div className="bg-gray-900 p-4 md:p-6 w-full min-h-[120px] h-full">
			<div className="space-y-2">
				<h2 className="my-0 font-mono font-medium text-sm tracking-tight uppercase text-gray-1000 pr-6">
					{title}
				</h2>
				{value !== undefined && (
					<div className="text-3xl md:text-4xl tracking-normal font-mono tabular-nums">
						{formatNumber(value)}
					</div>
				)}
				{children}
			</div>
		</div>
	)

	const infoContentView = (
		<div className="bg-gray-900 p-4 md:p-6 w-full h-full overflow-y-auto flex flex-col gap-y-2">
			{href ? (
				<a
					href={href}
					tabIndex={showInfo ? 0 : -1}
					className="my-0 font-mono font-medium text-sm tracking-tight uppercase text-gray-1000 hover:underline underline-offset-2 inline-flex gap-x-0.5 items-center w-fit shrink-0"
				>
					{title}
					<svg
						width="14"
						height="14"
						viewBox="0 0 16 16"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M6.75011 4H6.00011V5.5H6.75011H9.43945L5.46978 9.46967L4.93945 10L6.00011 11.0607L6.53044 10.5303L10.499 6.56182V9.25V10H11.999V9.25V5C11.999 4.44772 11.5512 4 10.999 4H6.75011Z"
						/>
					</svg>
				</a>
			) : (
				<span className="my-0 font-mono font-medium text-sm tracking-tight uppercase text-gray-1000 shrink-0">
					{title}
				</span>
			)}
			<span className="tracking-tight text-sm text-gray-100 leading-relaxed line-clamp-6">
				{infoContent}
			</span>
		</div>
	)

	return (
		<div
			className={`relative group rounded-md overflow-hidden ${
				className || ''
			}`}
		>
			<PixelGridTransition
				firstContent={statsContent}
				secondContent={infoContentView}
				isActive={showInfo}
				gridSize={30}
				animationStepDuration={0.3}
				className="h-full"
			/>
			{infoContent && (
				<div
					className={`absolute top-2 right-2 transition-opacity duration-150 z-[20] isolate ${
						showInfo
							? 'opacity-100'
							: 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
					}`}
				>
					<button
						aria-label={`Learn more about ${title}`}
						type="button"
						onClick={() => setShowInfo(!showInfo)}
						className="p-1 m-0 bg-transparent text-gray-alpha-600 md:text-gray-100 border-none md:border md:border-solid border-gray-alpha-400 hover:text-gray-1000 hover:bg-gray-alpha-200 transition-colors duration-150 flex items-center justify-center outline-none focus-visible:ring cursor-pointer"
					>
						<InfoIcon />
					</button>
				</div>
			)}
		</div>
	)
}

function MetricRow({ label, value }: { label: string; value: number }) {
	return (
		<li className="flex flex-wrap items-center justify-between gap-x-3">
			<h3 className="m-0 font-mono font-normal text-sm text-gray-100 uppercase">
				{label}
			</h3>
			<div className="flex items-center gap-3 md:gap-4 text-right">
				<div className="text-gray-1000 text-sm font-mono tabular-nums">
					{formatNumber(value)}
				</div>
			</div>
		</li>
	)
}

export function TotalActiveFires({ stats }: { stats: FireStats }) {
	return (
		<div className="space-y-2 mt-6">
			<h2 className="my-0  font-mono font-medium text-sm tracking-tight uppercase text-gray-100">
				Total Active Disasters
			</h2>
			<div className="text-4xl md:text-5xl tracking-normal font-mono tabular-nums">
				{formatNumber(stats.totalActiveFires)}
			</div>
			<div className="text-sm text-gray-100 font-mono tabular-nums">
				Updated now
			</div>
		</div>
	)
}

function FireRegionRow({
	region,
	fires,
	brightness,
}: {
	region: string
	fires: number
	brightness: number
}) {
	return (
		<li className="flex items-center w-full md:w-fit justify-between md:justify-start">
			<span
				aria-hidden="true"
				className="inline-block translate-y-[-2px] translate-x-[2px]"
			>
				<span style={{ color: '#dc143c', opacity: 1 }}>🔥</span>
			</span>
			<div className="text-left">
				<h3
					className="inline-block my-0 font-medium text-[16px]"
					style={{ color: '#dc143c' }}
				>
					&nbsp;{region}
				</h3>
			</div>
			<div className="w-[10ch] text-right">
				<span className="inline-flex tabular-nums">
					{formatNumber(fires)}
				</span>
			</div>
			<div className="w-[20ch] ml-auto text-right text-gray-100">
				<span>Brightness: </span>
				<span className="inline-block">{brightness}</span>
			</div>
		</li>
	)
}

export function TopAffectedRegions({ stats }: { stats: FireStats }) {
	return (
		<div className="space-y-2">
			<h2 className="my-0 font-mono font-medium text-sm tracking-tight uppercase text-gray-100">
				Top Affected Regions
			</h2>
			<ul className="list-none pl-0 space-y-1">
				{stats.topAffectedRegions.map((region) => (
					<FireRegionRow
						key={region.region}
						region={region.region}
						fires={region.fires}
						brightness={region.brightness}
					/>
				))}
			</ul>
		</div>
	)
}

export function HighConfidenceFires({ stats }: { stats: FireStats }) {
	return (
		<div className="flex items-center w-full md:w-fit justify-between md:justify-start mt-2">
			<span
				aria-hidden="true"
				className="inline-block translate-y-[-2px] translate-x-[2px]"
			>
				<span className="text-[10px]">●</span>
			</span>
			<div className="text-left">
				<span className="inline-block my-0 font-medium text-[16px]">
					&nbsp;{formatNumber(stats.highConfidenceFires)}
				</span>
				<span className="font-medium text-[16px] text-gray-100 tracking-tight">
					&nbsp;High Confidence
				</span>
			</div>
		</div>
	)
}

export function FireStatsGrid({ stats }: { stats: FireStats }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
			<div className="flex flex-col gap-1.5">
				<StatCard
					title="Average Brightness"
					value={stats.avgBrightness}
					infoContent="The average brightness of detected fires on a scale of 0-500. Higher values indicate stronger thermal signatures."
					className="flex-1"
				/>
				<StatCard
					title="Detection By Satellite"
					infoContent="Forest fires detected by MODIS and VIIRS satellites. Multiple satellite sources improve detection accuracy and reduce false positives."
					className="flex-1"
				>
					<ul className="space-y-1 list-none pl-0 mt-2">
						<MetricRow
							label="MODIS"
							value={stats.detectionsBySatellite.MODIS}
						/>
						<MetricRow
							label="VIIRS"
							value={stats.detectionsBySatellite.VIIRS}
						/>
					</ul>
				</StatCard>
			</div>

			<div className="flex flex-col gap-1.5">
				<StatCard
					title="Fire Radiative Power"
					value={Math.round(stats.avgFRP)}
					infoContent="Average FRP in megawatts (MW). Fire Radiative Power estimates the thermal energy released by detected fires."
					className="flex-1"
				/>
				<StatCard
					title="Detections By Date"
					infoContent="Number of fire detections detected in the last three days. Recent detections help identify active fire zones."
					className="flex-1"
				>
					<ul className="space-y-1 list-none pl-0 mt-2">
						<MetricRow
							label="Today"
							value={stats.detectionsByDay.today}
						/>
						<MetricRow
							label="Yesterday"
							value={stats.detectionsByDay.yesterday}
						/>
						<MetricRow
							label="2 Days Ago"
							value={stats.detectionsByDay.twoAgo}
						/>
					</ul>
				</StatCard>
			</div>

			<div className="flex flex-col gap-1.5">
				<StatCard
					title="Avg FRP"
					value={stats.avgFRP}
					infoContent="Average confidence score across all detections. Confidence indicates the probability that a detection is an actual fire."
					className="flex-1"
				>
					<p className="text-gray-100 text-sm font-mono mt-1">MW</p>
				</StatCard>
			</div>
		</div>
	)
}

export function FireStatsDashboard() {
	const [stats, setStats] = useState<FireStats>(DEFAULT_STATS)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		let firstLoad = true
		const fetchStats = async () => {
			try {
				if (!cancelled && firstLoad) setLoading(true)
				const response = await fetch('/api/fire-stats', {
					cache: 'no-store',
				})

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`)
				}

				const data: FireStats = await response.json()
				if (!cancelled) {
					setStats(data)
					setError(null)
					firstLoad = false
				}
			} catch (err) {
				console.error('Failed to fetch fire stats:', err)
				if (!cancelled) {
					setStats(DEFAULT_STATS)
					setError('Using default data')
					firstLoad = false
				}
			} finally {
				if (!cancelled && firstLoad === false) setLoading(false)
			}
		}

		fetchStats()
		const interval = setInterval(fetchStats, 5000)
		return () => {
			cancelled = true
			clearInterval(interval)
		}
	}, [])

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-gray-100">Loading stats...</p>
			</div>
		)
	}

	return (
		<div className="space-y-6 p-4">
			{error && (
				<div className="bg-yellow-900 border border-yellow-700 p-3 rounded text-yellow-200 text-sm">
					{error}
				</div>
			)}
			<TotalActiveFires stats={stats} />
			<TopAffectedRegions stats={stats} />
			<HighConfidenceFires stats={stats} />
			<FireStatsGrid stats={stats} />
		</div>
	)
}
