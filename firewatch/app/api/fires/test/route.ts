import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Fire } from '@/lib/models/Fire';

// Test endpoint to check MongoDB connection and collection
export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    await connectDB();
    
    // Get collection stats
    const totalCount = await Fire.countDocuments();
    const recentCount = await Fire.countDocuments({
      acq_date: { $gte: new Date().toISOString().slice(0, 10) }
    });
    
    // Get a sample document
    const sample = await Fire.findOne().lean();
    
    return NextResponse.json({
      success: true,
      connection: 'OK',
      collection: 'test',
      totalRecords: totalCount,
      todayRecords: recentCount,
      sampleRecord: sample,
      message: 'MongoDB connection and collection access working'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'MongoDB connection test failed'
      },
      { status: 500 }
    );
  }
}