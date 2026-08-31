import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PopulationDistrict } from '@/lib/models/PopulationDistrict';

// Test endpoint for population data
export async function GET(request: NextRequest) {
  try {
    console.log('Testing population districts connection...');
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Get basic statistics
    const totalCount = await PopulationDistrict.countDocuments();
    const sampleDistricts = await PopulationDistrict.find({})
      .select('properties.district_name properties.state_name properties.population')
      .limit(5)
      .lean();
    
    // Get population statistics
    const stats = await PopulationDistrict.aggregate([
      {
        $group: {
          _id: null,
          totalPopulation: { $sum: '$properties.population' },
          avgPopulation: { $avg: '$properties.population' },
          maxPopulation: { $max: '$properties.population' },
          minPopulation: { $min: '$properties.population' }
        }
      }
    ]);
    
    // Get state-wise count
    const stateStats = await PopulationDistrict.aggregate([
      {
        $group: {
          _id: '$properties.state_name',
          count: { $sum: 1 },
          totalPopulation: { $sum: '$properties.population' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log(`Population test successful: ${totalCount} districts found`);
    
    return NextResponse.json({ 
      success: true,
      collection: 'population_districts',
      totalDistricts: totalCount,
      statistics: stats[0] || {},
      topStatesByDistricts: stateStats,
      sampleDistricts: sampleDistricts.map(d => ({
        name: d.properties.district_name,
        state: d.properties.state_name,
        population: d.properties.population
      })),
      message: `✅ Population data test successful! Found ${totalCount} districts`
    });
    
  } catch (error) {
    console.error('Population test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Population test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}