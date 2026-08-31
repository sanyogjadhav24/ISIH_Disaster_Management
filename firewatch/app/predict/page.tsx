'use client'

import { useState, useEffect, useCallback } from 'react'

type SensorReading = {
	sensor_id?: string
	location?: string
	smoke: number
	co: number
	ch4: number
	temp: number
	hum: number
	server_time?: string
}

type PredictResponse = {
	prediction?: 'Stable' | 'Warning' | 'Imminent' | 'Critical'
	confidence?: string
	risk_score?: number
	trend?: 'Rising Rapidly' | 'Steady'
	current?: SensorReading
	history?: SensorReading[]
	location?: string
	sensor_id?: string
	event_start?: string
	event_end?: string
	hasData?: boolean
	error?: string
	message?: string
}

function getPredictionColor(prediction: string): string {
	switch (prediction) {
		case 'Critical':
			return 'text-red-500 bg-red-500/10 border-red-500'
		case 'Imminent':
			return 'text-orange-500 bg-orange-500/10 border-orange-500'
		case 'Warning':
			return 'text-yellow-500 bg-yellow-500/10 border-yellow-500'
		default:
			return 'text-green-500 bg-green-500/10 border-green-500'
	}
}

function getRiskColor(score: number): string {
	if (score >= 80) return 'bg-red-500'
	if (score >= 60) return 'bg-orange-500'
	if (score >= 40) return 'bg-yellow-500'
	return 'bg-green-500'
}

function SensorIcon() {
	return (
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
				d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
			/>
		</svg>
	)
}

function RefreshIcon({ className }: { className?: string }) {
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
				d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
			/>
		</svg>
	)
}

export default function PredictPage() {
	const [result, setResult] = useState<PredictResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdate, setLastUpdate] = useState<string>('')
	const [autoRefresh, setAutoRefresh] = useState(true)

	const fetchPrediction = useCallback(async () => {
		try {
			setLoading(true)
			const response = await fetch('/api/predict', { cache: 'no-store' })

			if (!response.ok) {
				const errData = await response.json()
				throw new Error(errData.error || 'Prediction failed')
			}

			const data: PredictResponse = await response.json()
			setResult(data)
			setError(null)
			setLastUpdate(new Date().toLocaleTimeString())
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Prediction failed')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchPrediction()

		if (autoRefresh) {
			const interval = setInterval(fetchPrediction, 10000) // Refresh every 10 seconds
			return () => clearInterval(interval)
		}
	}, [fetchPrediction, autoRefresh])

	return (
		<main className="min-h-[calc(100vh-56px)] bg-gray-950">
			<div className="max-w-[1600px] mx-auto px-6 py-8">
				{/* Header */}
				<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
					<div>
						<h1 className="font-mono text-2xl font-semibold text-white flex items-center gap-3">
							<SensorIcon />
							Disaster Prediction
						</h1>
						<p className="font-mono text-sm text-gray-400 mt-1">
							AI-powered risk assessment from live sensor data
						</p>
						{result?.sensor_id && (
							<div className="flex flex-wrap gap-4 mt-2">
								<span className="font-mono text-xs text-gray-500">
									Sensor:{' '}
									<span className="text-gray-300">
										{result.sensor_id}
									</span>
								</span>
								{result.location && (
									<span className="font-mono text-xs text-gray-500">
										Location:{' '}
										<span className="text-gray-300">
											{result.location}
										</span>
									</span>
								)}
							</div>
						)}
					</div>
					<div className="flex items-center gap-3">
						<label className="flex items-center gap-2 text-gray-400 font-mono text-sm">
							<input
								type="checkbox"
								checked={autoRefresh}
								onChange={(e) =>
									setAutoRefresh(e.target.checked)
								}
								className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
							/>
							Auto-refresh
						</label>
						<button
							onClick={fetchPrediction}
							disabled={loading}
							className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-mono text-sm uppercase rounded-md transition-colors flex items-center gap-2"
						>
							<RefreshIcon
								className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
							/>
							Refresh
						</button>
					</div>
				</div>

				{error && (
					<div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
						<p className="font-mono text-sm text-red-400">
							{error}
						</p>
					</div>
				)}

				{result && !result.hasData && (
					<div className="mb-6 p-6 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-center">
						<p className="font-mono text-lg text-yellow-400 mb-2">
							Waiting for Sensor Data
						</p>
						<p className="font-mono text-sm text-gray-400">
							{result.message ||
								'Need at least 4 sensor readings to make predictions'}
						</p>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Current Sensor Data */}
					<div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-800 p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="font-mono text-sm text-gray-400 uppercase">
								Live Sensor Readings
							</h2>
							{lastUpdate && (
								<span className="font-mono text-xs text-gray-500">
									Updated: {lastUpdate}
								</span>
							)}
						</div>

						{result?.current ? (
							<>
								<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
									<div className="bg-gray-800 rounded-lg p-4">
										<p className="font-mono text-xs text-gray-500 uppercase mb-1">
											Smoke
										</p>
										<p className="font-mono text-2xl text-white">
											{result.current.smoke}
											<span className="text-sm text-gray-400 ml-1">
												ppm
											</span>
										</p>
									</div>
									<div className="bg-gray-800 rounded-lg p-4">
										<p className="font-mono text-xs text-gray-500 uppercase mb-1">
											CO
										</p>
										<p className="font-mono text-2xl text-white">
											{result.current.co}
											<span className="text-sm text-gray-400 ml-1">
												ppm
											</span>
										</p>
									</div>
									<div className="bg-gray-800 rounded-lg p-4">
										<p className="font-mono text-xs text-gray-500 uppercase mb-1">
											CH4
										</p>
										<p className="font-mono text-2xl text-white">
											{result.current.ch4}
											<span className="text-sm text-gray-400 ml-1">
												ppm
											</span>
										</p>
									</div>
									<div className="bg-gray-800 rounded-lg p-4">
										<p className="font-mono text-xs text-gray-500 uppercase mb-1">
											Temp
										</p>
										<p className="font-mono text-2xl text-white">
											{result.current.temp}
											<span className="text-sm text-gray-400 ml-1">
												°C
											</span>
										</p>
									</div>
									<div className="bg-gray-800 rounded-lg p-4">
										<p className="font-mono text-xs text-gray-500 uppercase mb-1">
											Humidity
										</p>
										<p className="font-mono text-2xl text-white">
											{result.current.hum}
											<span className="text-sm text-gray-400 ml-1">
												%
											</span>
										</p>
									</div>
								</div>

								{/* History Table */}
								{result.history &&
									result.history.length > 0 && (
										<div className="pt-6 border-t border-gray-800">
											<h3 className="font-mono text-sm text-gray-400 uppercase mb-4">
												Previous Readings
											</h3>
											<div className="overflow-x-auto">
												<table className="w-full font-mono text-sm">
													<thead>
														<tr className="text-gray-500 text-xs uppercase">
															<th className="text-left py-2">
																Reading
															</th>
															<th className="text-right py-2">
																Smoke
															</th>
															<th className="text-right py-2">
																CO
															</th>
															<th className="text-right py-2">
																CH4
															</th>
															<th className="text-right py-2">
																Temp
															</th>
															<th className="text-right py-2">
																Hum
															</th>
														</tr>
													</thead>
													<tbody className="text-gray-300">
														{result.history.map(
															(h, i) => (
																<tr
																	key={i}
																	className="border-t border-gray-800"
																>
																	<td className="py-2 text-gray-500">
																		t-
																		{i + 1}
																	</td>
																	<td className="text-right py-2">
																		{
																			h.smoke
																		}
																	</td>
																	<td className="text-right py-2">
																		{h.co}
																	</td>
																	<td className="text-right py-2">
																		{h.ch4}
																	</td>
																	<td className="text-right py-2">
																		{h.temp}
																		°C
																	</td>
																	<td className="text-right py-2">
																		{h.hum}%
																	</td>
																</tr>
															),
														)}
													</tbody>
												</table>
											</div>
										</div>
									)}
							</>
						) : (
							<div className="flex items-center justify-center h-48">
								{loading ? (
									<div className="flex items-center gap-3">
										<RefreshIcon className="w-6 h-6 text-gray-500 animate-spin" />
										<span className="font-mono text-gray-500">
											Loading sensor data...
										</span>
									</div>
								) : (
									<span className="font-mono text-gray-500">
										No sensor data available
									</span>
								)}
							</div>
						)}
					</div>

					{/* Prediction Results */}
					<div className="space-y-4">
						{result?.hasData && result.prediction ? (
							<>
								{/* Prediction Card */}
								<div
									className={`bg-gray-900 rounded-lg border p-6 ${getPredictionColor(result.prediction)}`}
								>
									<h3 className="font-mono text-xs text-gray-400 uppercase mb-2">
										Prediction
									</h3>
									<p className="font-mono text-4xl font-bold">
										{result.prediction}
									</p>
									<p className="font-mono text-sm text-gray-400 mt-2">
										Confidence: {result.confidence}
									</p>
								</div>

								{/* Risk Score */}
								{/* <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
									<h3 className="font-mono text-xs text-gray-400 uppercase mb-2">
										Risk Score
									</h3>
									<div className="flex items-end gap-3">
										<p className="font-mono text-4xl font-bold text-white">
											{result.risk_score}
										</p>
										<span className="font-mono text-sm text-gray-500 pb-1">
											/100
										</span>
									</div>
									<div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
										<div
											className={`h-full ${getRiskColor(result.risk_score || 0)} transition-all duration-500`}
											style={{
												width: `${result.risk_score}%`,
											}}
										/>
									</div>
								</div> */}

								{/* Trend */}
								<div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
									<h3 className="font-mono text-xs text-gray-400 uppercase mb-2">
										Trend Analysis
									</h3>
									<p
										className={`font-mono text-xl font-semibold ${
											result.trend === 'Rising Rapidly'
												? 'text-red-400'
												: 'text-green-400'
										}`}
									>
										{result.trend === 'Rising Rapidly'
											? '↑'
											: '→'}{' '}
										{result.trend}
									</p>
								</div>

								{/* Actions */}
								{(result.prediction === 'Critical' ||
									result.prediction === 'Imminent') && (
									<div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
										<h3 className="font-mono text-sm text-red-400 font-semibold mb-2">
											⚠ Immediate Action Required
										</h3>
										<ul className="font-mono text-xs text-gray-300 space-y-1">
											<li>
												• Evacuate affected area
												immediately
											</li>
											<li>
												• Alert emergency response teams
											</li>
											<li>
												• Activate fire suppression
												systems
											</li>
											<li>
												• Monitor wind direction for
												spread
											</li>
										</ul>
									</div>
								)}
							</>
						) : (
							<div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center">
								<SensorIcon />
								<p className="font-mono text-sm text-gray-400 mt-4">
									{loading
										? 'Analyzing sensor data...'
										: 'Waiting for sensor data to make predictions'}
								</p>
							</div>
						)}

						{/* Info Card */}
						<div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
							<h3 className="font-mono text-xs text-gray-400 uppercase mb-3">
								About This Model
							</h3>
							<p className="font-mono text-xs text-gray-500 leading-relaxed">
								Uses an ONNX neural network trained on sensor
								data to predict disaster risk levels. The model
								analyzes smoke, CO, CH4, temperature, and
								humidity trends from your connected sensors to
								classify conditions as Stable, Warning,
								Imminent, or Critical.
							</p>
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}
