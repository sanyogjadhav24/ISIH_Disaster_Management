import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PopulationDistrict } from '@/lib/models/PopulationDistrict';

// Ensure this endpoint is always executed (no static caching) and runs in Node.js.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ArcgisTokenCache = {
  token: string;
  // epoch ms
  expiresAt: number;
};

let arcgisTokenCache: ArcgisTokenCache | null = null;

async function getArcgisAccessToken(): Promise<string | null> {
  const clientId = process.env.ARCGIS_CLIENT_ID;
  const clientSecret = process.env.ARCGIS_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (arcgisTokenCache && arcgisTokenCache.expiresAt - now > 60_000) {
    return arcgisTokenCache.token;
  }

  const tokenUrl = new URL('https://www.arcgis.com/sharing/rest/oauth2/token');
  tokenUrl.searchParams.set('f', 'json');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('grant_type', 'client_credentials');
  // seconds; keep short-ish and refresh automatically
  tokenUrl.searchParams.set('expiration', '60');

  const resp = await fetch(tokenUrl.toString(), { method: 'POST' });
  const json = await resp.json().catch(() => null);

  if (!resp.ok || !json || json?.error) {
    const msg = json?.error_description || json?.error?.message || `ArcGIS token request failed (${resp.status})`;
    throw new Error(msg);
  }

  const token = json.access_token;
  const expiresInSec = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  if (typeof token !== 'string' || !token) {
    throw new Error('ArcGIS token response missing access_token');
  }

  arcgisTokenCache = {
    token,
    expiresAt: Date.now() + expiresInSec * 1000
  };

  return token;
}

function buildCirclePolygon(lon: number, lat: number, radiusKm: number, steps = 64) {
  // Small-distance approximation in WGS84 degrees (good enough for ~3km buffers)
  const latRad = (lat * Math.PI) / 180;
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(latRad);

  const dLat = radiusKm / kmPerDegLat;
  const dLon = radiusKm / kmPerDegLon;

  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const theta = (2 * Math.PI * i) / steps;
    const x = lon + dLon * Math.cos(theta);
    const y = lat + dLat * Math.sin(theta);
    ring.push([x, y]);
  }
  // Close ring
  ring.push(ring[0]);

  return {
    type: 'Polygon' as const,
    coordinates: [ring]
  };
}

async function fetchArcgisEnrichedPopulation(params: {
  lat: number;
  lon: number;
  radiusKm: number;
}): Promise<{ estimatedPopulation: number | null; raw?: any }> {
  const apiKey = process.env.ARCGIS_API_KEY;
  const oauthToken = await getArcgisAccessToken();
  const tokenToUse = oauthToken || apiKey || null;
  if (!tokenToUse) {
    throw new Error(
      'Missing ArcGIS credentials. Set ARCGIS_CLIENT_ID + ARCGIS_CLIENT_SECRET (recommended) or ARCGIS_API_KEY.'
    );
  }

  const url = new URL(
    'https://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich'
  );

  // GeoEnrichment expects form-style params.
  // We request a buffer around the point and ask for KeyGlobalFacts collection.
  url.searchParams.set('f', 'json');
  url.searchParams.set('studyAreas', JSON.stringify([{ geometry: { x: params.lon, y: params.lat } }]));
  url.searchParams.set('bufferRadii', String(params.radiusKm));
  url.searchParams.set('bufferUnits', 'kilometers');
  url.searchParams.set('dataCollections', 'KeyGlobalFacts');
  url.searchParams.set('returnGeometry', 'false');
  // GeoEnrichment typically requires an OAuth access token. We'll use OAuth if configured, else API key.
  url.searchParams.set('token', tokenToUse);

  const resp = await fetch(url.toString(), { method: 'GET' });

  const json = await resp.json();
  if (!resp.ok || json?.error) {
    const code = json?.error?.code;
    const msg = json?.error?.message || `ArcGIS GeoEnrichment failed with status ${resp.status}`;
    if (code === 498) {
      throw new Error(
        'Invalid token (498). ArcGIS GeoEnrichment usually requires OAuth (ARCGIS_CLIENT_ID + ARCGIS_CLIENT_SECRET), not only an API key.'
      );
    }
    throw new Error(msg);
  }

  // Try to find a population attribute in the response.
  const attributes =
    json?.results?.[0]?.value?.FeatureSet?.[0]?.features?.[0]?.attributes ||
    json?.results?.[0]?.value?.featureSet?.[0]?.features?.[0]?.attributes ||
    json?.results?.[0]?.value?.FeatureSet?.features?.[0]?.attributes ||
    null;

  if (!attributes || typeof attributes !== 'object') {
    return { estimatedPopulation: null, raw: json };
  }

  const direct =
    attributes.TOTPOP_CY ??
    attributes.TOTPOP ??
    attributes.totpop_cy ??
    attributes.totpop ??
    attributes.POP ??
    attributes.Population;

  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return { estimatedPopulation: direct, raw: json };
  }

  // Fallback: find any numeric field with POP/TOTPOP in the key.
  const maybeKey = Object.keys(attributes).find((k) => /totpop|pop/i.test(k));
  if (maybeKey) {
    const v = (attributes as any)[maybeKey];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return { estimatedPopulation: v, raw: json };
    }
  }

  return { estimatedPopulation: null, raw: json };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = Number(searchParams.get('lat'));
    const lon = Number(searchParams.get('lon'));
    const radiusKmRaw = searchParams.get('radiusKm');
    const radiusKm = radiusKmRaw ? Number(radiusKmRaw) : 3;
    const source = (searchParams.get('source') || 'arcgis').toLowerCase();

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid query params. Use lat, lon, radiusKm (> 0).' },
        { status: 400 }
      );
    }

    const affectedAreaKm2 = Math.PI * radiusKm * radiusKm;

    // Default: Real-time-ish population via API (ArcGIS GeoEnrichment)
    if (source !== 'db') {
      const { estimatedPopulation } = await fetchArcgisEnrichedPopulation({
        lat,
        lon,
        radiusKm
      });

      return NextResponse.json({
        success: true,
        source: 'arcgis',
        input: { lat, lon, radiusKm },
        affectedAreaKm2,
        estimatedPopulation,
        note:
          'Population is from ArcGIS GeoEnrichment (API-based). This is not per-second “live” headcount, but current demographic estimates.'
      });
    }

    // Optional fallback: MongoDB district polygons intersection
    await connectDB();

    const circlePolygon = buildCirclePolygon(lon, lat, radiusKm);

    const projection = {
      'properties.district_name': 1,
      'properties.state_name': 1,
      'properties.population': 1
    };

    const districts = await PopulationDistrict.find(
      {
        geometry: {
          $geoIntersects: {
            $geometry: circlePolygon
          }
        }
      },
      projection
    )
      .sort({ 'properties.population': -1 })
      .lean();

    const estimatedPopulation = districts.reduce((sum: number, d: any) => {
      const p = d?.properties?.population;
      return sum + (typeof p === 'number' && Number.isFinite(p) ? p : 0);
    }, 0);

    return NextResponse.json({
      success: true,
      source: 'db',
      input: { lat, lon, radiusKm },
      affectedAreaKm2,
      estimatedPopulation,
      districts: districts.map((d: any) => ({
        district_name: d?.properties?.district_name,
        state_name: d?.properties?.state_name,
        population: d?.properties?.population
      })),
      count: districts.length,
      note:
        'Population is an estimate based on intersecting stored district polygons (not real-time live population).'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to calculate fire impact: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}
