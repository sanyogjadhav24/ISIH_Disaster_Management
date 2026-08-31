type ArcGisModules = {
	GeoJSONLayer: any
	PopupTemplate: any
	ClassBreaksRenderer?: any
	SimpleRenderer?: any
	UniqueValueRenderer?: any
	SimpleMarkerSymbol: any
}

export function createGeoJsonUrl(featureCollection: any) {
	const blob = new Blob([JSON.stringify(featureCollection)], {
		type: 'application/geo+json; charset=utf-8',
	})
	return URL.createObjectURL(blob)
}

export function createNasaFiresLayer(mods: ArcGisModules, url: string) {
	const {
		GeoJSONLayer,
		PopupTemplate,
		ClassBreaksRenderer,
		SimpleMarkerSymbol,
	} = mods
	if (
		!GeoJSONLayer ||
		!PopupTemplate ||
		!ClassBreaksRenderer ||
		!SimpleMarkerSymbol
	)
		return null

	const popupTemplate = new PopupTemplate({
		title: '🔥 Active Fire',
		content: `
      <div style="font-size: 14px;">
        <p><strong>Brightness:</strong> {brightness}K</p>
        <p><strong>Confidence:</strong> {confidence}</p>
        <p><strong>Date:</strong> {acq_date} {acq_time}</p>
        <p><strong>Satellite:</strong> {satellite}</p>
        <p><strong>Day/Night:</strong> {daynight}</p>
      </div>
    `,
	})

	const renderer = new ClassBreaksRenderer({
		field: 'brightness',
		defaultSymbol: new SimpleMarkerSymbol({
			color: [255, 136, 0, 0.8],
			size: '6px',
			outline: { color: 'white', width: 1 },
		}),
		classBreakInfos: [
			{
				minValue: 0,
				maxValue: 300,
				symbol: new SimpleMarkerSymbol({
					color: [255, 136, 0, 0.8],
					size: '6px',
					outline: { color: 'white', width: 1 },
				}),
			},
			{
				minValue: 300,
				maxValue: 320,
				symbol: new SimpleMarkerSymbol({
					color: [255, 102, 0, 0.8],
					size: '8px',
					outline: { color: 'white', width: 1 },
				}),
			},
			{
				minValue: 320,
				maxValue: 350,
				symbol: new SimpleMarkerSymbol({
					color: [255, 69, 0, 0.8],
					size: '10px',
					outline: { color: 'white', width: 1 },
				}),
			},
			{
				minValue: 350,
				maxValue: Infinity,
				symbol: new SimpleMarkerSymbol({
					color: [255, 0, 0, 0.9],
					size: '12px',
					outline: { color: 'white', width: 1 },
				}),
			},
		],
	})

	return new GeoJSONLayer({
		url,
		renderer,
		popupEnabled: false,
		popupTemplate,
		opacity: 0.85,
		featureReduction: {
			type: 'cluster',
			clusterRadius: '50px',
			clusterMinSize: '12px',
			clusterMaxSize: '24px',
			symbol: {
				type: 'simple-marker',
				color: [255, 69, 0, 0.8],
				outline: { color: 'white', width: 1 },
			},
			popupTemplate: {
				title: 'Fire Cluster',
				content: 'This cluster contains {cluster_count} fires.',
			},
			labelingInfo: [
				{
					symbol: {
						type: 'text',
						color: 'white',
						font: { family: 'Arial', size: '10px', weight: 'bold' },
					},
					labelExpressionInfo: {
						expression: '$feature.cluster_count',
					},
				},
			],
		},
	})
}

export function createManualReportsLayer(mods: ArcGisModules, url: string) {
	const { GeoJSONLayer, PopupTemplate, SimpleRenderer, SimpleMarkerSymbol } =
		mods
	if (
		!GeoJSONLayer ||
		!PopupTemplate ||
		!SimpleRenderer ||
		!SimpleMarkerSymbol
	)
		return null

	const popupTemplate = new PopupTemplate({
		title: '📝 Report',
		content: `
      <div style="font-size: 14px;">
        <p><strong>Reports:</strong> {report_count}</p>
        <p><strong>Title:</strong> {title}</p>
        <p><strong>Severity:</strong> {severity}</p>
        <p><strong>Time Range:</strong> {createdAt} - {latestAt}</p>
        <p><strong>Description:</strong> {description}</p>
        <p><strong>Devices:</strong> {deviceNames}</p>
      </div>
    `,
	})

	const renderer = new SimpleRenderer({
		symbol: new SimpleMarkerSymbol({
			color: [0, 122, 255, 0.85],
			size: '10px',
			outline: { color: 'white', width: 1 },
		}),
	})

	return new GeoJSONLayer({
		url,
		renderer,
		popupEnabled: false,
		popupTemplate,
		opacity: 0.95,
		featureReduction: {
			type: 'cluster',
			clusterRadius: '55px',
			clusterMinSize: '12px',
			clusterMaxSize: '26px',
			symbol: {
				type: 'simple-marker',
				color: [0, 122, 255, 0.8],
				outline: { color: 'white', width: 1 },
			},
			popupTemplate: {
				title: 'Report Cluster',
				content: 'This cluster contains {cluster_count} reports.',
			},
			labelingInfo: [
				{
					symbol: {
						type: 'text',
						color: 'white',
						font: { family: 'Arial', size: '10px', weight: 'bold' },
					},
					labelExpressionInfo: {
						expression: '$feature.cluster_count',
					},
				},
			],
		},
	})
}

export function createIncidentsLayer(mods: ArcGisModules, url: string) {
	const {
		GeoJSONLayer,
		PopupTemplate,
		SimpleRenderer,
		UniqueValueRenderer,
		SimpleMarkerSymbol,
	} = mods
	if (!GeoJSONLayer || !PopupTemplate || !SimpleMarkerSymbol) return null

	const popupTemplate = new PopupTemplate({
		title: '📡 Sensor {sensor_id}',
		content: `
			<div style="font-size: 14px; color: black;">
				<p><strong>Smoke:</strong> {smoke}</p>
				<p><strong>CO:</strong> {co}</p>
				<p><strong>CH4:</strong> {ch4}</p>
				<p><strong>Temp:</strong> {temp} °C</p>
				<p><strong>Humidity:</strong> {hum}%</p>
				<p><strong>Server time:</strong> {server_time}</p>
			</div>
		`,
	})

	const renderer = UniqueValueRenderer
		? new UniqueValueRenderer({
				field: 'marker_kind',
				defaultSymbol: new SimpleMarkerSymbol({
					color: [255, 255, 255, 0.95],
					size: '10px',
					outline: { color: [0, 0, 0, 0.9], width: 1.5 },
				}),
				uniqueValueInfos: [
					{
						value: 'active',
						symbol: new SimpleMarkerSymbol({
							style: 'triangle',
							color: [34, 197, 94, 0.95], // Green fire color
							size: '14px',
							outline: { color: [255, 255, 255, 1], width: 2 },
							angle: 0, // Pointing up like a flame
						}),
					},
					{
						value: 'inactive',
						symbol: new SimpleMarkerSymbol({
							style: 'circle',
							color: [156, 163, 175, 0.8], // Gray for inactive
							size: '8px',
							outline: { color: [255, 255, 255, 0.9], width: 1 },
						}),
					},
				],
			})
		: SimpleRenderer
			? new SimpleRenderer({
					symbol: new SimpleMarkerSymbol({
						color: [255, 255, 255, 0.95],
						size: '10px',
						outline: { color: [0, 0, 0, 0.9], width: 1.5 },
					}),
				})
			: null

	if (!renderer) return null

	return new GeoJSONLayer({
		url,
		renderer,
		popupEnabled: true,
		popupTemplate,
		opacity: 1,
	})
}

export function createIncidentsGlowLayer(mods: ArcGisModules, url: string) {
	const { GeoJSONLayer, UniqueValueRenderer, SimpleMarkerSymbol } = mods
	if (!GeoJSONLayer || !SimpleMarkerSymbol) return null

	// Only show glow for active sensors
	const renderer = UniqueValueRenderer
		? new UniqueValueRenderer({
				field: 'marker_kind',
				defaultSymbol: new SimpleMarkerSymbol({
					color: [0, 0, 0, 0], // Invisible for non-active
					size: '0px',
				}),
				uniqueValueInfos: [
					{
						value: 'active',
						symbol: new SimpleMarkerSymbol({
							style: 'circle',
							color: [34, 197, 94, 0.3], // Green glow
							size: '28px',
							outline: { color: [34, 197, 94, 0], width: 0 },
						}),
					},
					{
						value: 'inactive',
						symbol: new SimpleMarkerSymbol({
							color: [0, 0, 0, 0], // No glow for inactive
							size: '0px',
						}),
					},
				],
			})
		: null

	if (!renderer) return null

	return new GeoJSONLayer({
		url,
		renderer,
		popupEnabled: false,
		opacity: 1,
	})
}
