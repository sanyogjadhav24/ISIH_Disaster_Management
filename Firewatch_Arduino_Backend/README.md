# 📊 Arduino Sensor Backend - IoT Data Aggregation Server

**Node.js backend for collecting, storing, and processing sensor data from distributed Arduino IoT nodes.**

---

## Overview

The Arduino Backend is a **lightweight Node.js server** that:

- 📡 **Receives sensor data** from Arduino nodes via HTTP POST
- 💾 **Stores readings** in MongoDB for historical analysis
- 📈 **Aggregates data** from multiple sensors across forest zones
- 🚨 **Triggers alerts** when sensor values exceed thresholds
- 📊 **Provides APIs** for dashboard queries and analytics
- 📅 **Manages time-series data** with timestamps for trend analysis

The backend sits between distributed sensor hardware (Arduino) and the main FIREWATCH platform.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Node Support** | Handle 100+ concurrent sensor nodes |
| **Data Persistence** | MongoDB time-series collection |
| **RESTful API** | Simple HTTP endpoints for sensor data |
| **Threshold Detection** | Automatic alert generation on high values |
| **Data Validation** | Input validation and sanitization |
| **Timestamp Recording** | Server-side timestamps for consistency |
| **Error Handling** | Graceful error responses and logging |
| **CORS Support** | Cross-origin requests from web apps |
| **Health Checks** | Status endpoint for monitoring |
| **Rate Limiting** | Optional request throttling (future) |

---

## Tech Stack

### Runtime & Framework
- **Runtime**: Node.js 14.0+
- **Framework**: Express.js 4.x
- **Language**: JavaScript (ES6+)

### Database
- **Primary**: MongoDB Atlas (cloud)
- **Connection**: MongoDB Node.js driver
- **Database**: ForestFireDB
- **Collections**: LiveStatus, HistoricalData

### Utilities
- **CORS**: cors 2.8.5+ (cross-origin requests)
- **Body Parser**: express.json() (built-in)
- **Environment**: dotenv (.env configuration)

### Deployment
- **Server**: Ubuntu 20.04 LTS or Cloud Functions
- **Port**: 5000 (configurable)
- **Docker**: Optional containerization

---

## Project Structure

```
Firewatch_Arduino_Backend/
├── index.js              # Main server file
├── package.json          # Project metadata & dependencies
├── package-lock.json     # Dependency lock file
├── .env                  # Configuration (create manually)
├── .env.example         # Example environment variables
├── .gitignore           # Git exclusion rules
└── README.md            # This documentation

Directory Breakdown:
- index.js (125 lines): Express app, MongoDB connection, routes
- Node modules: ~500+ packages (created after npm install)
```

---

## Installation & Setup

### Prerequisites
- Node.js 14.0+
- npm 6.0+
- MongoDB Atlas account (free tier available)
- Terminal/command line access

### Step 1: Clone & Install Dependencies

```bash
cd Firewatch_Arduino_Backend

npm install
```

This installs packages listed in `package.json`:
- express
- cors
- mongodb
- dotenv

### Step 2: Create Environment Variables

Create `.env` file in project root:

```bash
# .env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?appName=Cluster0
PORT=5000
NODE_ENV=development
LOG_LEVEL=debug
```

**Get MongoDB URI:**
1. Go to [MongoDB Atlas Dashboard](https://account.mongodb.com/account/login)
2. Create cluster (free tier)
3. Click "Connect" → "Connect your application"
4. Copy connection string
5. Replace `<password>` with actual password
6. Replace `<username>` with created username

### Step 3: Verify MongoDB Connection

```bash
# Test the connection
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb+srv://...';
const client = new MongoClient(uri);
client.connect().then(() => {
  console.log('✓ Connected to MongoDB');
  process.exit(0);
}).catch(err => {
  console.error('✗ Connection failed:', err.message);
  process.exit(1);
});
"
```

### Step 4: Start Server

```bash
# Development (with auto-restart)
npm run dev

# Or production
npm start

# Expected output:
# Connected to MongoDB
# Server running on http://localhost:5000
```

---

## Configuration

### Environment Variables

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ForestFireDB

# Server Configuration
PORT=5000                        # Listen port
NODE_ENV=development            # development or production
LOG_LEVEL=debug                 # Logging verbosity

# Rate Limiting (optional)
RATE_LIMIT_WINDOW=600000        # 10 minutes in ms
RATE_LIMIT_MAX_REQUESTS=1000    # Max requests per window

# Alert Thresholds
MQ4_ALERT_THRESHOLD=2500
MQ7_ALERT_THRESHOLD=1900
MQ135_ALERT_THRESHOLD=8000

# Notifications (optional)
ALERT_EMAIL=admin@firewatch.dev
ALERT_SMS_API_KEY=your_key_here
```

### Database Configuration

```javascript
// In index.js, modify MongoDB connection:
const uri = process.env.MONGODB_URI || 
  "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri);
const db = client.db("ForestFireDB");  // Database name
```

---

## API Endpoints

### 1. Health Check

```http
GET /
```

**Response:**
```json
{
  "status": "Server is running",
  "timestamp": "2024-04-05T10:30:00Z"
}
```

---

### 2. Receive Sensor Data

```http
POST /sensor-data
Content-Type: application/json

{
  "mq4": 523,
  "mq7": 412,
  "mq135": 1203,
  "latitude": 18.2704,
  "longitude": 73.5186,
  "status": "IDLE"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mq4 | number | Yes | Gas sensor reading (0-4095) |
| mq7 | number | Yes | CO sensor reading (0-4095) |
| mq135 | number | Yes | Air quality reading (0-4095) |
| latitude | number | Yes | GPS latitude (-90 to 90) |
| longitude | number | Yes | GPS longitude (-180 to 180) |
| status | string | No | "IDLE" or "ACTIVE" |

**Successful Response (201):**
```json
{
  "message": "Data saved successfully",
  "id": "640a8f3c9e5c1a2b3c4d5e6f"
}
```

**Error Response (400/500):**
```json
{
  "error": "Missing required field: mq4"
}
```

---

### 3. Get Latest Readings

```http
GET /sensor-data/latest?limit=10
```

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 100)
- `status` (optional): Filter by "ACTIVE" or "IDLE"
- `hours` (optional): Return data from last N hours

**Response:**
```json
{
  "count": 10,
  "data": [
    {
      "_id": "640a8f3c9e5c1a2b3c4d5e6f",
      "mq4": 523,
      "mq7": 412,
      "mq135": 1203,
      "latitude": 18.2704,
      "longitude": 73.5186,
      "status": "IDLE",
      "timestamp": "2024-04-05T10:30:00Z"
    }
  ]
}
```

---

### 4. Get Time-Series Data

```http
GET /sensor-data/history?days=7
```

**Parameters:**
- `days`: Historical period (1-30)
- `zone`: Optional zone filter
- `metric`: Optional ("mq4", "mq7", "mq135")

**Response:**
```json
{
  "period": "7 days",
  "data_points": [
    {
      "date": "2024-03-29",
      "mq4_avg": 450,
      "mq7_avg": 380,
      "mq135_avg": 1100,
      "max_alert": 0
    },
    {
      "date": "2024-03-30",
      "mq4_avg": 485,
      "mq7_avg": 410,
      "mq135_avg": 1250,
      "max_alert": 1
    }
  ]
}
```

---

### 5. Get Alerts

```http
GET /alerts?status=active
```

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert_001",
      "timestamp": "2024-04-05T10:30:00Z",
      "type": "HIGH_MQ7",
      "value": 2450,
      "threshold": 1900,
      "location": {
        "lat": 18.2704,
        "lng": 73.5186
      },
      "status": "active"
    }
  ]
}
```

---

## MongoDB Collections

### LiveStatus Collection

```javascript
db.LiveStatus.insertOne({
  mq4: 523,
  mq7: 412,
  mq135: 1203,
  latitude: 18.2704,
  longitude: 73.5186,
  status: "IDLE",
  timestamp: ISODate("2024-04-05T10:30:00Z")
})
```

**Indexes (for performance):**
```javascript
// Create indexes in MongoDB
db.LiveStatus.createIndex({ "timestamp": -1 })
db.LiveStatus.createIndex({ "status": 1, "timestamp": -1 })
db.LiveStatus.createIndex({ "latitude": 1, "longitude": 1 })
```

### Alerts Collection

```javascript
db.Alerts.insertOne({
  type: "HIGH_MQ7",
  value: 2450,
  threshold: 1900,
  sensor_id: "node_01",
  location: {
    latitude: 18.2704,
    longitude: 73.5186
  },
  timestamp: ISODate("2024-04-05T10:35:00Z"),
  acknowledged: false
})
```

---

## Usage Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';

// Send sensor data
async function sendSensorData(sensorReading) {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/sensor-data`,
      {
        mq4: sensorReading.mq4,
        mq7: sensorReading.mq7,
        mq135: sensorReading.mq135,
        latitude: sensorReading.lat,
        longitude: sensorReading.lng,
        status: sensorReading.status
      }
    );
    console.log('Sent:', response.data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Query latest readings
async function getLatestReadings() {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/sensor-data/latest?limit=50`
    );
    console.log('Latest readings:', response.data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
```

### cURL

```bash
# Send sensor data
curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "mq4": 523,
    "mq7": 412,
    "mq135": 1203,
    "latitude": 18.2704,
    "longitude": 73.5186,
    "status": "IDLE"
  }'

# Get latest readings
curl http://localhost:5000/sensor-data/latest?limit=10

# Get alerts
curl http://localhost:5000/alerts?status=active
```

### Python

```python
import requests
import json

BACKEND_URL = 'http://localhost:5000'

# Send sensor data
sensor_data = {
    'mq4': 523,
    'mq7': 412,
    'mq135': 1203,
    'latitude': 18.2704,
    'longitude': 73.5186,
    'status': 'IDLE'
}

response = requests.post(
    f'{BACKEND_URL}/sensor-data',
    json=sensor_data
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

---

## Data Processing & Analytics

### Aggregation Pipeline (MongoDB)

```javascript
// Get average readings per hour
db.LiveStatus.aggregate([
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" }
      },
      avg_mq4: { $avg: "$mq4" },
      avg_mq7: { $avg: "$mq7" },
      avg_mq135: { $avg: "$mq135" },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: -1 } },
  { $limit: 24 }
])
```

### Alert Trigger Logic

```javascript
// Triggered when sensor values exceed thresholds:
if (mq4 > 2500 || mq7 > 1900 || mq135 > 8000) {
  // Create alert
  db.Alerts.insertOne({
    type: "FIRE_ALERT",
    severity: "HIGH",
    timestamp: new Date(),
    triggered_by: sensor_id,
    values: { mq4, mq7, mq135 }
  });
  
  // Notify FIREWATCH main system
  notifyIncidentCreation({
    latitude,
    longitude,
    sensor_values: { mq4, mq7, mq135 }
  });
}
```

---

## Integration with FIREWATCH System

### Data Flow

```
Arduino Nodes
    ↓
    └─→ HTTP POST /sensor-data
           ↓
    Arduino Backend (index.js)
           ↓
           ├─→ Validate & Store (MongoDB)
           ├─→ Check Thresholds
           └─→ Create Alerts
                ↓
         FIREWATCH Main System
            ↓
    (Dashboard, 3D Sim, Notifications)
```

### Incident Creation Trigger

```javascript
// When alert generated, notify FIREWATCH backend
async function createIncident(sensorData) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/incidents',  // FIREWATCH backend
      {
        type: 'sensor_detection',
        timestamp: new Date(),
        location: {
          latitude: sensorData.latitude,
          longitude: sensorData.longitude,
          source: 'arduino_sensor'
        },
        sensor_readings: {
          mq4: sensorData.mq4,
          mq7: sensorData.mq7,
          mq135: sensorData.mq135
        }
      }
    );
    console.log('Incident created:', response.data.incident_id);
  } catch (err) {
    console.error('Failed to create incident:', err.message);
  }
}
```

---

## Deployment

### Local Development

```bash
npm run dev
# Runs on http://localhost:5000
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t firewatch-arduino-backend .
docker run -p 5000:5000 -e MONGODB_URI="..." firewatch-arduino-backend
```

### Cloud Deployment (Google Cloud Run)

```bash
gcloud run deploy firewatch-arduino \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars MONGODB_URI="mongodb+srv://..."
```

### Heroku Deployment

```bash
heroku create firewatch-arduino
heroku config:set MONGODB_URI="mongodb+srv://..."
git push heroku main
```

---

## Troubleshooting

### MongoDB Connection Error

```
Error: MongoNetworkError
Solution:
1. Verify MongoDB_URI in .env
2. Whitelist IP address in MongoDB Atlas
3. Check cluster is running
4. Verify username/password
```

### Server Not Starting

```
Error: Port 5000 already in use
Solution:
1. Kill process: lsof -i :5000 | awk 'NR!=1 {print $2}' | xargs kill
2. Or change PORT in .env to 5001
3. Or: netstat -ano | findstr :5000 (Windows)
```

### Sensor Data Not Saving

```
Symptom: POST returns 500 error
Solution:
1. Check MongoDB connected: "Connected to MongoDB" in logs
2. Verify data schema matches expectations
3. Check request body has all required fields
4. Monitor server logs: npm run dev
```

### High Latency/Timeouts

```
Symptom: Requests taking > 5 seconds
Solution:
1. Check MongoDB connection quality
2. Add indexes to collection
3. Implement connection pooling
4. Scale MongoDB resources
```

---

## Performance Optimization

### Indexing Strategy

```javascript
// Create these indexes in MongoDB
db.LiveStatus.createIndex({ timestamp: -1 });
db.LiveStatus.createIndex({ status: 1, timestamp: -1 });
db.LiveStatus.createIndex({ latitude: 1, longitude: 1 });
db.Alerts.createIndex({ timestamp: -1 });
db.Alerts.createIndex({ acknowledged: 1, timestamp: -1 });
```

### Connection Pooling

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  minPoolSize: 5
});
```

### Response Caching (Future)

```javascript
const cache = new Map();

app.get('/sensor-data/latest', (req, res) => {
  const cacheKey = 'latest_readings';
  
  if (cache.has(cacheKey)) {
    cache.get(cacheKey);  // Return cached
  }
  
  // Otherwise fetch and cache
});
```

---

## Monitoring & Logging

### Health Check Monitoring

```bash
# Monitor server health every 30 seconds
while true; do
  curl http://localhost:5000/health
  sleep 30
done
```

### Enable Detailed Logging

```javascript
// In index.js
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

if (LOG_LEVEL === 'debug') {
  console.log('[DEBUG] Request body:', req.body);
  console.log('[DEBUG] MongoDB insert result:', result);
}
```

---

## Future Enhancements

- 🔐 **Authentication** - API key or JWT validation
- 📊 **Analytics dashboard** - Chart and graph endpoints
- 🎯 **Anomaly detection** - ML-based outlier alerts
- 📡 **WebSockets** - Real-time data streaming
- 🔄 **Data sync** - Handle offline sensor buffering
- 📈 **Batch import** - Historical data upload
- 🎛️ **Dynamic thresholds** - ML-based smart alerts

---

## License

MIT License - See LICENSE file for details

---

## References

- **Express.js Docs**: https://expressjs.com/
- **MongoDB Node.js Driver**: https://www.mongodb.com/docs/drivers/node/
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

## Support

- **GitHub Issues**: Report bugs and feature requests
- **Email**: support@firewatch.dev
- **Documentation**: https://firewatch-docs.dev/arduino-backend

---

**Real-time sensor intelligence for proactive fire detection.**

📊 *FIREWATCH Backend: Turning sensor data into actionable insights.*
