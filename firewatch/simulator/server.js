/**
 * Disaster Watch - Standalone Hardware Sensor & LoRa Packet Simulator Server
 * Interactive Terminal CLI with numbered sensor selection (1, 2, 3, 4, 5, 6, 0)
 * 
 * Run from terminal:
 *   node simulator/server.js
 *   or: npm run simulator
 * 
 * Web Controller: http://localhost:4000
 */

const http = require('http');
const dns = require('dns');
const readline = require('readline');
const { MongoClient } = require('mongodb');

const fs = require('fs');
const path = require('path');

// Dynamically load environment variables from dashboard/.env.local if available
try {
  const envPath = path.resolve(__dirname, '../dashboard/.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (e) {}

// Resilient DNS resolution for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const PORT = process.env.SIMULATOR_PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'firewatch_sim';

let mongoClient = null;
let db = null;
let streamTimer = null;
let isStreaming = true;
let currentMode = '1'; // Default: 1 (All sensors)
let packetSequence = 5000;

// Node ID mappings
const NODE_GROUPS = {
  'FF': ['FGMH26080001', 'FGMH26080002', 'FGMH26080003', 'FGMH26080004'],
  'GL': ['FGMH26080005', 'FGMH26080006', 'FGMH26080007', 'FGMH26080008'],
  'FL': ['FSMH26080009', 'FSMH2608000A'],
  'LS': ['FSMH2608000B', 'FSMH2608000C'],
};

const ALL_NODE_IDS = [
  ...NODE_GROUPS.FF,
  ...NODE_GROUPS.GL,
  ...NODE_GROUPS.FL,
  ...NODE_GROUPS.LS,
];

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
 * Generate actual dynamic disaster telemetry
 */
function generateSensorData(nodeId, hazardType) {
  const isFG = nodeId.startsWith('FG');
  let v = {};
  let risk = { level: 'NORMAL', score: 0.02, rule: 'baseline' };
  let state = 'NORMAL';
  let injectedAnomaly = null;

  if (hazardType === 'FF') {
    // 🔥 Forest Fire Disaster
    state = 'FIRE_ALERT';
    injectedAnomaly = 'thermal_smoke_plume';
    v = {
      temp_c: parseFloat((56.0 + Math.random() * 16.0).toFixed(2)), // 56°C - 72°C
      rh_pct: parseFloat((10.0 + Math.random() * 8.0).toFixed(2)),   // 10% - 18%
      pm25: parseFloat((260.0 + Math.random() * 160.0).toFixed(2)), // 260 - 420 µg/m³
      mq4_ppm: parseFloat((2.5 + Math.random() * 1.5).toFixed(2)),
      mq7_ppm: parseFloat((15.0 + Math.random() * 14.0).toFixed(2)), // 15 - 29 ppm CO
      mq135_ppm: parseFloat((8.0 + Math.random() * 6.0).toFixed(2)),
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.92 + Math.random() * 0.07).toFixed(2)),
      rule: 'forest_fire_thermal_runaway',
    };
  } else if (hazardType === 'GL') {
    // 💨 Gas Leak Disaster
    state = 'GAS_LEAK';
    injectedAnomaly = 'methane_plume';
    v = {
      temp_c: parseFloat((28.5 + Math.random() * 4.0).toFixed(2)),
      rh_pct: parseFloat((52.0 + Math.random() * 8.0).toFixed(2)),
      pm25: parseFloat((35.0 + Math.random() * 15.0).toFixed(2)),
      mq4_ppm: parseFloat((52.0 + Math.random() * 30.0).toFixed(2)), // 52 - 82 ppm CH4!
      mq7_ppm: parseFloat((4.0 + Math.random() * 3.0).toFixed(2)),
      mq135_ppm: parseFloat((18.0 + Math.random() * 8.0).toFixed(2)),
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.89 + Math.random() * 0.08).toFixed(2)),
      rule: 'methane_lel_threshold_exceeded',
    };
  } else if (hazardType === 'FL') {
    // 🌊 Flash Flood Disaster
    state = 'FLOOD_ALERT';
    injectedAnomaly = 'rapid_soil_saturation';
    v = {
      soil_pct: parseFloat((96.0 + Math.random() * 3.8).toFixed(2)), // 96% - 99.8%
      vib_count: Math.floor(Math.random() * 3),
      water_level_cm: parseFloat((175.0 + Math.random() * 45.0).toFixed(1)),
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.91 + Math.random() * 0.07).toFixed(2)),
      rule: 'flood_surface_runoff_surge',
    };
  } else if (hazardType === 'LS') {
    // ⛰️ Landslide Disaster
    state = 'LANDSLIDE_ALERT';
    injectedAnomaly = 'seismic_slope_shear';
    v = {
      soil_pct: parseFloat((86.0 + Math.random() * 10.0).toFixed(2)),
      vib_count: Math.floor(25 + Math.random() * 18),               // 25 - 43 pulses/min!
      tilt_deg: parseFloat((16.0 + Math.random() * 6.0).toFixed(1)),
    };
    risk = {
      level: 'CRITICAL',
      score: parseFloat((0.94 + Math.random() * 0.05).toFixed(2)),
      rule: 'slope_displacement_geophone_trigger',
    };
  } else {
    // 🟢 Safe Normal Active Telemetry
    if (isFG) {
      v = {
        temp_c: parseFloat((25.5 + Math.random() * 3.5).toFixed(2)),
        rh_pct: parseFloat((54.0 + Math.random() * 8.0).toFixed(2)),
        pm25: parseFloat((20.0 + Math.random() * 10.0).toFixed(2)),
        mq4_ppm: parseFloat((1.4 + Math.random() * 0.5).toFixed(2)),
        mq7_ppm: parseFloat((0.9 + Math.random() * 0.3).toFixed(2)),
        mq135_ppm: parseFloat((0.8 + Math.random() * 0.3).toFixed(2)),
      };
    } else {
      v = {
        soil_pct: parseFloat((40.0 + Math.random() * 8.0).toFixed(2)),
        vib_count: Math.floor(Math.random() * 2),
      };
    }
    risk = { level: 'NORMAL', score: 0.02, rule: 'baseline' };
  }

  const now = new Date();
  packetSequence++;

  const readingDoc = {
    ts: now,
    meta: {
      gatewayId: 'GW-MH-01',
      hazards: isFG ? ['FF', 'GL'] : ['FL', 'LS'],
      nodeId,
      nodeType: isFG ? 'FG' : 'FS',
      region: 'MH',
    },
    synthetic: true,
    link: {
      rxAt: new Date(now.getTime() + 110),
      latency_ms: Math.floor(1100 + Math.random() * 500),
      rssi: Math.floor(-68 - Math.random() * 15),
      seq: packetSequence,
      retries: 0,
    },
    adc: isFG
      ? { mq4: 480, mq7: 410, mq135: 530, pm25: 620 }
      : { sm: 1850, vib: v.vib_count || 0 },
    sdRef: `${now.toISOString().slice(0, 10)}/${nodeId}_live.csv`,
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

  return { readingDoc, risk, now };
}

/**
 * Determine which active nodes and hazards to transmit based on mode
 */
function getActivePlan(mode) {
  const cleanMode = String(mode).trim();
  const plan = [];

  if (cleanMode === '0') {
    // Reset / Standby
    return { plan: [], isReset: true, label: 'STANDBY (All Nodes INACTIVE)' };
  }

  if (cleanMode === '2' || cleanMode.includes('2')) {
    // Forest Fire Nodes
    NODE_GROUPS.FF.forEach(id => plan.push({ id, hazard: 'FF', label: 'Forest Fire' }));
  }
  if (cleanMode === '3' || cleanMode.includes('3')) {
    // Gas Leak Nodes
    NODE_GROUPS.GL.forEach(id => plan.push({ id, hazard: 'GL', label: 'Gas Leak' }));
  }
  if (cleanMode === '4' || cleanMode.includes('4')) {
    // Flash Flood Nodes
    NODE_GROUPS.FL.forEach(id => plan.push({ id, hazard: 'FL', label: 'Flash Flood' }));
  }
  if (cleanMode === '5' || cleanMode.includes('5')) {
    // Landslide Nodes
    NODE_GROUPS.LS.forEach(id => plan.push({ id, hazard: 'LS', label: 'Landslide' }));
  }
  if (cleanMode === '6') {
    // Safe Active Telemetry across all
    ALL_NODE_IDS.forEach(id => plan.push({ id, hazard: 'NORMAL', label: 'Safe Active Telemetry' }));
  }

  // Default option 1: Full multi-hazard active network
  if (cleanMode === '1' || plan.length === 0) {
    NODE_GROUPS.FF.forEach(id => plan.push({ id, hazard: 'FF', label: 'Forest Fire' }));
    NODE_GROUPS.GL.forEach(id => plan.push({ id, hazard: 'GL', label: 'Gas Leak' }));
    NODE_GROUPS.FL.forEach(id => plan.push({ id, hazard: 'FL', label: 'Flash Flood' }));
    NODE_GROUPS.LS.forEach(id => plan.push({ id, hazard: 'LS', label: 'Landslide' }));
  }

  return { plan, isReset: false, label: getModeLabel(cleanMode) };
}

function getModeLabel(m) {
  switch (String(m).trim()) {
    case '1': return '1: ALL 12 SENSORS ACTIVE (Multi-Hazard Disaster Stream)';
    case '2': return '2: FOREST FIRE SENSORS ACTIVE (Nodes 1, 2, 3, 4)';
    case '3': return '3: GAS LEAK SENSORS ACTIVE (Nodes 5, 6, 7, 8)';
    case '4': return '4: FLASH FLOOD SENSORS ACTIVE (Nodes 9, 10)';
    case '5': return '5: LANDSLIDE SENSORS ACTIVE (Nodes 11, 12)';
    case '6': return '6: SAFE ACTIVE TELEMETRY (All 12 Nodes Baseline)';
    case '0': return '0: RESET ALL TO STANDBY (INACTIVE)';
    default: return `Custom Mode: ${m}`;
  }
}

/**
 * Transmit one batch of packets to MongoDB
 */
async function transmitBatch(mode) {
  const { plan, isReset } = getActivePlan(mode);
  const database = await getDb();

  if (isReset) {
    await database.collection('nodes').updateMany({}, {
      $set: { status: 'inactive', lastSeen: new Date() }
    });
    return { count: 0, reset: true };
  }

  const activeIds = plan.map(p => p.id);
  const inactiveIds = ALL_NODE_IDS.filter(id => !activeIds.includes(id));

  // Set non-participating nodes to inactive standby
  if (inactiveIds.length > 0) {
    await database.collection('nodes').updateMany(
      { _id: { $in: inactiveIds } },
      { $set: { status: 'inactive', lastSeen: new Date() } }
    );
  }

  const readings = [];
  const events = [];
  const logLines = [];

  for (const item of plan) {
    const { readingDoc, risk, now } = generateSensorData(item.id, item.hazard);
    readings.push(readingDoc);

    // Update node status to ACTIVE
    await database.collection('nodes').updateOne(
      { _id: item.id },
      {
        $set: {
          status: 'active',
          lastSeen: now,
          latestReading: readingDoc,
        }
      }
    );

    // Create event for critical hazard
    if (risk.level === 'CRITICAL') {
      const eventDoc = {
        eventId: `EV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        ts: now,
        nodeId: item.id,
        hazard: item.hazard,
        level: risk.level,
        score: risk.score,
        state: 'NEW',
        summary: `DISASTER SIMULATED: ${item.label} on node ${item.id}`,
        readings: [now.toISOString()],
        actionHistory: [
          {
            action: 'TRIGGERED',
            ts: now,
            by: 'Hardware Sensor Simulator',
            note: `Live disaster telemetry packet: ${risk.rule}`,
          }
        ],
      };
      events.push(eventDoc);
    }

    // Format readable telemetry values for log
    const v = readingDoc.v;
    let readingSummary = '';
    if (item.hazard === 'FF') {
      readingSummary = `Temp: ${v.temp_c}°C | PM2.5: ${v.pm25} µg/m³ | CO: ${v.mq7_ppm} ppm`;
    } else if (item.hazard === 'GL') {
      readingSummary = `CH4: ${v.mq4_ppm} ppm | MQ-135: ${v.mq135_ppm} ppm`;
    } else if (item.hazard === 'FL') {
      readingSummary = `Soil Saturation: ${v.soil_pct}% | Runoff: ${v.water_level_cm} cm`;
    } else if (item.hazard === 'LS') {
      readingSummary = `Vibration: ${v.vib_count} count/min | Tilt: ${v.tilt_deg}°`;
    } else {
      readingSummary = isFG(item.id) ? `Temp: ${v.temp_c}°C | PM2.5: ${v.pm25}` : `Soil: ${v.soil_pct}%`;
    }

    logLines.push(`[${item.id}] [${item.hazard}] ${readingSummary} -> ACTIVE (${risk.level})`);
  }

  if (readings.length > 0) {
    await database.collection('readings').insertMany(readings);
  }
  if (events.length > 0) {
    await database.collection('events').insertMany(events);
    // Schedule Twilio Voice Call & SMS with a 5-second escalation delay
    const firstEvent = events[0];
    const hazardLabel = firstEvent.hazard === 'FF' ? 'Forest Fire' : firstEvent.hazard === 'GL' ? 'Gas Leak' : firstEvent.hazard === 'FL' ? 'Flash Flood' : 'Landslide';
    scheduleEmergencyCall(hazardLabel, firstEvent.nodeId, 5000);
  }

  const timeStr = new Date().toLocaleTimeString('en-IN');
  console.log(`📡 [${timeStr}] Transmitted ${readings.length} active sensor packet(s) to MongoDB:`);
  logLines.slice(0, 4).forEach(l => console.log(`   ${l}`));
  if (logLines.length > 4) console.log(`   ...and ${logLines.length - 4} more active node packets.`);

  return { count: readings.length, logLines, timeStr };
}

let lastCallTimestamp = 0;
const CALL_COOLDOWN_MS = 60000; // 60s cooldown to prevent repeated dials
let pendingCallTimeout = null;
let countdownInterval = null;

function cancelPendingCall(reason = '') {
  if (pendingCallTimeout) {
    clearTimeout(pendingCallTimeout);
    pendingCallTimeout = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (reason) {
    console.log(`🚫 [DISPATCH CANCELLED] Emergency call aborted: ${reason}`);
  }
}

function scheduleEmergencyCall(hazardName, nodeId, delayMs = 5000) {
  const now = Date.now();
  // If call already scheduled or recently made, do not schedule another
  if (pendingCallTimeout) return;
  if (now - lastCallTimestamp < CALL_COOLDOWN_MS) {
    return;
  }

  const targetPhone = process.env.EMERGENCY_RECIPIENT_PHONE || '+918600596593';
  let remainingSecs = Math.ceil(delayMs / 1000);

  console.log(`\n🚨 [INCIDENT DETECTED] Critical ${hazardName} on Node ${nodeId}`);
  console.log(`⏱️ [5s DELAY] Emergency voice call to ${targetPhone} will dial in ${remainingSecs} seconds...`);

  countdownInterval = setInterval(() => {
    remainingSecs--;
    if (remainingSecs > 0) {
      console.log(`⏳ Dialing ${targetPhone} in ${remainingSecs}s...`);
    } else {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
  }, 1000);

  pendingCallTimeout = setTimeout(() => {
    pendingCallTimeout = null;
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    dispatchTwilioEmergencyCall(hazardName, nodeId).catch(err => console.error('Call dispatch error:', err.message));
  }, delayMs);
}

async function dispatchTwilioEmergencyCall(hazardName, nodeId, force = false) {
  cancelPendingCall('');
  const now = Date.now();
  if (!force && (now - lastCallTimestamp < CALL_COOLDOWN_MS)) {
    return;
  }
  lastCallTimestamp = now;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;
  const targetPhone = process.env.EMERGENCY_RECIPIENT_PHONE || '+918600596593';

  console.log(`\n🚨 [AUTO-DISPATCH] CRITICAL DISASTER DETECTED: ${hazardName} on Node ${nodeId}`);
  console.log(`📞 [DIALING EMERGENCY CARRIER CALL] ${twilioFrom} -> ${targetPhone}...`);

  try {
    const params = new URLSearchParams();
    params.append('To', targetPhone);
    params.append('From', twilioFrom);
    params.append('Url', 'http://demo.twilio.com/docs/voice.xml');

    const auth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`✅ [CALL CONNECTED & RINGING] Twilio SID: ${data.sid} | Status: ${data.status.toUpperCase()} -> PHONE RINGING!`);
    } else {
      console.log(`⚠️ [Twilio Voice Status] ${data.message || JSON.stringify(data)}`);
    }
  } catch (err) {
    console.error(`❌ [Voice Call Error]:`, err.message);
  }

  // Also trigger SMS
  try {
    const smsParams = new URLSearchParams();
    smsParams.append('To', targetPhone);
    smsParams.append('From', twilioFrom);
    smsParams.append('Body', `🚨 DISASTER WATCH EMERGENCY: Critical ${hazardName} detected by sensor node ${nodeId}. Response teams dispatched.`);

    const auth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: smsParams.toString(),
    });
    console.log(`📱 [SMS DISPATCHED] Emergency SMS queued for ${targetPhone}`);
  } catch (e) {}
}

function isFG(id) {
  return id.startsWith('FG');
}

/**
 * Switch transmission mode
 */
function setMode(newMode) {
  currentMode = String(newMode).trim();
  const label = getModeLabel(currentMode);

  if (currentMode === '0' || currentMode === '6') {
    cancelPendingCall('Switched to Standby / Safe mode');
  }

  console.log(`\n=========================================================`);
  console.log(`⚡ SWITCHED SIMULATOR TO: ${label}`);
  console.log(`=========================================================`);

  // Immediate transmission on mode change
  transmitBatch(currentMode).catch(err => console.error('Transmit error:', err.message));
}

/**
 * Background auto-stream loop (every 3.5s)
 */
function startStreaming() {
  if (streamTimer) clearInterval(streamTimer);
  isStreaming = true;
  
  // Transmit initial batch immediately
  transmitBatch(currentMode).catch(err => console.error('Initial transmit error:', err.message));

  streamTimer = setInterval(() => {
    if (isStreaming && currentMode !== '0') {
      transmitBatch(currentMode).catch(err => console.error('Stream tick error:', err.message));
    }
  }, 3500); // 3.5 seconds fast updates for live dashboard
}

function printMenu() {
  console.log(`
================================================================================
📡 DISASTER WATCH • SENSOR HARDWARE SIMULATOR
================================================================================
Select which sensors / disaster mode to activate:
  [1] ALL 12 SENSORS ACTIVE (Multi-Hazard Continuous Disaster Stream)
  [2] FOREST FIRE SENSORS (Nodes 1, 2, 3, 4 - Heat 58°C+ & PM2.5 Smoke)
  [3] GAS LEAK SENSORS (Nodes 5, 6, 7, 8 - Methane CH4 55+ ppm Spike)
  [4] FLASH FLOOD SENSORS (Nodes 9, 10 - Soil Saturation 97%+ & Runoff)
  [5] LANDSLIDE SENSORS (Nodes 11, 12 - Seismic Tilt & Vibration Pulses)
  [6] SAFE ACTIVE TELEMETRY (All Nodes 1–12 - Baseline Safe Readings)
  [c] 📞 CALL NOW: Trigger Emergency Phone Call to +91 8600596593 Immediately
  [0] RESET ALL TO STANDBY (Set All 12 Nodes to INACTIVE)
================================================================================
👉 Type option (1, 2, 3, 4, 5, 6, c, 0) and press Enter:`);
}

/**
 * Setup terminal interactive input
 */
function setupTerminalInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  printMenu();

  rl.on('line', (line) => {
    const input = line.trim().toLowerCase();
    if (input === 'c') {
      dispatchTwilioEmergencyCall('Operator Emergency Alert', 'FF-NODE-01', true);
    } else if (['0', '1', '2', '3', '4', '5', '6'].includes(input) || input.includes(',')) {
      setMode(input);
    } else {
      console.log(`Invalid option: "${input}". Please enter 1, 2, 3, 4, 5, 6, c, or 0.`);
    }
  });
}

// Embedded Web Controller HTML with 1, 2, 3, 4, 5, 6, 0 Buttons
const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Disaster Watch - Hardware Sensor Simulator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #070b14; color: #e2e8f0; font-family: 'Outfit', sans-serif;
      min-height: 100vh; padding: 24px;
      background-image: radial-gradient(circle at 15% 15%, rgba(6, 182, 212, 0.1) 0%, transparent 40%),
                        radial-gradient(circle at 85% 85%, rgba(244, 63, 94, 0.1) 0%, transparent 40%);
    }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 40px; height: 40px; border-radius: 10px; background: rgba(6,182,212,0.2);
      border: 1px solid rgba(6,182,212,0.4); display: flex; align-items: center;
      justify-content: center; font-size: 22px;
    }
    .title { font-size: 18px; font-weight: 700; color: #fff; }
    .sub { font-size: 11px; font-family: 'JetBrains Mono'; color: #94a3b8; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .btn {
      padding: 20px 16px; border-radius: 14px; font-family: 'JetBrains Mono';
      font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; transition: all 0.2s; text-align: center;
    }
    .btn:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .btn-all { background: rgba(6,182,212,0.15); border-color: #06b6d4; color: #22d3ee; }
    .btn-fire { background: rgba(244,63,94,0.15); border-color: #f43f5e; color: #fb7185; }
    .btn-gas { background: rgba(245,158,11,0.15); border-color: #f59e0b; color: #fbbf24; }
    .btn-flood { background: rgba(56,189,248,0.15); border-color: #38bdf8; color: #38bdf8; }
    .btn-landslide { background: rgba(168,85,247,0.15); border-color: #a855f7; color: #c084fc; }
    .btn-safe { background: rgba(16,185,129,0.15); border-color: #10b981; color: #34d399; }
    .btn-reset {
      background: rgba(148,163,184,0.1); border-color: #64748b; color: #94a3b8;
      width: 100%; padding: 14px; border-radius: 12px; font-family: 'JetBrains Mono';
      font-weight: 700; cursor: pointer;
    }
    .btn-reset:hover { background: rgba(148,163,184,0.2); color: #fff; }
    .log-card {
      background: rgba(13,20,36,0.8); border: 1px solid #1e293b; border-radius: 14px;
      padding: 16px; margin-top: 24px;
    }
    .log-box {
      background: #040711; border: 1px solid #1e293b; border-radius: 10px;
      height: 320px; overflow-y: auto; padding: 12px; font-family: 'JetBrains Mono';
      font-size: 11px; display: flex; flex-direction: column; gap: 6px;
    }
    .log-row { padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-icon">📡</div>
      <div>
        <div class="title">DISASTER WATCH • SENSOR CONTROLLER</div>
        <div class="sub">Select 1, 2, 3, 4, 5 to activate specific hazard sensors</div>
      </div>
    </div>
    <div style="font-family:'JetBrains Mono'; font-size:12px; color:#10b981;">
      ● LIVE STREAMING TO MONGODB (3.5s)
    </div>
  </div>

  <div class="grid">
    <button class="btn btn-all" onclick="selectMode('1')">
      <span style="font-size:24px;">🌟</span>
      <span>[1] ACTIVATE ALL 12 SENSORS</span>
      <span style="font-size:10px; opacity:0.8;">Full Multi-Hazard Disaster Grid</span>
    </button>

    <button class="btn btn-fire" onclick="selectMode('2')">
      <span style="font-size:24px;">🔥</span>
      <span>[2] FOREST FIRE SENSORS</span>
      <span style="font-size:10px; opacity:0.8;">Nodes 1–4 (Heat 58°C+, PM2.5 Smoke)</span>
    </button>

    <button class="btn btn-gas" onclick="selectMode('3')">
      <span style="font-size:24px;">💨</span>
      <span>[3] GAS LEAK SENSORS</span>
      <span style="font-size:10px; opacity:0.8;">Nodes 5–8 (Methane CH4 55+ ppm)</span>
    </button>

    <button class="btn btn-flood" onclick="selectMode('4')">
      <span style="font-size:24px;">🌊</span>
      <span>[4] FLASH FLOOD SENSORS</span>
      <span style="font-size:10px; opacity:0.8;">Nodes 9–10 (Soil Saturation 97%+)</span>
    </button>

    <button class="btn btn-landslide" onclick="selectMode('5')">
      <span style="font-size:24px;">⛰️</span>
      <span>[5] LANDSLIDE SENSORS</span>
      <span style="font-size:10px; opacity:0.8;">Nodes 11–12 (Seismic Tilt & Vibration)</span>
    </button>

    <button class="btn btn-safe" onclick="selectMode('6')">
      <span style="font-size:24px;">🟢</span>
      <span>[6] SAFE BASELINE SENSORS</span>
      <span style="font-size:10px; opacity:0.8;">Nodes 1–12 (Active Safe Telemetry)</span>
    </button>
  </div>

  <button class="btn-reset" onclick="selectMode('0')">
    🔄 [0] RESET ALL NODES TO STANDBY (INACTIVE)
  </button>

  <div class="log-card">
    <div style="font-family:'JetBrains Mono'; font-size:12px; font-weight:700; margin-bottom:10px; color:#94a3b8;">
      📟 TRANSMITTED PACKET STREAM (COMMITTED TO MONGODB)
    </div>
    <div class="log-box" id="logBox">
      <div class="log-row" style="color:#10b981;">[BOOT] Simulator active. Transmitting dynamic sensor packets to MongoDB every 3.5s.</div>
    </div>
  </div>

  <script>
    async function selectMode(mode) {
      try {
        const res = await fetch('/api/mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });
        const data = await res.json();
        addLog('Switched Mode to [' + mode + ']: ' + data.label);
      } catch (e) {
        addLog('Error: ' + e.message);
      }
    }

    function addLog(msg) {
      const box = document.getElementById('logBox');
      const row = document.createElement('div');
      row.className = 'log-row';
      const time = new Date().toLocaleTimeString('en-IN');
      row.innerHTML = '<span style="color:#64748b;">[' + time + ']</span> ' + msg;
      box.insertBefore(row, box.firstChild);
      if (box.children.length > 50) box.removeChild(box.lastChild);
    }
  </script>
</body>
</html>
`;

// HTTP Server for web controller and API
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

  // 2. Select Mode API
  if (url.pathname === '/api/mode' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const mode = parsed.mode || '1';
        setMode(mode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, mode, label: getModeLabel(mode) }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 3. Status API
  if (url.pathname === '/api/status' && req.method === 'GET') {
    try {
      const database = await getDb();
      const active = await database.collection('nodes').countDocuments({ status: 'active' });
      const inactive = await database.collection('nodes').countDocuments({ status: 'inactive' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ active, inactive, currentMode, label: getModeLabel(currentMode) }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, async () => {
  try {
    await getDb();
    console.log(`[Simulator] Connected to MongoDB Atlas.`);
    // Start streaming active telemetry immediately
    startStreaming();
    // Start terminal interactive CLI menu
    setupTerminalInput();
  } catch (err) {
    console.error('[Simulator] MongoDB Connection Error:', err.message);
  }
});
