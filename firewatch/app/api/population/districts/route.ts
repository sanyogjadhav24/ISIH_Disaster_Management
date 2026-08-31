import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PopulationDistrict } from '@/lib/models/PopulationDistrict';

// GET all population districts or filter by bounds/state
export async function GET(request: NextRequest) {
  try {
    console.log('Connecting to MongoDB for population data...');
    await connectDB();
    console.log('Connected to MongoDB');
    
    const { searchParams } = new URL(request.url);
    const bounds = searchParams.get('bounds');
    const state = searchParams.get('state');
    const simplify = searchParams.get('simplify') === 'true';
    
    let query = {};
    let projection = {};
    
    // Add simplification for performance if requested
    if (simplify) {
      projection = {
        'properties.district_name': 1,
        'properties.state_name': 1,
        'properties.population': 1,
        'geometry': 1 // You might want to add geometry simplification here
      };
    }
    
    // Filter by state if provided
    if (state) {
      query = {
        ...query,
        'properties.state_name': { $regex: new RegExp(state, 'i') }
      };
    }
    
    // Filter by bounds if provided (format: minLng,minLat,maxLng,maxLat)
    if (bounds) {
      const [minLng, minLat, maxLng, maxLat] = bounds.split(',').map(Number);
      if (minLng && minLat && maxLng && maxLat) {
        query = {
          ...query,
          geometry: {
            $geoIntersects: {
              $geometry: {
                type: 'Polygon',
                coordinates: [[
                  [minLng, minLat],
                  [maxLng, minLat],
                  [maxLng, maxLat],
                  [minLng, maxLat],
                  [minLng, minLat]
                ]]
              }
            }
          }
        };
      }
    }

    console.log('Fetching population district data from MongoDB...');
    const districts = await PopulationDistrict.find(query, projection)
      .sort({ 'properties.population': -1 })
      .lean();

    console.log(`Found ${districts.length} population districts`);
    
    // Calculate statistics
    const totalPopulation = districts.reduce((sum, district) => sum + district.properties.population, 0);
    const avgPopulation = districts.length > 0 ? Math.round(totalPopulation / districts.length) : 0;
    
    // Log sample data
    if (districts.length > 0) {
      console.log('Sample district data:', {
        name: districts[0].properties.district_name,
        state: districts[0].properties.state_name,
        population: districts[0].properties.population
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        type: 'FeatureCollection',
        features: districts
      },
      count: districts.length,
      statistics: {
        totalPopulation: totalPopulation,
        averagePopulation: avgPopulation,
        maxPopulation: districts.length > 0 ? districts[0].properties.population : 0,
        minPopulation: districts.length > 0 ? districts[districts.length - 1].properties.population : 0
      },
      message: `Retrieved ${districts.length} population districts from MongoDB`
    });
    
  } catch (error) {
    console.error('Error fetching population districts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch population district data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST new population district data (for bulk import)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Handle both single feature and FeatureCollection
    let features = [];
    if (body.type === 'FeatureCollection') {
      features = body.features;
    } else if (body.type === 'Feature') {
      features = [body];
    } else if (Array.isArray(body)) {
      features = body;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid GeoJSON format' },
        { status: 400 }
      );
    }
    
    console.log(`Importing ${features.length} population district features...`);
    
    // Validate and insert features
    const insertPromises = features.map(async (feature: any) => {
      try {
        // Validate required properties
        if (!feature.properties?.district_name || !feature.properties?.state_name || !feature.properties?.population) {
          throw new Error(`Missing required properties in feature: ${JSON.stringify(feature.properties)}`);
        }
        
        // Use upsert to handle duplicates
        return await PopulationDistrict.findOneAndUpdate(
          { 
            'properties.district_name': feature.properties.district_name,
            'properties.state_name': feature.properties.state_name
          },
          feature,
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true 
          }
        );
      } catch (err) {
        console.error('Error inserting feature:', err);
        throw err;
      }
    });
    
    const results = await Promise.allSettled(insertPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Import complete: ${successful} successful, ${failed} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Imported ${successful} districts successfully`,
      statistics: {
        total: features.length,
        successful: successful,
        failed: failed,
        errors: results
          .filter(r => r.status === 'rejected')
          .map(r => (r as PromiseRejectedResult).reason.message)
      }
    });
    
  } catch (error) {
    console.error('Error importing population districts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to import population district data: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}