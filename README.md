# 🔥 FIREWATCH

**An AI-powered forest fire detection, prediction, and response platform.**

---

## Description

Forests do not scream, but they whisper. FIREWATCH is designed to hear those whispers before they become disasters.

FIREWATCH combines AI, machine learning, IoT mesh networking, and existing surveillance hardware to detect early fire indicators such as heat anomalies, smoke, gas concentration, and visual warning signals. The system is built to reduce detection delay, improve reporting quality, and support faster mitigation.

---

## Problem Statement

### The Challenge
Forest fires must be detected within a critical time window. If detection is delayed, control becomes extremely difficult.

Today, many wildfire incidents remain undetected in their early stages. This causes major damage to:

- **Wildlife**: Habitat destruction and species loss
- **Vegetation**: Forest degradation and ecosystem collapse
- **Human life**: Deaths and injuries of citizens and responders
- **Public and private property**: Infrastructure damage and economic loss

**In India alone**, approximately **100,000 hectares** of forest are affected by natural fires every year. Existing systems are often manual and reactive, with little or no technology-assisted early warning.

### Why Existing Solutions Fall Short

Current approaches in many regions depend heavily on:
- Manual observation and delayed reporting
- Lack of intelligent sensing and prediction
- No real-time communication infrastructure
- Late response initiation leading to rapid fire spread

---

## Our Solution: FIREWATCH

FIREWATCH is an intelligent, proactive solution supported by:

- ✅ **AI and ML models** for detection and prediction
- ✅ **IoT mesh sensor networks** for resilience and continuity
- ✅ **Computer vision on existing CCTV** infrastructure
- ✅ **Multi-channel alerting** for citizens and authorities
- ✅ **3D disaster simulation** for planning and training

The platform is structured around a **three-pronged approach**.

---

## Solution Architecture

### 1️⃣ Detection and Prediction

FIREWATCH integrates methane, carbon monoxide, and gas sensors with advanced ML models to detect and predict fire risk.

**Key Features:**
- **Real-time sensor monitoring**: Methane, CO, temperature, and humidity tracking
- **ML-based anomaly detection**: Identifies early-stage fire patterns
- **Mesh network architecture**: Nodes relay alerts even if one fails due to fire damage
- **Fault-tolerant design**: Ensures connectivity in harsh conditions
- **Predictive modeling**: ML models forecast fire spread and risk zones

**Technologies:**
- Python (Flask/FastAPI)
- TensorFlow/PyTorch for ML models
- MQTT for sensor communication
- PostgreSQL for time-series data

---

### 2️⃣ Alerting and Reporting

FIREWATCH supports **three reporting methods** for maximum coverage and accessibility:

#### A) Mobile App - Manual Reporting
- **Evidence capture** using device camera
- **Context attachment**: Fire description, priority level, location
- **Auto-localization**: GPS-based location detection
- **AI validation**: Two-tier submission with ML-based pre-verification

**Technologies:**
- React Native / Flutter
- GPS/GIS integration
- Firebase Cloud Messaging (FCM)

#### B) CCTV-Based Automated Detection
- **YOLOv8 models** deployed on existing CCTV feeds
- **Real-time object detection**: Smoke, flame, and fire event identification
- **Intensity monitoring**: Tracks fire spread and severity
- **Automated alerting**: No human intervention needed

**Technologies:**
- YOLOv8 (Ultralytics)
- OpenCV
- Real-time stream processing
- FFmpeg for video handling

#### C) Mapboard Gesture Recognition (Low-Connectivity Zones)
- **Physical mapboard interface** in forest sanctuary offices
- **Gesture detection**: User points to fire location on map
- **Automatic geocoding**: Converts gesture to GPS coordinates
- **Report forwarding**: Direct transmission to authorities

**Technologies:**
- Computer vision (gesture detection)
- Map projection algorithms
- Gesture recognition (MediaPipe/TensorFlow.js)

---

### 3️⃣ Mitigation and Awareness

FIREWATCH focuses on preparedness and public safety:

- 📢 **Public awareness** campaigns for early fire reporting and safety behavior
- 👨‍🏫 **Training support** for forest officials and response teams
- 🎮 **Incident simulation exercises** using the 3D disaster simulation
- 📊 **Real-time dashboards** tracking active incidents and response status
- 📡 **Multi-channel alerts** (SMS, push, email, sirens)

---

## Overall Tech Stack

### Backend
- **Framework**: Next.js 14 (TypeScript)
- **Runtime**: Node.js 18+
- **Database**: MongoDB Atlas (Cloud)
- **Authentication**: NextAuth.js
- **APIs**: RESTful with GraphQL support
- **Real-time**: Socket.io for live updates
- **Hosting**: Vercel / AWS

### Frontend (Web)
- **Framework**: Next.js React
- **UI Components**: Material-UI / Shadcn/ui
- **Maps**: Mapbox GL / Google Maps API
- **Real-time**: Socket.io client
- **State Management**: Redux Toolkit / Zustand

### Mobile (Future)
- **Framework**: React Native / Flutter
- **Maps**: Google Maps SDK
- **Camera**: Native camera access
- **Push Notifications**: Firebase Cloud Messaging

### AI/ML
- **Detection Models**: YOLOv8, Custom CNNs
- **Prediction Models**: LSTM, Prophet, Random Forest
- **Framework**: TensorFlow, PyTorch, scikit-learn
- **Language**: Python 3.10+
- **Inference**: ONNX, TensorFlow Lite

### IoT & Sensors
- **Protocol**: MQTT (Mosquitto broker)
- **Hardware**: Arduino, Raspberry Pi
- **Sensors**: MQ-2, MQ-7, DHT22, thermal cameras
- **Network**: LoRaWAN mesh (fault-tolerant)

### 3D Simulation & Visualization
- **Engine**: Three.js (WebGL)
- **Physics**: Cannon.js
- **Rendering**: 3D forest, fire propagation, evacuation simulation
- **Audio**: Web Audio API (siren synthesis)
- **Particle System**: Custom fire/smoke/ember effects

### DevOps & Infrastructure
- **Version Control**: Git / GitHub
- **CI/CD**: GitHub Actions
- **Container**: Docker
- **Orchestration**: Kubernetes (optional)
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK Stack

---

## Features Overview

### Core Features
| Feature | Description | Status |
|---------|-------------|--------|
| **Real-time Sensor Network** | IoT mesh network for environmental monitoring | ✅ Active |
| **AI Fire Detection** | ML models detecting early fire indicators | ✅ Active |
| **Mobile Reporting App** | User-friendly app for manual fire reports | ✅ In Development |
| **CCTV AI Integration** | YOLOv8 deployed on existing surveillance | ✅ Testing |
| **Automated Alerting** | Multi-channel notifications (SMS, push, email) | ✅ Active |
| **3D Disaster Simulation** | Interactive training and planning tool | ✅ Complete |
| **Dashboard & Analytics** | Real-time incident tracking and statistics | ✅ In Development |
| **Mapboard Gestures** | Point-and-report for low-tech zones | 🔄 Planned |
| **Fire Spread Prediction** | ML-based forecasting of fire trajectory | 🔄 Planned |

### 3D Simulation Features
- 🌲 **Forest Generation**: 600+ procedurally generated trees
- 🏘️ **City Population**: 140 AI-controlled NPCs with evacuation behavior
- 🔥 **Fire Propagation**: Realistic fire spread with wind influence
- 📡 **Sensor Network**: 14 distributed sensors activating on fire detection
- 🚨 **Evacuation System**: People pathfinding to 3 safe zones
- 🔊 **Audio Alerts**: Procedural siren synthesis via Web Audio API
- 🎮 **Interactive Controls**: Drag-rotate, scroll-zoom, WASD pan camera
- 📊 **Real-time Statistics**: Tree count, sensor status, evacuation tracking

---

## Project Structure

```
Tesseract_FireWatch/
├── README.md                 # Main project documentation
├── firewatch/                # Next.js backend & frontend
│   ├── app/                  # Next.js app directory
│   ├── lib/                  # Utilities and helpers
│   ├── public/               # Static assets
│   ├── README.md             # Backend documentation
│   └── package.json          # Dependencies
├── 3-D_Simulation/           # Three.js 3D disaster simulation
│   ├── index.html            # Main HTML entry
│   ├── simulation.js         # Core simulation logic
│   ├── utils.js              # Utility functions
│   ├── README.md             # Simulation documentation
│   └── assets/               # 3D models and textures
└── docs/                     # Additional documentation
    ├── ARCHITECTURE.md       # System design
    ├── INSTALLATION.md       # Setup guide
    └── API.md                # API documentation
```

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (for ML/IoT)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Tesseract_FireWatch.git
   cd Tesseract_FireWatch
   ```

2. **Install backend dependencies**
   ```bash
   cd firewatch
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your MongoDB URI and API keys
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000 in your browser

6. **Run 3D Simulation**
   ```bash
   cd ../3-D_Simulation
   # Serve using Python
   python -m http.server 8000
   # Or use Node.js
   npx http-server
   # Open http://localhost:8000 or http://localhost:8080
   ```

---

## Documentation

Detailed documentation for each component:

- **[Backend Setup](./firewatch/README.md)** - Next.js backend configuration and API
- **[3D Simulation](./3-D_Simulation/README.md)** - Three.js visualization and controls
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and data flow
- **[API Reference](./docs/API.md)** - Complete API endpoints

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Team & Contact

**Project Lead**: TESSERACT Team

For questions, suggestions, or bug reports:
- Open an issue on GitHub
- Contact: support@firewatch.dev
- Documentation: https://firewatch-docs.dev

---

## Acknowledgments

- Forest research institutions for domain expertise
- IoT community for mesh network insights
- ML researchers for fire detection algorithms
- Open-source communities (Three.js, TensorFlow, etc.)

---

**Protecting forests. Saving lives. Building resilience.**

🌍 *FIREWATCH: Hear the forest's whispers before they become screams.*
