import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { FireLocation } from '@/lib/models/FireLocation';

export async function GET() {
  try {
    await connectToDatabase();
    
    const totalFires = await FireLocation.countDocuments();
    const recentFires = await FireLocation.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });
    
    const sampleFire = await FireLocation.findOne().lean();
    
    return NextResponse.json({
      success: true,
      data: {
        totalFires,
        recentFires,
        sampleFire,
        hasData: totalFires > 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}