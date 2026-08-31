import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Fire } from '@/lib/models/Fire';

// Fetch new fire data from NASA FIRMS API and save to MongoDB
export async function POST() {
  try {
    await connectDB();
    
    // Using NASA FIRMS API with your API key
    const NASA_API_KEY = process.env.NASA_FIRMS_API_KEY;
    if (!NASA_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'NASA API key not configured' },
        { status: 500 }
      );
    }

    // NASA FIRMS API URL for global active fires (last 24 hours)
    const NASA_URL = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_API_KEY}/MODIS_NRT/-180,-90,180,90/1`;
    
    console.log('Fetching data from NASA FIRMS API...');
    const response = await fetch(NASA_URL);
    
    if (!response.ok) {
      throw new Error(`NASA API responded with status: ${response.status}`);
    }
    
    const csvText = await response.text();
    console.log('CSV data length:', csvText.length);
    
    if (csvText.includes('No active fires found')) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active fires found in the last 24 hours',
        count: 0
      });
    }
    
    // Parse CSV data
    const lines = csvText.split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    console.log('CSV Header:', header);
    console.log('Data lines count:', dataLines.length);
    
    const newFires = [];
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const fields = line.split(',');
      
      // NASA FIRMS CSV format: latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
      if (fields.length >= 13) {
        const [lat, lng, brightness, scan, track, acq_date, acq_time, satellite, confidence, version, bright_t31, frp, daynight] = fields;
        
        if (lat && lng && brightness && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
          newFires.push({
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            brightness: parseFloat(brightness) || 0,
            confidence: isNaN(parseFloat(confidence)) ? confidence : parseFloat(confidence),
            satellite: satellite || '',
            acq_date: acq_date || '',
            acq_time: acq_time || '',
            frp: frp && !isNaN(parseFloat(frp)) ? parseFloat(frp) : undefined,
            scan: parseFloat(scan) || 0,
            track: parseFloat(track) || 0,
            version: version || '',
            bright_t31: parseFloat(bright_t31) || 0,
            daynight: daynight || 'D',
          });
        }
      }
    }
    
    console.log('Parsed fires count:', newFires.length);
    
    if (newFires.length > 0) {
      // Clear old data and insert new data
      await Fire.deleteMany({});
      const insertResult = await Fire.insertMany(newFires);
      console.log(`Successfully inserted ${insertResult.length} fire records into MongoDB`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Successfully updated ${insertResult.length} fire records`,
        count: insertResult.length,
        sampleData: newFires.slice(0, 3) // Return first 3 records as sample
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'No valid fire data found to insert',
        count: 0
      });
    }
    
  } catch (error) {
    console.error('Error fetching/saving fire data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch new fire data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}