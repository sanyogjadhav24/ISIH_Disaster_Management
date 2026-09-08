#!/usr/bin/env node
/**
 * generate_synthetic.js
 *
 * Synthetic telemetry generator for the multi-hazard sensing network.
 * Writes nodes / gateways / readings / events into a SEPARATE database
 * (firewatch_sim by default) so it can never contaminate production.
 *
 *   npm install mongodb
 *   MONGODB_URI="mongodb+srv://..." node generate_synthetic.js
 *
 * Flags:
 *   --days=30          history length
 *   --fg=8             number of fire/gas nodes
 *   --fs=4             number of flood/slope nodes
 *   --interval=10      transmit interval, minutes
 *   --db=firewatch_sim target database
 *   --seed=20260907    RNG seed (same seed => same dataset)
 *   --drop             drop the target collections first
 *   --dry-run          generate and report stats, write nothing
 *
 * MODEL OF OPERATION
 * The node samples at 1 Hz into a ring buffer and transmits a filtered
 * summary every `interval` minutes. So each transmitted reading is backed by
 * a window of `windowN` raw samples that never leave the node. This generator
 * simulates that window explicitly, runs the edge filter over it, and stores
 * only the summary — which is what the real system does.
 *
 * That distinction matters: kurtosis over 60 seconds of 1 Hz data is
 * meaningful, whereas kurtosis over 10 hours of transmitted points is
 * dominated by the diurnal cycle and flags everything.
 *
 * The edge-filter section is deliberately plain, portable arithmetic. It is
 * the reference implementation for the firmware — port it to the MKR Zero
 * rather than rewriting it, so the thresholds tuned here are the ones that
 * actually ship.
 */

'use strict';

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// mongodb is required lazily in main() so --dry-run works without the driver

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const argv = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.replace(/^--/, '').split('=');
        return [k, v === undefined ? true : v];
    })
);

const CFG = {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    dbName: argv.db || 'firewatch_sim',
    days: +(argv.days ?? 30),
    nFG: +(argv.fg ?? 8),
    nFS: +(argv.fs ?? 4),
    intervalMin: +(argv.interval ?? 10),
    seed: +(argv.seed ?? 20260907),
    drop: !!argv.drop,
    dryRun: !!argv['dry-run'],

    region: 'MH',
    originLat: 18.5204,          // grid origin — Pune
    originLng: 73.8567,
    gridStep: 0.036,            // ~4 km
    gridCols: 4,

    windowN: 60,               // raw 1 Hz samples behind each transmission

    // filter thresholds — tune these against the precision/recall report
    zThresh: 3.5,          // modified z-score: trim above this
    spikeMinCount: 3,            // ...but only FLAG if this many are trimmed
    spikeSevereZ: 9.0,          // ...or one excursion is this severe
    kurtThresh: 3.0,             // excess kurtosis, heavy-tail gate
    trendFrac: 0.15,            // slope must exceed this * MAD to count as real

    // packet loss
    baseLossPct: 0.03,
    outageChance: 0.0008,
    outageMinHours: 1,
    outageMaxHours: 6,

    // fault injection, per transmission window per node
    pSpike: 0.010,
    pStuck: 0.0015,
    pHeaterOsc: 0.0015,
    pRail: 0.004
};

const MS_MIN = 60 * 1000;
const STEP_MS = CFG.intervalMin * MS_MIN;

// ---------------------------------------------------------------------------
// Seeded RNG — reproducible datasets matter when tuning thresholds
// ---------------------------------------------------------------------------

function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = mulberry32(CFG.seed);
const uni = (lo, hi) => lo + rand() * (hi - lo);
const irnd = (lo, hi) => Math.floor(uni(lo, hi + 1));
const pick = (arr) => arr[irnd(0, arr.length - 1)];
const chance = (p) => rand() < p;

let spare = null;
function gauss(mu = 0, sd = 1) {
    if (spare !== null) { const s = spare; spare = null; return mu + sd * s; }
    let u, v, s;
    do { u = rand() * 2 - 1; v = rand() * 2 - 1; s = u * u + v * v; }
    while (s === 0 || s >= 1);
    const f = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * f;
    return mu + sd * u * f;
}

/** Knuth Poisson — vibration is a counting process, not a gaussian. */
function poisson(lambda) {
    const L = Math.exp(-Math.max(0, lambda));
    let k = 0, p = 1;
    do { k++; p *= rand(); } while (p > L);
    return k - 1;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const r2 = (x) => Math.round(x * 100) / 100;
const r6 = (x) => Math.round(x * 1e6) / 1e6;

// ---------------------------------------------------------------------------
// Statistics — the edge filter primitives
// ---------------------------------------------------------------------------

function median(xs) {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation. Robust scale — one spike cannot inflate it. */
function mad(xs) {
    const m = median(xs);
    return median(xs.map((x) => Math.abs(x - m)));
}

/**
 * Modified z-score, MAD-based rather than std-based, so a single outlier
 * does not inflate the very scale it is being tested against.
 */
function modZ(x, med, m) {
    if (m === 0) return 0;                 // stuck sensor — caught separately
    return (0.6745 * (x - med)) / m;
}

/** Excess kurtosis. > 3 means heavy tails, i.e. impulsive content. */
function kurtosis(xs) {
    const n = xs.length;
    if (n < 4) return 0;
    const mu = xs.reduce((a, b) => a + b, 0) / n;
    let m2 = 0, m4 = 0;
    for (const x of xs) { const d = x - mu; m2 += d * d; m4 += d * d * d * d; }
    m2 /= n; m4 /= n;
    if (m2 === 0) return 0;
    return m4 / (m2 * m2) - 3;
}

/** Least-squares slope per sample. Distinguishes a real onset from a spike. */
function slope(xs) {
    const n = xs.length;
    if (n < 2) return 0;
    const mx = (n - 1) / 2;
    const my = xs.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - mx) * (xs[i] - my); den += (i - mx) ** 2; }
    return den === 0 ? 0 : num / den;
}

// ---------------------------------------------------------------------------
// Physical limits — outside these means broken, not extreme.
// Applied to INDIVIDUAL 1 Hz samples.
// ---------------------------------------------------------------------------

const LIMITS = {
    temp_c: [-10, 85],
    rh_pct: [0, 100],
    pm25: [0, 1000],
    mq4_ppm: [0, 10000],
    mq7_ppm: [0, 2000],
    mq135_ppm: [0, 500],
    soil_pct: [0, 100],
    vib_hz: [0, 80]        // per-second trigger count from the SW-420
};

/** Channels that are counts, not continuous measurands. */
const COUNT_CHANNELS = new Set(['vib_hz']);

/** Per-sample sensor noise at 1 Hz. Larger than the noise on a 10-min mean. */
const NOISE = {
    temp_c: 0.18, rh_pct: 0.9, pm25: 3.4,
    mq4_ppm: 0.10, mq7_ppm: 0.11, mq135_ppm: 0.06,
    soil_pct: 0.40, vib_hz: 0.5
};

// ---------------------------------------------------------------------------
// Node registry
// ---------------------------------------------------------------------------

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function b36(n, width = 4) {
    let s = '';
    do { s = B36[n % 36] + s; n = Math.floor(n / 36); } while (n > 0);
    return s.padStart(width, '0');
}

function makeNodeId(cls, region, date, seq) {
    const yy = String(date.getUTCFullYear()).slice(2);
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${cls}${region}${yy}${mm}${b36(seq)}`;
}

const FG_SENSORS = () => ([
    {
        code: 'MQ4', model: 'MQ-4', pin: 'A0', unit: 'ppm', divider: 0.643,
        calib: { r0: r2(uni(9.2, 10.6)), curve: [-0.318, 1.133] }, burnInComplete: true
    },
    {
        code: 'MQ7', model: 'MQ-7', pin: 'A1', unit: 'ppm', divider: 0.643,
        calib: { r0: r2(uni(9.6, 11.0)), curve: [-0.770, 0.876] },
        heaterCycled: false, confidence: 'qualitative', burnInComplete: true
    },
    {
        code: 'MQ135', model: 'MQ-135', pin: 'A2', unit: 'ppm', divider: 0.643,
        calib: { r0: r2(uni(10.8, 12.1)), curve: [-0.420, 1.050] }, burnInComplete: true
    },
    {
        code: 'PM25', model: 'GP2Y1010AU0F', pin: 'A3', ledPin: 'D2', unit: 'ug/m3',
        divider: 0.643, calib: { vNoDust: r2(uni(0.5, 0.7)), slope: 0.172 }
    },
    { code: 'DHT', model: 'DHT11', pin: 'D3', unit: ['C', '%RH'] }
]);

const FS_SENSORS = () => ([
    {
        code: 'SM', model: 'LM393', pin: 'A0', unit: 'pct', divider: 0.643,
        calib: { dry: irnd(3020, 3180), wet: irnd(1190, 1310) }
    },
    { code: 'VIB', model: 'SW-420', pin: 'D3', unit: 'count' }
]);

function buildNetwork(startDate) {
    const gateways = [];
    const nodes = [];

    const nGw = Math.max(1, Math.ceil((CFG.nFG + CFG.nFS) / 8));
    for (let g = 0; g < nGw; g++) {
        gateways.push({
            _id: `GW-${CFG.region}-${String(g + 1).padStart(2, '0')}`,
            region: CFG.region,
            location: {
                type: 'Point', coordinates: [
                    r6(CFG.originLng + g * CFG.gridStep * 2 + uni(-0.01, 0.01)),
                    r6(CFG.originLat + uni(-0.01, 0.01))
                ]
            },
            mcu: 'ESP32-WROOM-32',
            radio: { type: 'E32-900T30D', channel: 23, addr: 0 },
            uplink: { kind: 'wifi', endpoint: 'https://api.internal/ingest' },
            nodesHeard: [], status: 'online', lastSeen: null, synthetic: true
        });
    }

    const specs = [
        ...Array.from({ length: CFG.nFG }, () => 'FG'),
        ...Array.from({ length: CFG.nFS }, () => 'FS')
    ];

    specs.forEach((cls, i) => {
        const row = Math.floor(i / CFG.gridCols);
        const col = i % CFG.gridCols;
        const lat = CFG.originLat + row * CFG.gridStep + uni(-0.004, 0.004);
        const lng = CFG.originLng + col * CFG.gridStep + uni(-0.004, 0.004);
        const gw = gateways[Math.min(gateways.length - 1, Math.floor(i / 8))];
        const _id = makeNodeId(cls, CFG.region, startDate, i + 1);
        gw.nodesHeard.push(_id);

        nodes.push({
            _id,
            nodeType: cls,
            hazards: cls === 'FG' ? ['FF', 'GL'] : ['FL', 'LS'],
            region: CFG.region,
            deployedAt: new Date(startDate.getTime() - irnd(5, 60) * 86400000),
            location: { type: 'Point', coordinates: [r6(lng), r6(lat)] },
            altitude_m: Math.round(uni(480, 940)),
            hw: {
                mcu: 'MKR Zero (SAMD21)', adcBits: 12, adcRefV: 3.3,
                storage: 'onboard microSD'
            },
            firmware: '2.1.0',
            radio: {
                type: 'E32-900T30D', addr: i + 1, channel: 23,
                airRate_bps: 2400, uart_bps: 9600, txPower_dBm: 30,
                gatewayId: gw._id
            },
            sensors: cls === 'FG' ? FG_SENSORS() : FS_SENSORS(),
            power: { source: 'external-5V-2A', battery_pct: null },
            status: 'active', lastSeen: null, synthetic: true,

            _sim: {
                gw, distKm: 0,
                drift: { mq4_ppm: 0, mq7_ppm: 0, mq135_ppm: 0, pm25: 0, soil_pct: 0 },
                // fractional drift per 30 days — MQ sensors move a few percent a
                // month, which is what makes recalibration (and keeping raw ADC
                // counts) necessary in the first place
                driftRate: {
                    mq4_ppm: uni(0.02, 0.06), mq7_ppm: uni(0.03, 0.09),
                    mq135_ppm: uni(0.02, 0.05), pm25: uni(0, 0.02),
                    soil_pct: uni(0, 0.01)
                },
                tempOffset: gauss(0, 1.2),
                rhOffset: gauss(0, 4),
                pmOffset: gauss(0, 6),
                soil: uni(18, 34),
                outageUntil: 0, stuckUntil: 0, stuckVals: null, oscUntil: 0,
                seq: irnd(1000, 9000),
                hist: {},           // transmitted values, for cross-sensor checking
                events: []
            }
        });
    });

    for (const n of nodes) {
        const [lng, lat] = n.location.coordinates;
        const [glng, glat] = n._sim.gw.location.coordinates;
        n._sim.distKm = Math.hypot((lat - glat) * 111, (lng - glng) * 105);
    }

    return { nodes, gateways };
}

// ---------------------------------------------------------------------------
// Hazard event scheduling
//
// Events have SHAPE and ANTECEDENTS, which is the whole point. A fire is a
// ramp across correlated sensors. A gas leak is methane moving with the
// temperature flat — that absence is the discriminator. A landslide needs
// days of prior rain in the soil channel before a vibration burst means
// anything. Generating only the moment of the event teaches nothing.
// ---------------------------------------------------------------------------

function scheduleEvents(nodes, t0, t1) {
    const span = t1 - t0;
    for (const n of nodes) {
        for (let k = 0, nEv = irnd(1, 3); k < nEv; k++) {
            const start = t0 + Math.floor(uni(0.08, 0.92) * span);
            if (n.nodeType === 'FG') {
                const kind = chance(0.55) ? 'FIRE_ONSET' : 'GAS_LEAK';
                n._sim.events.push({
                    kind, start,
                    ramp: kind === 'FIRE_ONSET' ? irnd(4, 9) * STEP_MS : irnd(1, 2) * STEP_MS,
                    hold: kind === 'FIRE_ONSET' ? irnd(6, 20) * STEP_MS : irnd(3, 10) * STEP_MS,
                    decay: kind === 'FIRE_ONSET' ? irnd(8, 24) * STEP_MS : irnd(2, 6) * STEP_MS,
                    mag: uni(0.6, 1.0)
                });
            } else {
                const kind = chance(0.5) ? 'FLOOD' : 'LANDSLIDE';
                n._sim.events.push({
                    kind, start,
                    wetFrom: start - irnd(2, 4) * 86400000,   // antecedent rainfall
                    ramp: irnd(3, 8) * STEP_MS,
                    hold: kind === 'FLOOD' ? irnd(20, 60) * STEP_MS : irnd(3, 8) * STEP_MS,
                    decay: irnd(20, 80) * STEP_MS,
                    mag: uni(0.6, 1.0)
                });
            }
        }
        n._sim.events.sort((a, b) => a.start - b.start);
    }
}

function envelope(ev, t) {
    const a = ev.start, b = a + ev.ramp, c = b + ev.hold, d = c + ev.decay;
    if (t < a || t > d) return 0;
    if (t < b) return (t - a) / ev.ramp;
    if (t < c) return 1;
    return 1 - (t - c) / ev.decay;
}

function activeEvent(node, t) {
    for (const ev of node._sim.events) {
        const e = envelope(ev, t);
        if (e > 0) return { ev, e };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Environment model — diurnal structure, not noise around a constant
// ---------------------------------------------------------------------------

function hourOfDay(t) {
    const d = new Date(t);
    return (d.getUTCHours() + 5.5 + d.getUTCMinutes() / 60) % 24;   // IST
}

function baseTemp(t, node) {
    const h = hourOfDay(t);
    const doy = new Date(t).getUTCMonth() * 30;
    const seasonal = 3 * Math.sin((2 * Math.PI * (doy - 100)) / 365);
    return 25 + seasonal + 7.5 * Math.sin((2 * Math.PI * (h - 9)) / 24)
        + node._sim.tempOffset;
}

const baseRH = (temp, node) =>
    clamp(62 - 1.9 * (temp - 25) + node._sim.rhOffset, 12, 98);

function basePM25(t, node) {
    const h = hourOfDay(t);
    const morn = 14 * Math.exp(-((h - 8) ** 2) / 3);
    const eve = 22 * Math.exp(-((h - 20) ** 2) / 6);
    return clamp(18 + morn + eve + node._sim.pmOffset, 2, 400);
}

function rainfallFactor(node, t) {
    let wet = 0;
    for (const ev of node._sim.events) {
        if (ev.wetFrom && t >= ev.wetFrom && t <= ev.start + ev.ramp + ev.hold) {
            wet = Math.max(wet, clamp((t - ev.wetFrom) / (ev.start - ev.wetFrom), 0, 1));
        }
    }
    return wet;
}

/** Mean state of every measurement at time t, before sensor noise. */
function envState(node, t) {
    const s = node._sim;
    const act = activeEvent(node, t);
    const e = act ? act.e * act.ev.mag : 0;
    const kind = act ? act.ev.kind : null;

    // slow calibration drift, scaled from per-30-days to per-transmission
    const dt = STEP_MS / (30 * 86400000);
    for (const k of Object.keys(s.drift)) s.drift[k] += s.driftRate[k] * dt;

    if (node.nodeType === 'FG') {
        let temp = baseTemp(t, node);
        let rh = baseRH(temp, node);
        let pm25 = basePM25(t, node);
        let mq4 = 1.8, mq7 = 1.1, mq135 = 0.9;

        if (kind === 'FIRE_ONSET') {
            temp += 24 * e;
            rh = clamp(rh - 30 * e, 8, 98);
            pm25 += 300 * e;
            mq7 += 70 * e;
            mq135 += 18 * e;
            mq4 += 3 * e;
        } else if (kind === 'GAS_LEAK') {
            // methane moves hard; temperature does NOT. That is the discriminator.
            mq4 += 180 * e;
            mq7 += 4 * e;
            mq135 += 3 * e;
        }

        return {
            means: {
                temp_c: temp,
                rh_pct: rh,
                pm25: pm25 * (1 + s.drift.pm25),
                mq4_ppm: mq4 * (1 + s.drift.mq4_ppm),
                mq7_ppm: mq7 * (1 + s.drift.mq7_ppm),
                mq135_ppm: mq135 * (1 + s.drift.mq135_ppm)
            },
            truth: kind && e > 0.15 ? kind : 'NORMAL'
        };
    }

    // FS node
    const wet = rainfallFactor(node, t);
    const target = 22 + 62 * wet + (kind === 'FLOOD' ? 20 * e : 0);
    s.soil += (target - s.soil) * 0.06 + gauss(0, 0.4);
    s.soil = clamp(s.soil, 5, 97);

    let vibHz = 0.4;                                  // ambient triggers/sec
    let peak = 0, fauna = false;
    if (kind === 'LANDSLIDE') {
        vibHz += 22 * e;
        peak = Math.round(uni(300, 900) * (0.4 + 0.6 * e));
    } else if (chance(0.02)) {
        // fauna / vehicle: shaking with no soil context. This is a genuine
        // false alarm the cross-check must suppress, so it is labelled as one.
        vibHz += uni(3, 9);
        peak = Math.round(uni(150, 400));
        fauna = true;
    }

    return {
        means: { soil_pct: s.soil * (1 + s.drift.soil_pct), vib_hz: vibHz },
        peak, fauna,
        truth: kind && e > 0.15 ? kind : 'NORMAL'
    };
}

// ---------------------------------------------------------------------------
// Raw 1 Hz window + fault injection
//
// These faults are exactly what the edge filter exists to remove. Injecting
// them at the raw-sample level is the only way the filter can be scored
// honestly — a fault injected into the transmitted summary would be
// indistinguishable from a real reading.
// ---------------------------------------------------------------------------

function rawBurst(node, means, t) {
    const s = node._sim;
    const N = CFG.windowN;
    const out = {};
    let injected = null;

    // STUCK: a frozen sensor reports one identical value for many windows
    if (t < s.stuckUntil && s.stuckVals) {
        for (const k of Object.keys(means)) out[k] = new Array(N).fill(s.stuckVals[k]);
        return { samples: out, injected: 'STUCK' };
    }
    if (chance(CFG.pStuck)) {
        s.stuckUntil = t + irnd(6, 40) * STEP_MS;
        s.stuckVals = Object.fromEntries(
            Object.entries(means).map(([k, v]) => [k, r2(v)]));
        for (const k of Object.keys(means)) out[k] = new Array(N).fill(s.stuckVals[k]);
        return { samples: out, injected: 'STUCK' };
    }

    for (const [k, mu] of Object.entries(means)) {
        if (COUNT_CHANNELS.has(k)) {
            out[k] = Array.from({ length: N }, () => poisson(mu));
            continue;
        }
        const sd = NOISE[k] ?? Math.max(0.01, Math.abs(mu) * 0.02);
        const floorAt = k === 'temp_c' ? -Infinity : 0;   // temperature may be < 0
        out[k] = Array.from({ length: N }, () => Math.max(floorAt, mu + gauss(0, sd)));
    }

    // HEATER_OSC: MQ-7 wobble with no physical cause. Kurtosis will not see a
    // sinusoid, so this one has to be caught by the cross-sensor check.
    if (out.mq7_ppm) {
        if (t < s.oscUntil || chance(CFG.pHeaterOsc)) {
            if (t >= s.oscUntil) s.oscUntil = t + irnd(8, 30) * STEP_MS;
            out.mq7_ppm = out.mq7_ppm.map((x, i) => x * (1 + 0.85 * Math.sin(i / 4)) + 6);
            injected = 'HEATER_OSC';
        }
    }

    // RAIL: an ADC reading pinned to 0 or full scale — a loose wire
    if (chance(CFG.pRail)) {
        const k = pick(Object.keys(out));
        const lim = LIMITS[k];
        const i = irnd(0, N - 1);
        out[k][i] = chance(0.5) ? (lim ? lim[0] - 20 : -999)
            : (lim ? lim[1] + 200 : 99999);
        injected = 'RAIL';
    } else if (chance(CFG.pSpike)) {
        // SPIKE: one or two impulsive samples
        const k = pick(Object.keys(out));
        for (let j = 0, m = irnd(1, 2); j < m; j++) {
            const i = irnd(0, N - 1);
            out[k][i] = out[k][i] * uni(4, 10) + uni(5, 40);
        }
        injected = 'SPIKE';
    }

    return { samples: out, injected };
}

// ---------------------------------------------------------------------------
// Edge filter — reference implementation. Port this to firmware.
// Operates on the raw window; emits one clean value plus QC metadata.
// ---------------------------------------------------------------------------

function edgeFilter(node, samples) {
    const flags = [];
    const kurt = {}, madOut = {}, clean = {};
    let rejected = 0;

    for (const [key, winRaw] of Object.entries(samples)) {
        const K = key.toUpperCase();
        const isCount = COUNT_CHANNELS.has(key);

        // 1. Range gate — physically impossible means broken, not extreme
        const lim = LIMITS[key];
        const win = [];
        let outOfRange = 0;
        for (const x of winRaw) {
            if (lim && (x < lim[0] || x > lim[1])) { outOfRange++; continue; }
            win.push(x);
        }
        if (outOfRange > 0) { flags.push(`RANGE_REJECT_${K}`); rejected++; }
        if (!win.length) { clean[key] = null; continue; }

        const med = median(win);
        const d = mad(win);
        const k = kurtosis(win);
        kurt[key] = r2(k);
        madOut[key] = r2(d);

        // 2. Stuck sensor — zero dispersion across an entire window of live data.
        //    Not applicable to counting channels: a quiet SW-420 legitimately
        //    reads zero all window, and is indistinguishable from a dead one.
        //    Detect a dead vibration sensor by absence over days, not seconds.
        if (!isCount && d === 0 && win.length >= CFG.windowN * 0.8) {
            flags.push(`${K}_STUCK`);
            rejected++;
            clean[key] = r2(med);
            continue;
        }

        // Counting channels (Poisson) are legitimately heavy-tailed at low
        // rates. Range and stuck gates apply; z-score and kurtosis do not.
        if (isCount) {
            clean[key] = r2(win.reduce((a, b) => a + b, 0) / win.length);
            continue;
        }

        // 3. Robust outlier rejection, MAD-based.
        //    Trimming one or two mild outliers from 60 samples is normal healthy
        //    operation, NOT an anomaly — with gaussian noise a 3.5-sigma sample
        //    turns up in ~3% of windows per channel by chance alone. Trim always;
        //    raise a FLAG only when the excursion is severe or repeated.
        const survivors = [];
        let worstZ = 0, nRej = 0;
        for (const x of win) {
            const z = Math.abs(modZ(x, med, d));
            if (z > worstZ) worstZ = z;
            if (z > CFG.zThresh) { nRej++; } else { survivors.push(x); }
        }
        if (nRej >= CFG.spikeMinCount || worstZ > CFG.spikeSevereZ) {
            flags.push(`${K}_SPIKE_REJECTED`);
            rejected++;
        }
        const base = survivors.length ? survivors : win;

        // 4. Kurtosis gate. Heavy tails mean impulsive content — but a REAL
        //    onset also lifts kurtosis. The discriminator is whether a sustained
        //    trend sits underneath. Trend => keep and escalate. No trend =>
        //    freak event, fall back to the median.
        if (k > CFG.kurtThresh) {
            const sl = Math.abs(slope(win.slice(-15)));
            if (sl < CFG.trendFrac * (d || 1)) {
                flags.push(`${K}_HIGH_KURT`);
                rejected++;
                clean[key] = r2(med);
                continue;
            }
        }

        clean[key] = r2(base.reduce((a, b) => a + b, 0) / base.length);
    }

    return { clean, flags, kurt, mad: madOut, rejected };
}

/**
 * Cross-sensor consistency, over the last few TRANSMITTED values.
 * The strongest hallucination filter available: one channel moving while
 * its physically coupled neighbours sit flat is far more likely to be a
 * sensor fault than a real event.
 */
function crossCheck(node, v) {
    const h = node._sim.hist;
    for (const [k, val] of Object.entries(v)) {
        if (val === null) continue;
        (h[k] ||= []).push(val);
        if (h[k].length > 12) h[k].shift();
    }

    const rose = (key, frac) => {
        const w = h[key];
        if (!w || w.length < 8) return false;
        const mr = median(w.slice(-3));
        const mb = median(w.slice(-8, -4));
        return mb > 0 ? (mr - mb) / mb > frac : mr - mb > frac;
    };

    if (node.nodeType === 'FG') {
        const coUp = rose('mq7_ppm', 0.5);
        const tempUp = rose('temp_c', 0.05);
        const pmUp = rose('pm25', 0.4);
        const ch4Up = rose('mq4_ppm', 0.5);
        // CO alone with everything flat: classic MQ-7 heater instability
        if (coUp && !tempUp && !pmUp && !ch4Up) return 'HOLD';
        return 'PASS';
    }

    // shaking with dry ground and no antecedent rain: cattle, vehicle, wind
    if ((v.vib_hz ?? 0) > 2.5 && (v.soil_pct ?? 0) < 55) return 'HOLD';
    return 'PASS';
}

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------

function scoreRisk(node, v, cc) {
    let score = 0;
    const parts = [];

    if (node.nodeType === 'FG') {
        if (v.temp_c > 40) { score += 0.28; parts.push('temp_rise'); }
        if (v.rh_pct < 25) { score += 0.12; parts.push('rh_drop'); }
        if (v.pm25 > 150) { score += 0.26; parts.push('pm25'); }
        if (v.mq7_ppm > 35) { score += 0.20; parts.push('co'); }
        if (v.mq135_ppm > 12) { score += 0.14; parts.push('voc'); }
        if (v.mq4_ppm > 60) { score += 0.30; parts.push('ch4'); }
    } else {
        if (v.soil_pct > 75) { score += 0.30; parts.push('soil_sat'); }
        if (v.soil_pct > 92) { score += 0.22; parts.push('soil_crit'); }
        if (v.vib_count > 25) { score += 0.30; parts.push('vibration'); }
        if (v.vib_rms > 0.6) { score += 0.18; parts.push('vib_energy'); }
    }

    if (cc === 'HOLD') score *= 0.45;          // unconfirmed, damp it
    score = clamp(score, 0, 1);

    const level = score >= 0.75 ? 'CRITICAL'
        : score >= 0.50 ? 'HIGH'
            : score >= 0.28 ? 'WATCH' : 'NORMAL';

    return { score: r2(score), level, rule: parts.join('+') || 'baseline' };
}

// ---------------------------------------------------------------------------
// ADC synthesis — engineering units back to raw 12-bit counts
// ---------------------------------------------------------------------------

const DIVIDER = 0.643, ADC_MAX = 4095, VREF = 3.3;
const toAdc = (volts) => clamp(Math.round((volts * DIVIDER / VREF) * ADC_MAX), 0, ADC_MAX);
const vFromPpm = {
    mq4: (p) => clamp(0.35 + 0.55 * Math.log10(1 + p), 0, 5),
    mq7: (p) => clamp(0.30 + 0.62 * Math.log10(1 + p), 0, 5),
    mq135: (p) => clamp(0.40 + 0.95 * Math.log10(1 + p), 0, 5)
};

// ---------------------------------------------------------------------------
// Main generation loop
// ---------------------------------------------------------------------------

function generate() {
    const t1 = Date.now() - (Date.now() % STEP_MS);
    const t0 = t1 - CFG.days * 86400000;
    const startDate = new Date(t0);

    const { nodes, gateways } = buildNetwork(startDate);
    scheduleEvents(nodes, t0, t1);

    const readings = [], events = [];
    let dropped = 0;

    for (let t = t0; t <= t1; t += STEP_MS) {
        for (const node of nodes) {
            const s = node._sim;

            // bursty outages, not uniform random loss
            if (t < s.outageUntil) { s.seq++; dropped++; continue; }
            if (chance(CFG.outageChance)) {
                s.outageUntil = t + irnd(CFG.outageMinHours, CFG.outageMaxHours) * 3600000;
                s.seq++; dropped++; continue;
            }

            const env = envState(node, t);
            const burst = rawBurst(node, env.means, t);
            const samples = burst.samples;
            const injected = burst.injected || (env.fauna ? 'FAUNA' : null);
            s.seq++;
            if (chance(CFG.baseLossPct)) { dropped++; continue; }

            const filt = edgeFilter(node, samples);
            const v = { ...filt.clean };

            // vibration is transmitted as a window total, not a rate
            if (node.nodeType === 'FS') {
                const hz = v.vib_hz ?? 0;
                v.vib_count = Math.round(hz * CFG.windowN);
                v.vib_rms = r2(clamp(hz / 12, 0, 3));
                v.vib_peak_ms = env.peak;
            }

            const cc = crossCheck(node, v);
            const flags = [...filt.flags];
            if (node.nodeType === 'FG') flags.push('MQ7_QUALITATIVE');
            if (cc === 'HOLD') flags.push('CROSS_HOLD');

            const q = {
                flags, kurt: filt.kurt, mad: filt.mad,
                nWin: CFG.windowN, rejected: filt.rejected, crossCheck: cc
            };
            const risk = scoreRisk(node, v, cc);

            const adc = node.nodeType === 'FG'
                ? {
                    mq4: toAdc(vFromPpm.mq4(v.mq4_ppm ?? 0)),
                    mq7: toAdc(vFromPpm.mq7(v.mq7_ppm ?? 0)),
                    mq135: toAdc(vFromPpm.mq135(v.mq135_ppm ?? 0)),
                    pm25: toAdc(0.6 + 0.005 * (v.pm25 ?? 0))
                }
                : { soil: clamp(Math.round(3100 - ((v.soil_pct ?? 0) / 100) * 1850), 0, ADC_MAX) };

            const latency = Math.round(uni(1800, 9500) + (cc === 'HOLD' ? 400 : 0));
            const rssi = Math.round(clamp(
                -62 - 20 * Math.log10(Math.max(0.2, s.distKm)) + gauss(0, 4), -128, -40));

            const ts = new Date(t);
            if (node.nodeType === 'FS') delete v.vib_hz;

            readings.push({
                ts,
                meta: {
                    nodeId: node._id, nodeType: node.nodeType, hazards: node.hazards,
                    region: node.region, gatewayId: node.radio.gatewayId
                },
                link: {
                    rxAt: new Date(t + latency), latency_ms: latency, rssi,
                    seq: s.seq, retries: rssi < -110 ? irnd(1, 3) : 0
                },
                v, adc, q, risk,
                sdRef: sdRef(node, ts),
                _truth: { state: env.truth, injectedAnomaly: injected },
                synthetic: true
            });

            node.lastSeen = ts;
            s.gw.lastSeen = ts;

            if ((risk.level === 'HIGH' || risk.level === 'CRITICAL') && cc === 'PASS') {
                const last = [...events].reverse().find((e) => e.nodeId === node._id);
                if (!last || t - last.ts.getTime() > 6 * STEP_MS) {
                    events.push(makeEvent(node, ts, latency, v, risk, env.truth));
                }
            }
        }
    }

    return { nodes, gateways, readings, events, dropped };
}

function sdRef(node, ts) {
    const d = ts.toISOString().slice(0, 10);
    const hm = ts.toISOString().slice(11, 16).replace(':', '');
    return `${d}/${node.nodeType}${node._id.slice(-4)}_${hm}.csv`;
}

function makeEvent(node, ts, latency, v, risk, truth) {
    const hazard = node.nodeType === 'FG'
        ? ((v.mq4_ppm ?? 0) > 60 && (v.temp_c ?? 0) < 40 ? 'GL' : 'FF')
        : ((v.soil_pct ?? 0) > 90 ? 'FL' : 'LS');

    return {
        nodeId: node._id, hazard, region: node.region, location: node.location,
        ts, detectedAt: new Date(ts.getTime() + latency),
        level: risk.level, score: risk.score, rule: risk.rule,
        trigger: {
            peak: node.nodeType === 'FG'
                ? { temp_c: v.temp_c, pm25: v.pm25, mq7_ppm: v.mq7_ppm, mq4_ppm: v.mq4_ppm }
                : { soil_pct: v.soil_pct, vib_count: v.vib_count, vib_rms: v.vib_rms }
        },
        img: null,                      // populated by the webcam path via Cloudinary
        ack: { state: 'OPEN', by: null, at: null, notes: null },
        _truth: { state: truth },
        synthetic: true
    };
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

async function ensureCollections(db) {
    const names = () => db.listCollections().toArray().then((c) => c.map((x) => x.name));
    let existing = await names();

    if (CFG.drop) {
        for (const c of ['readings', 'events', 'nodes', 'gateways']) {
            if (existing.includes(c)) await db.collection(c).drop();
        }
        existing = await names();
    }

    // readings MUST be created explicitly. Inserting first silently produces an
    // ordinary collection, losing columnar compression and bucketing — and it
    // cannot be converted afterwards.
    if (!existing.includes('readings')) {
        await db.createCollection('readings', {
            timeseries: { timeField: 'ts', metaField: 'meta', granularity: 'minutes' },
            expireAfterSeconds: 60 * 60 * 24 * 365
        });
        console.log('  created time-series collection: readings');
    }
}

async function createIndexes(db) {
    await db.collection('readings').createIndexes([
        { key: { 'meta.nodeId': 1, ts: -1 } },
        { key: { 'meta.hazards': 1, ts: -1 } },
        { key: { 'meta.gatewayId': 1, ts: -1 } }
    ]);
    await db.collection('nodes').createIndexes([
        { key: { location: '2dsphere' } },
        { key: { nodeType: 1, region: 1, status: 1 } },
        { key: { lastSeen: -1 } }
    ]);
    await db.collection('events').createIndexes([
        { key: { location: '2dsphere' } },
        { key: { 'ack.state': 1, ts: -1 } },
        { key: { nodeId: 1, ts: -1 } }
    ]);
    await db.collection('gateways').createIndexes([{ key: { status: 1, lastSeen: -1 } }]);
}

async function insertChunked(coll, docs, size = 2000) {
    for (let i = 0; i < docs.length; i += size) {
        await coll.insertMany(docs.slice(i, i + size), { ordered: false });
        process.stdout.write(`\r  ${coll.collectionName}: ${Math.min(i + size, docs.length)}/${docs.length}`);
    }
    process.stdout.write('\n');
}

function report(out) {
    const { nodes, readings, events, dropped } = out;
    const byTruth = {}, byAnom = {};
    for (const r of readings) {
        byTruth[r._truth.state] = (byTruth[r._truth.state] || 0) + 1;
        if (r._truth.injectedAnomaly)
            byAnom[r._truth.injectedAnomaly] = (byAnom[r._truth.injectedAnomaly] || 0) + 1;
    }

    console.log('\n--- generated ---');
    console.log(`nodes            ${nodes.length} (FG ${CFG.nFG} / FS ${CFG.nFS})`);
    console.log(`span             ${CFG.days} days @ ${CFG.intervalMin} min`);
    console.log(`readings         ${readings.length}`);
    console.log(`packets dropped  ${dropped} (${(100 * dropped / (dropped + readings.length)).toFixed(1)}%)`);
    console.log(`events           ${events.length}`);
    console.log('ground truth     ', byTruth);
    console.log('injected faults  ', byAnom);

    // Filter effectiveness against ground truth. A fault counts as caught if
    // any QC flag fired or the cross-check held the reading.
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const r of readings) {
        const isAnom = !!r._truth.injectedAnomaly;
        const caught = r.q.rejected > 0 || r.q.crossCheck === 'HOLD';
        if (isAnom && caught) tp++;
        else if (!isAnom && caught) fp++;
        else if (isAnom && !caught) fn++;
        else tn++;
    }
    const prec = tp / Math.max(1, tp + fp);
    const rec = tp / Math.max(1, tp + fn);
    const f1 = 2 * prec * rec / Math.max(1e-9, prec + rec);

    console.log('\nedge filter vs ground truth');
    console.log(`  precision ${prec.toFixed(3)}  recall ${rec.toFixed(3)}  F1 ${f1.toFixed(3)}`);
    console.log(`  tp ${tp}  fp ${fp}  fn ${fn}  tn ${tn}`);

    // Did the filter eat any real hazard onsets? This is the number that matters.
    let onsetTotal = 0, onsetSuppressed = 0;
    for (const r of readings) {
        if (r._truth.state === 'NORMAL') continue;
        onsetTotal++;
        if (r.q.crossCheck === 'HOLD') onsetSuppressed++;
    }
    console.log(`  real onsets damped by cross-check: ${onsetSuppressed}/${onsetTotal}` +
        ` (${(100 * onsetSuppressed / Math.max(1, onsetTotal)).toFixed(1)}%)`);
    console.log('  tune CFG.zThresh / kurtThresh / trendFrac against these.');
}

async function main() {
    console.log(`seed=${CFG.seed}  db=${CFG.dbName}  days=${CFG.days}`);
    const out = generate();
    report(out);

    if (CFG.dryRun) { console.log('\n--dry-run: nothing written'); return; }
    if (CFG.dbName === 'firewatch') {
        throw new Error('refusing to write synthetic data into the production database');
    }

    const { MongoClient } = require('mongodb');
    const client = new MongoClient(CFG.uri);
    await client.connect();
    const db = client.db(CFG.dbName);

    console.log(`\nwriting to ${CFG.dbName} ...`);
    await ensureCollections(db);

    const nodeDocs = out.nodes.map(({ _sim, ...n }) => n);
    if (CFG.drop || (await db.collection('nodes').countDocuments()) === 0) {
        await db.collection('nodes').insertMany(nodeDocs, { ordered: false });
        await db.collection('gateways').insertMany(out.gateways, { ordered: false });
        console.log(`  nodes: ${nodeDocs.length}, gateways: ${out.gateways.length}`);
    }

    await insertChunked(db.collection('readings'), out.readings);
    if (out.events.length) await insertChunked(db.collection('events'), out.events);

    await createIndexes(db);
    console.log('  indexes created');
    await client.close();
    console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
