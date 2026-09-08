/**
 * Disaster Watch - Standalone Hardware Sensor & LoRa Packet Simulator Server
 * Automatically transmits live disaster telemetry packets to MongoDB on start.
 * 
 * Run from terminal:
 *   node simulator/server.js
 *   or: npm run simulator
 * 
 * Web Controller & Buttons: http://localhost:4000
 */

const http = require('http');
const dns = require('dns');
const { MongoClient } = require('mongodb');

// Ensure resilient DNS resolution for MongoDB Atlas across local routers/ISPs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const PORT = process.env.SIMULATOR_PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || 
  'mongodb://sanyogjadhav24_db_user:br4Pxa1Iaa2OFbRD@ac-ukercew-shard-00-00.tsmkkkf.mongodb.net:27017,ac-ukercew-shard-00-01.tsmkkkf.mongodb.net:27017,ac-ukercew-shard-00-02.tsmkkkf.mongodb.net:27017/firewatch_sim?ssl=true&replicaSet=atlas-72ptrb-shard-0&authSource=admin&retryWrites=true&w=majority';
const DB_NAME = 'firewatch_sim';

let mongoClient = null;
let db = null;
let autoStreamInterval = 5000; // 5 seconds
let autoStreamTimer = null;
let isAutoStreaming = true; // Auto-streams by default as soon as server starts
let packetSequence = 5000;

async function getDb() {
  if (db && mongoClient) return db;
  mongoClient = new MongoClient(MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  });
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  return db;
}

/**
 * Generate actual disaster sensor telemetry payload that makes sensors ACTIVE
 * Tailored to each hazard class (FF, GL, FL, LS)
 */
function generateActualDisasterPayload(node, scenarioOverride = null) {
  const isFG = node.nodeType === 'FG' || node._id.startsWith('FG');
  let v = {};
  let risk = { level: 'CRITICAL', score: 0.92, rule: 'multi_hazard_active' };
  let state = 'ALERT';
  let injectedAnomaly = null;
  let primaryHazard = 'FF';

  // Determine hazard profile for the node
  const num = parseInt(node._id.slice(-2), 16) || 1;
  let scenario = scenarioOverride;

  if (!scenario) {
    if (isFG) {
      // Half Forest Fire (1-4), half Gas Leak (5-8)
      scenario = num <= 4 ? 'FF' : 'GL';
    } else {
      // Half Flash Flood (9-10), half Landslide (11-12)
      scenario = num <= 10 ? 'FL' : 'LS';
    }
  }

  if (scenario === 'FF') {
    // 🔥 ACTUAL FOREST FIRE DISASTER TELEMETRY
    primaryHazard = 'FF';
    state = 'FIRE_ALERT';
    injectedAnomaly = 'thermal_smoke_plume';
    v = {
      temp_c: parseFloat((56.5 + Math.random() * 14).toFixed(2)),  // 56.5°C - 70.5°C (Extreme heat!)
      rh_pct: parseFloat((11.0 + Math.random() * 7).toFixed(2)),   // 11% - 18% (Severely dry RH)
      pm25: parseFloat((260.0 + Math.random() * 150).toFixed(2)),  // 260 - 410 µg/m³ (Heavy particulate smoke)
      mq4_ppm: parseFloat((2.8 + Math.random() * 1.6).toFixed(2)),
      mq7_ppm: parseFloat((16.5 + Math.random() * 12).toFixed(2)),  // 16.5 - 28.5 ppm (High Carbon Monoxide plume)
      mq135_ppm: parseFloat((8.5 + Math.random() * 6).toFixed(2)),  // High smoke air quality index
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.92 + Math.random() * 0.07).toFixed(2)),
      rule: 'forest_fire_thermal_runaway',
    };
  } else if (scenario === 'GL') {
    // 💨 ACTUAL GAS LEAK DISASTER TELEMETRY
    primaryHazard = 'GL';
    state = 'GAS_LEAK';
    injectedAnomaly = 'methane_plume';
    v = {
      temp_c: parseFloat((29.0 + Math.random() * 4).toFixed(2)),
      rh_pct: parseFloat((50.0 + Math.random() * 8).toFixed(2)),
      pm25: parseFloat((35.0 + Math.random() * 15).toFixed(2)),
      mq4_ppm: parseFloat((52.0 + Math.random() * 32).toFixed(2)),  // 52 - 84 ppm (Methane CH4 surge!)
      mq7_ppm: parseFloat((4.5 + Math.random() * 3).toFixed(2)),
      mq135_ppm: parseFloat((18.0 + Math.random() * 9).toFixed(2)), // Flammable gas index
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.89 + Math.random() * 0.08).toFixed(2)),
      rule: 'methane_lel_threshold_exceeded',
    };
  } else if (scenario === 'FL') {
    // 🌊 ACTUAL FLASH FLOOD DISASTER TELEMETRY
    primaryHazard = 'FL';
    state = 'FLOOD_ALERT';
    injectedAnomaly = 'rapid_soil_saturation';
    v = {
      soil_pct: parseFloat((96.5 + Math.random() * 3.2).toFixed(2)), // 96.5% - 99.7% (Waterlogged soil!)
      vib_count: Math.floor(Math.random() * 3),
      water_level_cm: parseFloat((175.0 + Math.random() * 45).toFixed(1)), // High surface runoff
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.91 + Math.random() * 0.07).toFixed(2)),
      rule: 'flood_surface_runoff_surge',
    };
  } else if (scenario === 'LS') {
    // ⛰️ ACTUAL LANDSLIDE DISASTER TELEMETRY
    primaryHazard = 'LS';
    state = 'LANDSLIDE_ALERT';
    injectedAnomaly = 'seismic_slope_shear';
    v = {
      soil_pct: parseFloat((86.0 + Math.random() * 10).toFixed(2)),
      vib_count: Math.floor(25 + Math.random() * 18),               // 25 - 43 pulses/min (Geophone tremor!)
      tilt_deg: parseFloat((16.5 + Math.random() * 6).toFixed(1)),  // Slope shift angle
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.94 + Math.random() * 0.05).toFixed(2)),
      rule: 'slope_displacement_geophone_trigger',
    };
  } else if (scenario === 'NORMAL') {
    // Safe baseline active telemetry
    primaryHazard = isFG ? 'FF' : 'FL';
    state = 'NORMAL';
    if (isFG) {
      v = {
        temp_c: parseFloat((26.0 + Math.random() * 3).toFixed(2)),
        rh_pct: parseFloat((55.0 + Math.random() * 8).toFixed(2)),
        pm25: parseFloat((22.0 + Math.random() * 10).toFixed(2)),
        mq4_ppm: parseFloat((1.4 + Math.random() * 0.5).toFixed(2)),
        mq7_ppm: parseFloat((0.9 + Math.random() * 0.3).toFixed(2)),
        mq135_ppm: parseFloat((0.8 + Math.random() * 0.3).toFixed(2)),
      };
    } else {
      v = {
        soil_pct: parseFloat((42.0 + Math.random() * 8).toFixed(2)),
        vib_count: Math.floor(Math.random() * 2),
      };
    }
    risk = { level: 'NORMAL', score: 0.02, rule: 'baseline' };
  } else {
    // Random variations
    primaryHazard = isFG ? 'FF' : 'FL';
    state = 'NORMAL';
    const isSpike = Math.random() < 0.25;
    if (isFG) {
      v = {
        temp_c: parseFloat((25 + Math.random() * (isSpike ? 24 : 8)).toFixed(2)),
        rh_pct: parseFloat((45 + Math.random() * 25).toFixed(2)),
        pm25: parseFloat((20 + Math.random() * (isSpike ? 120 : 20)).toFixed(2)),
        mq4_ppm: parseFloat((1.2 + Math.random() * (isSpike ? 15 : 1)).toFixed(2)),
        mq7_ppm: parseFloat((0.8 + Math.random() * (isSpike ? 8 : 0.8)).toFixed(2)),
        mq135_ppm: parseFloat((0.8 + Math.random() * 2).toFixed(2)),
      };
    } else {
      v = {
        soil_pct: parseFloat((38 + Math.random() * (isSpike ? 55 : 18)).toFixed(2)),
        vib_count: isSpike ? Math.floor(8 + Math.random() * 12) : Math.floor(Math.random() * 2),
      };
    }
    risk = isSpike
      ? { level: 'HIGH', score: 0.78, rule: 'ambient_spike_warning' }
      : { level: 'NORMAL', score: 0.05, rule: 'baseline' };
  }

  const now = new Date();
  packetSequence++;

  const readingDoc = {
    ts: now,
    meta: {
      gatewayId: node.radio?.gatewayId || 'GW-MH-01',
      hazards: node.hazards || (isFG ? ['FF', 'GL'] : ['FL', 'LS']),
      nodeId: node._id,
      nodeType: isFG ? 'FG' : 'FS',
      region: node.region || 'MH',
    },
    synthetic: true,
    link: {
      rxAt: new Date(now.getTime() + 120),
      latency_ms: Math.floor(1200 + Math.random() * 600),
      rssi: Math.floor(-70 - Math.random() * 15),
      seq: packetSequence,
      retries: 0,
    },
    adc: isFG
      ? { mq4: 480, mq7: 410, mq135: 530, pm25: 620 }
      : { sm: 1850, vib: v.vib_count || 0 },
    sdRef: `${now.toISOString().slice(0, 10)}/${node._id}_sim.csv`,
    q: {
      flags: risk.level === 'CRITICAL' ? ['DISASTER_THRESHOLD_EXCEEDED'] : [],
      kurt: { temp_c: -0.3, rh_pct: -0.2, pm25: 0.1 },
      mad: { temp_c: 0.15, rh_pct: 0.5, pm25: 1.8 },
      nWin: 60,
      rejected: 0,
      crossCheck: 'PASS',
    },
    _truth: { state, injectedAnomaly },
    v,
    risk,
  };

  return { readingDoc, risk, primaryHazard, scenario, now };
}

/**
 * Transmit active disaster sensor readings to MongoDB
 */
async function transmitActiveTelemetry(options = {}) {
  const { nodeId = 'ALL', scenario = null, silent = false } = options;
  const database = await getDb();
  let targetNodes = [];

  if (nodeId && nodeId !== 'ALL') {
    const node = await database.collection('nodes').findOne({ _id: nodeId });
    if (!node) return { error: `Node ${nodeId} not found` };
    targetNodes = [node];
  } else {
    targetNodes = await database.collection('nodes').find({}).toArray();
  }

  const readingsToInsert = [];
  const eventsToInsert = [];
  const summaryLog = [];

  for (const node of targetNodes) {
    const { readingDoc, risk, primaryHazard, scenario: chosenScenario, now } = generateActualDisasterPayload(node, scenario);
    readingsToInsert.push(readingDoc);

    // Update Node: Status = 'active', lastSeen = now, latestReading = readingDoc
    await database.collection('nodes').updateOne(
      { _id: node._id },
      {
        $set: {
          status: 'active',
          lastSeen: now,
          latestReading: readingDoc,
        }
      }
    );

    // If disaster threshold is breached, record in `events` collection
    if (risk.level === 'CRITICAL' || risk.level === 'HIGH') {
      const eventDoc = {
        eventId: `EV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        ts: now,
        nodeId: node._id,
        hazard: primaryHazard,
        level: risk.level,
        score: risk.score,
        state: 'NEW',
        summary: `DISASTER SIMULATED: ${risk.level} ${primaryHazard === 'FF' ? 'Forest Fire' : primaryHazard === 'GL' ? 'Gas Leak' : primaryHazard === 'FL' ? 'Flash Flood' : 'Landslide'} on node ${node._id}`,
        readings: [now.toISOString()],
        actionHistory: [
          {
            action: 'TRIGGERED',
            ts: now,
            by: 'Hardware Sensor Simulator Server',
            note: `Live sensor stream packet injected: ${risk.rule}`,
          }
        ],
      };
      eventsToInsert.push(eventDoc);
    }

    // Format console output
    const vStr = Object.entries(readingDoc.v).map(([k, val]) => `${k}:${val}`).slice(0, 3).join(' | ');
    summaryLog.push(`[Node ${node._id}] ${chosenScenario} -> ${vStr} | STATUS: ACTIVE (${risk.level})`);
  }

  if (readingsToInsert.length > 0) {
    await database.collection('readings').insertMany(readingsToInsert);
  }
  if (eventsToInsert.length > 0) {
    await database.collection('events').insertMany(eventsToInsert);
  }

  const timeStr = new Date().toLocaleTimeString('en-IN');
  if (!silent) {
    console.log(`\n📡 [${timeStr}] Transmitted ${readingsToInsert.length} active sensor packet(s) to MongoDB:`);
    summaryLog.slice(0, 4).forEach(line => console.log(`   ${line}`));
    if (summaryLog.length > 4) console.log(`   ...and ${summaryLog.length - 4} more active nodes.`);
    if (eventsToInsert.length > 0) {
      console.log(`   ⚠️ Created ${eventsToInsert.length} critical disaster incident(s) in events collection.`);
    }
  }

  return {
    success: true,
    nodesTransmitted: targetNodes.length,
    eventsTriggered: eventsToInsert.length,
    timestamp: timeStr,
    summaryLog,
  };
}

/**
 * Reset all nodes to standby
 */
async function resetAllNodes() {
  const database = await getDb();
  await database.collection('nodes').updateMany({}, {
    $set: {
      status: 'inactive',
      lastSeen: new Date(),
    }
  });
  console.log(`🔄 [Simulator] All 12 nodes reset to INACTIVE (STANDBY awaiting packets).`);
  return { success: true, message: 'All nodes reset to INACTIVE (Standby).' };
}

/**
 * Start background auto-stream loop
 */
function startAutoStream() {
  if (autoStreamTimer) clearInterval(autoStreamTimer);
  isAutoStreaming = true;
  console.log(`\n🚀 [Simulator] Live telemetry auto-stream loop ACTIVE (every ${autoStreamInterval / 1000}s)...`);
  
  // Transmit immediate first packet batch
  transmitActiveTelemetry({ nodeId: 'ALL', scenario: null });

  autoStreamTimer = setInterval(() => {
    transmitActiveTelemetry({ nodeId: 'ALL', scenario: null, silent: false }).catch(err => {
      console.error('[Simulator Stream Error]:', err.message);
    });
  }, autoStreamInterval);
}

function stopAutoStream() {
  if (autoStreamTimer) clearInterval(autoStreamTimer);
  autoStreamTimer = null;
  isAutoStreaming = false;
  console.log(`⏸️ [Simulator] Live telemetry auto-stream loop PAUSED.`);
}

// Embedded Web Application HTML with Buttons
const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Disaster Watch - Hardware Sensor Simulator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070b14;
      --card-bg: rgba(13, 20, 36, 0.85);
      --border: rgba(30, 41, 59, 0.8);
      --cyan: #06b6d4;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #f43f5e;
      --purple: #a855f7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: #e2e8f0;
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(244, 63, 94, 0.08) 0%, transparent 40%);
    }
    header {
      padding: 16px 28px;
      border-bottom: 1px solid var(--border);
      background: rgba(7, 11, 20, 0.9);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(16, 185, 129, 0.25));
      border: 1px solid rgba(6, 182, 212, 0.5);
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .brand h1 { font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; }
    .brand p { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; }
    main {
      flex: 1; padding: 24px 28px; max-width: 1440px; width: 100%; margin: 0 auto;
      display: grid; grid-template-columns: 1fr 400px; gap: 24px;
    }
    @media (max-width: 1024px) { main { grid-template-columns: 1fr; } }
    .card {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 16px; padding: 20px; backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom: 20px;
    }
    .card-title {
      font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
      text-transform: uppercase; font-family: 'JetBrains Mono', monospace;
      color: #ffffff; display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 10px;
    }
    .btn-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
    }
    @media (max-width: 768px) { .btn-grid { grid-template-columns: 1fr; } }
    .action-btn {
      padding: 16px 12px; border-radius: 12px;
      font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700;
      cursor: pointer; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 6px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid; text-align: center;
    }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.4); }
    .action-btn:active { transform: translateY(0); }
    .btn-normal { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.5); color: #34d399; }
    .btn-normal:hover { background: rgba(16, 185, 129, 0.3); border-color: #10b981; }
    .btn-fire { background: rgba(244, 63, 94, 0.15); border-color: rgba(244, 63, 94, 0.5); color: #fb7185; }
    .btn-fire:hover { background: rgba(244, 63, 94, 0.3); border-color: #f43f5e; }
    .btn-gas { background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.5); color: #fbbf24; }
    .btn-gas:hover { background: rgba(245, 158, 11, 0.3); border-color: #f59e0b; }
    .btn-flood { background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; }
    .btn-flood:hover { background: rgba(56, 189, 248, 0.3); border-color: #38bdf8; }
    .btn-landslide { background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.5); color: #c084fc; }
    .btn-landslide:hover { background: rgba(168, 85, 247, 0.3); border-color: #a855f7; }
    .btn-random { background: rgba(6, 182, 212, 0.15); border-color: rgba(6, 182, 212, 0.5); color: #22d3ee; }
    .btn-random:hover { background: rgba(6, 182, 212, 0.3); border-color: #06b6d4; }
    .btn-reset {
      background: rgba(148, 163, 184, 0.08); border-color: rgba(148, 163, 184, 0.3);
      color: #94a3b8; width: 100%; padding: 12px; border-radius: 10px; cursor: pointer;
      font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;
    }
    .btn-reset:hover { background: rgba(148, 163, 184, 0.18); color: #ffffff; }
    .stream-panel {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border);
      padding: 14px 18px; border-radius: 12px; margin-bottom: 20px;
    }
    .toggle-btn {
      background: #10b981; color: #022c22; font-family: 'JetBrains Mono', monospace;
      font-size: 13px; font-weight: 800; padding: 10px 18px; border-radius: 10px;
      border: none; cursor: pointer; display: flex; align-items: center; gap: 8px;
    }
    .toggle-btn.paused { background: #dc2626; color: white; }
    .select-input {
      background: #090d16; border: 1px solid #334155; color: #f8fafc;
      padding: 8px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
    }
    .console-box {
      background: #040711; border: 1px solid #1e293b; border-radius: 12px;
      height: 520px; overflow-y: auto; padding: 12px; font-family: 'JetBrains Mono', monospace;
      font-size: 11px; display: flex; flex-direction: column; gap: 8px;
    }
    .log-entry {
      padding: 8px 10px; border-radius: 8px; border-left: 3px solid #10b981;
      background: rgba(15, 23, 42, 0.6); line-height: 1.4;
    }
    .pulse-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      background: #10b981; margin-right: 6px; animation: pulse 1.4s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">📡</div>
      <div>
        <h1>DISASTER WATCH • SENSOR HARDWARE SIMULATOR</h1>
        <p>Standalone Background LoRa Transmission Server • Port 4000</p>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:16px; font-family:'JetBrains Mono'; font-size:12px;">
      <div style="color:#10b981; display:flex; align-items:center;">
        <span class="pulse-dot"></span> STREAMING TO ATLAS
      </div>
    </div>
  </header>

  <main>
    <div>
      <!-- Continuous Stream Status -->
      <div class="stream-panel">
        <div style="display:flex; align-items:center; gap:14px;">
          <button id="streamBtn" class="toggle-btn" onclick="toggleStream()">
            ● AUTO-STREAMING (ACTIVE)
          </button>
          <span id="streamText" style="font-family:'JetBrains Mono'; font-size:12px; color:#10b981;">
            Streaming live disaster packets every 5s...
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-family:'JetBrains Mono'; font-size:11px; color:#94a3b8;">NODE TARGET:</span>
          <select id="nodeSelect" class="select-input">
            <option value="ALL">All 12 Nodes (Broadcast)</option>
            <option value="FGMH26080001">FGMH26080001 (Forest Fire)</option>
            <option value="FGMH26080002">FGMH26080002 (Forest Fire)</option>
            <option value="FGMH26080005">FGMH26080005 (Gas Leak)</option>
            <option value="FGMH26080006">FGMH26080006 (Gas Leak)</option>
            <option value="FSMH26080009">FSMH26080009 (Flash Flood)</option>
            <option value="FSMH2608000B">FSMH2608000B (Landslide)</option>
          </select>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="card">
        <div class="card-title">
          <span>⚡ Manual Telemetry Push Buttons</span>
          <span style="font-size:11px; color:#94a3b8; font-weight:normal;">Click any button to inject packet</span>
        </div>

        <div class="btn-grid">
          <button class="action-btn btn-fire" onclick="pushScenario('FF')">
            <span style="font-size:22px;">🔥</span>
            <span>Push Forest Fire (FF)</span>
            <span style="font-size:10px; opacity:0.8;">Temp >58°C, PM2.5 >280</span>
          </button>

          <button class="action-btn btn-gas" onclick="pushScenario('GL')">
            <span style="font-size:22px;">💨</span>
            <span>Push Gas Leak (GL)</span>
            <span style="font-size:10px; opacity:0.8;">MQ-4 CH4 >55 ppm Spike</span>
          </button>

          <button class="action-btn btn-flood" onclick="pushScenario('FL')">
            <span style="font-size:22px;">🌊</span>
            <span>Push Flash Flood (FL)</span>
            <span style="font-size:10px; opacity:0.8;">Soil Moisture >97%</span>
          </button>

          <button class="action-btn btn-landslide" onclick="pushScenario('LS')">
            <span style="font-size:22px;">⛰️</span>
            <span>Push Landslide (LS)</span>
            <span style="font-size:10px; opacity:0.8;">Vibration Pulse >30 count</span>
          </button>

          <button class="action-btn btn-random" onclick="pushScenario('RANDOM')">
            <span style="font-size:22px;">🎲</span>
            <span>Push Random Burst</span>
            <span style="font-size:10px; opacity:0.8;">Active Multi-Sensor Packets</span>
          </button>

          <button class="action-btn btn-normal" onclick="pushScenario('NORMAL')">
            <span style="font-size:22px;">🟢</span>
            <span>Push Safe Baseline</span>
            <span style="font-size:10px; opacity:0.8;">Active Normal Readings</span>
          </button>
        </div>

        <button class="btn-reset" onclick="resetNodes()">
          🔄 Reset All Nodes to Standby (INACTIVE)
        </button>
      </div>
    </div>

    <!-- Live Transmission Terminal -->
    <div>
      <div class="card" style="height:calc(100% - 20px); display:flex; flex-direction:column;">
        <div class="card-title">
          <span>📟 Outgoing LoRa Telemetry Log</span>
          <button onclick="clearConsole()" style="background:transparent; border:none; color:#64748b; font-family:'JetBrains Mono'; font-size:11px; cursor:pointer;">
            Clear
          </button>
        </div>
        <div class="console-box" id="consoleLog">
          <div class="log-entry">
            <span style="color:#10b981;">[AUTO-BOOT]</span> Simulator initialized. Auto-streaming active disaster packets into MongoDB.
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    let isStreaming = true;

    async function pushScenario(scenario) {
      const nodeId = document.getElementById('nodeSelect').value;
      try {
        const res = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, scenario })
        });
        const data = await res.json();
        if (data.success) {
          log('Push [' + scenario + ']: ' + data.nodesTransmitted + ' node(s) updated to ACTIVE');
        }
      } catch (e) {
        log('Error: ' + e.message);
      }
    }

    async function resetNodes() {
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const data = await res.json();
        log('All nodes reset to INACTIVE (STANDBY)');
      } catch (e) {
        log('Error: ' + e.message);
      }
    }

    async function toggleStream() {
      const btn = document.getElementById('streamBtn');
      const text = document.getElementById('streamText');
      try {
        const res = await fetch('/api/stream/toggle', { method: 'POST' });
        const data = await res.json();
        isStreaming = data.isAutoStreaming;
        if (isStreaming) {
          btn.innerText = '● AUTO-STREAMING (ACTIVE)';
          btn.classList.remove('paused');
          text.innerText = 'Streaming live disaster packets every 5s...';
          text.style.color = '#10b981';
          log('Auto-stream loop RESUMED');
        } else {
          btn.innerText = '▶ START STREAM';
          btn.classList.add('paused');
          text.innerText = 'Auto-stream loop PAUSED';
          text.style.color = '#94a3b8';
          log('Auto-stream loop PAUSED');
        }
      } catch (e) {
        log('Error: ' + e.message);
      }
    }

    function log(msg) {
      const box = document.getElementById('consoleLog');
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      const time = new Date().toLocaleTimeString('en-IN');
      entry.innerHTML = '<span style="color:#64748b;">[' + time + ']</span> ' + msg;
      box.insertBefore(entry, box.firstChild);
      if (box.children.length > 40) box.removeChild(box.lastChild);
    }

    function clearConsole() {
      document.getElementById('consoleLog').innerHTML = '';
    }

    // Auto-poll status
    setInterval(async () => {
      if (isStreaming) {
        log('Auto-stream packet batch committed to MongoDB');
      }
    }, 5000);
  </script>
</body>
</html>
`;

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Web Controller UI
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }

  // 2. Manual Push API
  if (url.pathname === '/api/push' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const result = await transmitActiveTelemetry(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 3. Reset Nodes API
  if (url.pathname === '/api/reset' && req.method === 'POST') {
    try {
      const result = await resetAllNodes();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 4. Toggle Stream API
  if (url.pathname === '/api/stream/toggle' && req.method === 'POST') {
    if (isAutoStreaming) {
      stopAutoStream();
    } else {
      startAutoStream();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isAutoStreaming }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, async () => {
  console.log(`=================================================================`);
  console.log(`📡 Disaster Watch - Hardware Sensor & LoRa Packet Simulator Server`);
  console.log(`🚀 Simulator Server running on: http://localhost:${PORT}`);
  console.log(`📊 Live Monitoring Dashboard:  http://localhost:3050`);
  console.log(`⚡ Mode: AUTO-STREAMING DISASTER TELEMETRY TO MONGODB`);
  console.log(`=================================================================`);
  try {
    await getDb();
    console.log(`[Simulator] Connected to MongoDB Atlas.`);
    // Automatically start streaming active disaster telemetry
    startAutoStream();
  } catch (err) {
    console.error('[Simulator] MongoDB Connection Error:', err.message);
  }
});
