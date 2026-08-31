type ImpactModules = {
  Point: any;
  Circle: any;
  Graphic: any;
  SimpleFillSymbol: any;
  TextSymbol: any;
};

type RegisterArgs = {
  view: any;
  layer: any;
  impactLayer: any;
  mods: ImpactModules;
  getPopupHtml: (args: {
    isCluster: boolean;
    attrs: any;
    radiusKm: number;
    affectedAreaKm2: number;
    popText: string;
    districtCount: number | null;
    sourceText: string;
  }) => { title: string; content: string };
};

export function registerImpactClick({ view, layer, impactLayer, mods, getPopupHtml }: RegisterArgs) {
  const { Point, Circle, Graphic, SimpleFillSymbol, TextSymbol } = mods;
  if (!view || !layer || !impactLayer || !Point || !Circle || !Graphic || !SimpleFillSymbol || !TextSymbol) {
    return null;
  }

  return view.on('click', async (event: any) => {
    try {
      const hit = await view.hitTest(event, { include: [layer] });
      const result = hit?.results?.[0];
      if (!result?.graphic) return;

      const attrs = result.graphic.attributes;
      const isCluster = !!(attrs && typeof attrs.cluster_count === 'number');

      const geom = isCluster ? event?.mapPoint : result.graphic.geometry;
      const lon = typeof geom?.longitude === 'number' ? geom.longitude : geom?.x;
      const lat = typeof geom?.latitude === 'number' ? geom.latitude : geom?.y;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

      const radiusKm = 3;

      await view.goTo({
        center: [lon, lat],
        zoom: Math.max(view.zoom || 5, 11),
      });

      impactLayer.removeAll();

      const circleGeom = new Circle({
        center: [lon, lat],
        radius: radiusKm * 1000,
        radiusUnit: 'meters',
        geodesic: true,
      });

      impactLayer.add(
        new Graphic({
          geometry: circleGeom,
          symbol: new SimpleFillSymbol({
            color: [255, 0, 0, 0.08],
            outline: { color: [255, 0, 0, 0.8], width: 2 },
          }),
        })
      );

      const resp = await fetch(
        `/api/fire/impact?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&source=arcgis`,
        { cache: 'no-store' }
      );

      let impact: any = null;
      try {
        impact = await resp.json();
      } catch {
        impact = null;
      }

      if (!impact?.success) {
        impact = { success: true, source: 'arcgis', estimatedPopulation: null };
      }

      const affectedAreaKm2 = Number.isFinite(impact?.affectedAreaKm2)
        ? impact.affectedAreaKm2
        : Math.PI * radiusKm * radiusKm;

      const estimatedPopulation = Number.isFinite(impact?.estimatedPopulation)
        ? impact.estimatedPopulation
        : null;

      const districtCount = Number.isFinite(impact?.count) ? impact.count : null;
      const sourceText = typeof impact?.source === 'string' ? impact.source : 'unknown';
      const popText = estimatedPopulation === null ? 'Unavailable' : estimatedPopulation.toLocaleString();

      const peopleLabel = estimatedPopulation === null ? 'POP' : `POP\n${popText}`;
      impactLayer.add(
        new Graphic({
          geometry: new Point({ longitude: lon, latitude: lat }),
          symbol: new TextSymbol({
            text: peopleLabel,
            color: [255, 255, 255, 1],
            haloColor: [0, 0, 0, 0.8],
            haloSize: 1,
            font: { size: 14, family: 'Arial', weight: 'bold' },
            yoffset: 10,
          }),
        })
      );

      const { title, content } = getPopupHtml({
        isCluster,
        attrs,
        radiusKm,
        affectedAreaKm2,
        popText,
        districtCount,
        sourceText,
      });

      view.popup.open({
        title,
        location: geom,
        content,
      });
    } catch (err) {
      console.error('Failed to compute impact:', err);
    }
  });
}
