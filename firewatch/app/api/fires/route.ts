import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Fire } from '@/lib/models/Fire';

// Get all fire data from MongoDB
export async function GET() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected to MongoDB');
    
  
    console.log('Fetching fire data from MongoDB...');
    const fires = await Fire.find({})
      .sort({ acq_date: -1, acq_time: -1 })
      .lean();

    console.log(`Found ${fires.length} fire records in MongoDB`);
    
    // Log sample data
    if (fires.length > 0) {
      console.log('Sample fire data:', fires[0]);
    }

    return NextResponse.json({ 
      success: true, 
      data: fires,
      count: fires.length,
      message: `Retrieved ${fires.length} fire records from MongoDB`
    });
    
  } catch (error) {
    console.error('Error fetching fires:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch fire data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}