# 🔥 FIREWATCH Backend

**Next.js full-stack application for forest fire detection and management.**

---

## Overview

This is the backend and web frontend for FIREWATCH, built with **Next.js 14**. It handles:

- 🗄️ **API Routes** - RESTful endpoints for fire incidents, sensors, alerts
- 🌐 **Web Dashboard** - Real-time monitoring and incident management
- 🔐 **Authentication** - Secure user authentication with NextAuth.js
- 💾 **Database** - MongoDB for storing incidents, sensors, and users
- 📡 **Real-time Updates** - Socket.io for live event streaming
- 📊 **Analytics** - Fire statistics, heat maps, response tracking

---

## Features

| Feature | Description |
|---------|-------------|
| **User Authentication** | Secure login for officials and citizens |
| **Dashboard** | Real-time fire incidents and sensor status |
| **Incident Reporting** | Create, update, and track fire reports |
| **Sensor Management** | Monitor IoT sensor network health |
| **Alert System** | Multi-channel notifications (SMS, email, push) |
| **Analytics** | Historical data, trends, and statistics |
| **Maps Integration** | Mapbox/Google Maps for incident location |
| **Real-time Updates** | Socket.io for live event streaming |
| **Admin Panel** | User management and system configuration |

---

## Tech Stack

### Core
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm

### Frontend
- **UI Library**: React 18
- **Styling**: Tailwind CSS / CSS Modules
- **State Management**: React Context / Zustand
- **HTTP Client**: Axios / Fetch API
- **Maps**: Mapbox GL / Google Maps API

### Backend
- **API**: Next.js API Routes (RESTful)
- **Database**: MongoDB Atlas
- **ORM**: Mongoose
- **Authentication**: NextAuth.js
- **Validation**: Zod / Yup

### Real-time
- **WebSocket**: Socket.io
- **Events**: NodeJS EventEmitter

### Deployment
- **Platform**: Vercel (Recommended)
- **Alternative**: AWS, DigitalOcean, Heroku
- **CI/CD**: GitHub Actions

---

## Project Structure

```
firewatch/
├── app/                           # Next.js App Directory
│   ├── api/                       # API routes
│   │   ├── auth/                  # Authentication endpoints
│   │   ├── incidents/             # Fire incident endpoints
│   │   ├── sensors/               # Sensor management
│   │   ├── alerts/                # Alert notifications
│   │   └── analytics/             # Statistics and analytics
│   ├── dashboard/                 # Main dashboard page
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   ├── globals.css                # Global styles
│   └── favicon.ico
│
├── lib/                           # Utilities and Helpers
│   ├── mongodb.ts                 # MongoDB connection
│   ├── auth.ts                    # Authentication helpers
│   ├── validators.ts              # Input validation
│   └── utils.ts                   # Common utilities
│
├── components/                    # React Components
│   ├── Dashboard.tsx              # Main dashboard
│   ├── IncidentCard.tsx           # Incident display
│   ├── SensorList.tsx             # Sensor monitoring
│   ├── AlertBanner.tsx            # Alert notifications
│   └── Map.tsx                    # Map visualization
│
├── models/                        # Mongoose Models
│   ├── Incident.ts                # Fire incident schema
│   ├── Sensor.ts                  # IoT sensor schema
│   ├── User.ts                    # User profile schema
│   ├── Alert.ts                   # Alert schema
│   └── Report.ts                  # Incident report schema
│
├── public/                        # Static assets
│   ├── images/                    # Images and icons
│   └── styles/                    # Additional stylesheets
│
├── .env.local                     # Environment variables (NOT in git)
├── .env.example                   # Example env file
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript config
├── package.json                   # Dependencies
└── README.md                      # This file
```

---

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/firewatch?retryWrites=true&w=majority

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# APIs
MAPBOX_TOKEN=your_mapbox_token
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Email Service (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Service (for alerts)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# AWS (optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account (cloud database)
- Mapbox account (maps)
- Email service (Gmail, SendGrid, etc.)

### Step 1: Install Dependencies

```bash
cd firewatch
npm install
```

### Step 2: Configure Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Step 3: Database Setup

The MongoDB connection is configured in `lib/mongodb.ts`. Collections will be created automatically using Mongoose models.

### Step 4: Run Development Server

```bash
npm run dev
```

The server will start at **http://localhost:3000**

### Step 5: Access the Application

- **Dashboard**: http://localhost:3000/dashboard
- **Home**: http://localhost:3000
- **API Docs**: http://localhost:3000/api (if implemented)

---

## Building for Production

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session

### Incidents
- `GET /api/incidents` - List all fire incidents
- `GET /api/incidents/:id` - Get specific incident
- `POST /api/incidents` - Create new incident
- `PATCH /api/incidents/:id` - Update incident
- `DELETE /api/incidents/:id` - Delete incident

### Sensors
- `GET /api/sensors` - List all sensors
- `GET /api/sensors/:id` - Get sensor details
- `POST /api/sensors` - Register new sensor
- `PATCH /api/sensors/:id` - Update sensor
- `GET /api/sensors/:id/data` - Get sensor readings

### Alerts
- `GET /api/alerts` - List all alerts
- `POST /api/alerts` - Create new alert
- `PATCH /api/alerts/:id/acknowledge` - Acknowledge alert
- `GET /api/alerts/active` - Active alerts only

### Analytics
- `GET /api/analytics/summary` - Overall statistics
- `GET /api/analytics/incidents/trend` - Incident trends
- `GET /api/analytics/hotspots` - Fire hotspots
- `GET /api/analytics/response-time` - Average response time

---

## Database Models

### Incident Schema
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  severity: Enum['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  status: Enum['REPORTED', 'CONFIRMED', 'ACTIVE', 'CONTAINED', 'RESOLVED'],
  reportedAt: Date,
  detectedAt: Date,
  fireProperties: {
    temperature: Number,
    spreadRate: Number,
    windSpeed: Number,
    affectedArea: Number
  },
  responders: [ObjectId],
  sensors: [ObjectId],
  evidence: [String],
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Sensor Schema
```javascript
{
  _id: ObjectId,
  sensorId: String,
  name: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  sensorType: Enum['TEMPERATURE', 'SMOKE', 'GAS', 'THERMAL'],
  status: Enum['ACTIVE', 'INACTIVE', 'ERROR'],
  lastReading: {
    value: Number,
    unit: String,
    recordedAt: Date
  },
  battery: Number,
  connectivity: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### User Schema
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  role: Enum['CITIZEN', 'OFFICIAL', 'ADMIN'],
  location: String,
  phone: String,
  verified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Scripts

Run these commands from the `firewatch/` directory:

```bash
# Development
npm run dev           # Start dev server with hot reload

# Production
npm run build         # Build for production
npm start             # Start production server

# Testing
npm run test          # Run tests
npm run test:watch   # Run tests in watch mode

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues

# Database
npm run db:seed      # Seed database with sample data
npm run db:migrate   # Run database migrations
```

---

## Key Features Explained

### 1. Real-time Incident Dashboard
- Shows active fire incidents on a map
- Live status updates via Socket.io
- Severity indicators and response teams
- Historical incident tracking

### 2. Sensor Monitoring
- Real-time sensor data visualization
- Battery and connectivity status
- Temperature and smoke readings
- Automated alerts when thresholds exceeded

### 3. Alert System
- Multi-channel notifications (SMS, email, push)
- Customizable alert rules
- Acknowledgment tracking
- Alert history and reports

### 4. Analytics & Reporting
- Fire incident statistics
- Response time metrics
- Hotspot identification
- Trend analysis and forecasting

---

## Troubleshooting

### MongoDB Connection Issues
**Error**: `ECONNREFUSED` or connection timeout

**Solution**:
1. Verify MongoDB URI in `.env.local` doesn't have quotes
2. Remove quotes: `MONGODB_URI=mongodb+srv://...` (NOT `"mongodb+srv://..."`)
3. Check MongoDB Atlas IP whitelist includes your IP
4. Test connection: `mongodb+srv://user:password@cluster.mongodb.net/test`

### Authentication Errors
**Error**: `NextAuth session not found`

**Solution**:
1. Ensure `NEXTAUTH_SECRET` is set in `.env.local`
2. Set `NEXTAUTH_URL=http://localhost:3000` for local development
3. Clear browser cookies and try again
4. Check NextAuth configuration in `lib/auth.ts`

### Maps Not Loading
**Error**: "Mapbox GL requires a valid access token"

**Solution**:
1. Get token from https://mapbox.com
2. Add to `.env.local`: `MAPBOX_TOKEN=pk_...`
3. Set it in map component initialization
4. Verify token has map viewing permissions

---

## Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Create Pull Request

---

## Performance Tips

- Use Next.js Image component for images
- Implement code splitting with dynamic imports
- Cache API responses appropriately
- Use Socket.io namespaces for organized real-time communication
- Monitor bundle size: `npm run analyze`

---

## Security Considerations

- ✅ Use HTTPS in production
- ✅ Implement rate limiting on API endpoints
- ✅ Validate and sanitize all user inputs
- ✅ Use environment variables for sensitive data
- ✅ Implement CORS properly
- ✅ Regular security audits and updates

---

## Support & Resources

- **Documentation**: https://firewatch-docs.dev
- **GitHub Issues**: Report bugs and feature requests
- **Community Forum**: https://forum.firewatch.dev
- **Email**: support@firewatch.dev

---

## License

MIT License - See LICENSE file for details

---

**Building smarter forest fire management, one API at a time.**

🚀 *FIREWATCH Backend: Powering intelligent fire response.*

