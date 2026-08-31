import { NextResponse } from 'next/server';
import { nasaFireService } from '@/lib/services/nasaFireService';

export async function POST() {
  try {
    console.log('Starting global fire data fetch...');
    
    // Fetch global data instead of just regions
    const globalData = await nasaFireService.fetchGlobalFireData({
      date: 1, // Last 24 hours
      source: 'VIIRS_SNPP_NRT'
    });
    
    console.log(`Fetched ${globalData.length} global fire records`);
    
    return NextResponse.json({
      success: true,
      message: `Fetched ${globalData.length} global fire records`,
      data: {
        totalRecords: globalData.length,
        sampleData: globalData.slice(0, 5), // First 5 records
        regions: {
          northAmerica: globalData.filter(f => f.latitude > 25 && f.latitude < 70 && f.longitude > -170 && f.longitude < -60).length,
          europe: globalData.filter(f => f.latitude > 35 && f.latitude < 72 && f.longitude > -10 && f.longitude < 40).length,
          asia: globalData.filter(f => f.latitude > -10 && f.latitude < 77 && f.longitude > 26 && f.longitude < 180).length,
          australia: globalData.filter(f => f.latitude > -45 && f.latitude < -10 && f.longitude > 110 && f.longitude < 155).length,
          africa: globalData.filter(f => f.latitude > -35 && f.latitude < 40 && f.longitude > -20 && f.longitude < 55).length,
          southAmerica: globalData.filter(f => f.latitude > -60 && f.latitude < 15 && f.longitude > -85 && f.longitude < -35).length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Global fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch global fire data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}