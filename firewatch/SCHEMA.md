# Multi-Hazard Sensing Network — MongoDB Schema

Database: `firewatch` (production) / `firewatch_sim` (synthetic)

Four collections. They are separate because their write rates differ by roughly
four orders of magnitude — embedding readings inside a node document would hit
the 16 MB BSON ceiling within days.

| Collection | Cardinality | Write pattern | Read pattern |
|---|---|---|---|
| `nodes` | one doc per physical box | rare — deploy, recalibrate, status change | joined on almost every dashboard query |
| `gateways` | one doc per ESP32 | rare | network health panel |
| `readings` | one doc per transmission — millions | append-only, high frequency | time-range + node filter |
| `events` | one doc per threshold crossing | occasional | the collection the command centre actually polls |

---

## 1. Identifier scheme

### Node ID — 12 characters

Stored without separators, displayed with them.

```
FGMH26090042
││ ││ ││││││
││ ││ ││└┴┴┴─ sequence, 4 chars base36  → 1.68 M per prefix
││ ││ └┴───── deploy month, YYMM
││ └┴──────── region code
└┴─────────── node class
```

**Node class** (2 chars) — the hazard pair the box serves:

| Code | Node type | Sensors |
|---|---|---|
| `FG` | Fire + Gas leak | MQ-4, MQ-7, MQ-135, DHT11, GP2Y1010AU0F |
| `FS` | Flood + Slope (landslide) | LM393 soil moisture, SW-420 vibration |

**Region** (2 chars) — state or forest-division code: `MH`, `UK`, `HP`.

**Deploy month** (`YYMM`) — not decoration. MQ sensors drift, so knowing a node's
age is what lets you spot calibration decay across a cohort rather than one box
at a time.

**Sequence** (4 chars base36) — 1,679,616 nodes per class/region/month. A LoRa
grid at E32 range (3–8 km line of sight in forest terrain) realistically runs a
few hundred to a few thousand nodes per district, so this is generous.

Latitude and longitude are deliberately **not** encoded in the ID. They live in
the node document as a GeoJSON point so a `2dsphere` index can drive the GIS
layer. Nodes also get moved; IDs should not.

### Sensor ID

```
<nodeId>:<sensorCode>[:<index>]

FGMH26090042:MQ7        the CO channel on that node
FSMH26090007:SM:2       second soil probe on that node
```

### Gateway ID

```
GW-MH-01
```

---

## 2. `nodes`

Registry. One document per deployed box.

```js
{
  _id: "FGMH26090042",
  nodeType: "FG",
  hazards: ["FF", "GL"],              // array — a node serves two hazards
  region: "MH",
  deployedAt: ISODate("2026-09-07T00:00:00Z"),

  location: { type: "Point", coordinates: [73.8567, 18.5204] },   // [lng, lat]
  altitude_m: 612,

  hw: {
    mcu: "MKR Zero (SAMD21)",
    adcBits: 12,
    adcRefV: 3.3,
    storage: "onboard microSD"
  },
  firmware: "2.1.0",

  radio: {
    type: "E32-900T30D",
    addr: 66,
    channel: 23,
    airRate_bps: 2400,
    uart_bps: 9600,
    txPower_dBm: 30,
    gatewayId: "GW-MH-01"
  },

  sensors: [
    { code: "MQ4",   model: "MQ-4",  pin: "A0", unit: "ppm",
      divider: 0.643, calib: { r0: 9.81, curve: [-0.318, 1.133] },
      burnInComplete: true, lastCalib: ISODate("2026-09-05T00:00:00Z") },

    { code: "MQ7",   model: "MQ-7",  pin: "A1", unit: "ppm",
      divider: 0.643, calib: { r0: 10.24, curve: [-0.770, 0.876] },
      heaterCycled: false,            // fixed 5 V rail, no MOSFET
      confidence: "qualitative",      // so the UI never shows fake ppm
      burnInComplete: true, lastCalib: ISODate("2026-09-05T00:00:00Z") },

    { code: "MQ135", model: "MQ-135", pin: "A2", unit: "ppm",
      divider: 0.643, calib: { r0: 11.42, curve: [-0.420, 1.050] },
      burnInComplete: true, lastCalib: ISODate("2026-09-05T00:00:00Z") },

    { code: "PM25",  model: "GP2Y1010AU0F", pin: "A3", ledPin: "D2",
      unit: "ug/m3", divider: 0.643,
      calib: { vNoDust: 0.60, slope: 0.172 } },

    { code: "DHT",   model: "DHT11", pin: "D3", unit: ["C", "%RH"] }
  ],

  power: { source: "external-5V-2A", battery_pct: null },
  status: "active",                   // active | degraded | offline | retired
  lastSeen: ISODate("2026-09-07T11:30:00Z")
}
```

**Notes**

- `hazards` is an array, not a string. A single string cannot express a
  two-hazard node, and you will want to query "every node covering `GL`".
- `divider` records the 10 kΩ / 18 kΩ resistor ratio (0.643). It belongs in the
  document because if you rebuild a node with different resistors, every
  historical ADC count needs the *old* ratio to be interpretable.
- `heaterCycled: false` and `confidence: "qualitative"` on MQ-7 record that CO
  is not calibrated under the current wiring. Correct MQ-7 operation needs a
  60 s / 90 s heater cycle that a fixed 5 V rail cannot provide. The dashboard
  should read this flag and render a band, not a number.

An `FS` node is the same shape with a shorter sensor array:

```js
sensors: [
  { code: "SM",  model: "LM393",  pin: "A0", unit: "pct",
    divider: 0.643, calib: { dry: 3100, wet: 1250 } },
  { code: "VIB", model: "SW-420", pin: "D3", unit: "count" }
]
```

---

## 3. `gateways`

The ESP32 became a real network element the moment the radio hop appeared. When
a node goes quiet you need to know whether the node died or its gateway did.

```js
{
  _id: "GW-MH-01",
  region: "MH",
  location: { type: "Point", coordinates: [73.8600, 18.5300] },
  mcu: "ESP32-WROOM-32",
  radio: { type: "E32-900T30D", channel: 23, addr: 0 },
  uplink: { kind: "wifi", endpoint: "https://api.internal/ingest" },
  nodesHeard: ["FGMH26090042", "FSMH26090007"],
  status: "online",
  lastSeen: ISODate("2026-09-07T11:30:04Z")
}
```

---

## 4. `readings`

**A MongoDB time-series collection.** This is the only collection that cannot be
created implicitly — see §7.

```js
{
  ts: ISODate("2026-09-07T11:30:00Z"),   // sampled AT THE NODE

  meta: {                                // everything you filter or group by
    nodeId:    "FGMH26090042",
    nodeType:  "FG",
    hazards:   ["FF", "GL"],
    region:    "MH",
    gatewayId: "GW-MH-01"
  },

  link: {                                // the radio hop
    rxAt:       ISODate("2026-09-07T11:30:04Z"),
    latency_ms: 4120,
    rssi:       -97,
    seq:        18431,                   // gap detection without polling
    retries:    0
  },

  v: {                                   // engineering units
    mq4_ppm: 2.10, mq7_ppm: 18.40, mq135_ppm: 0.90,
    temp_c: 31.2, rh_pct: 44, pm25: 62
  },

  adc: {                                 // raw 12-bit counts
    mq4: 1204, mq7: 1876, mq135: 998, pm25: 1502
  },

  q: {                                   // edge quality control
    flags:      ["PM25_SPIKE_REJECTED", "MQ7_QUALITATIVE"],
    kurt:       { pm25: 9.4, mq7: 1.2, temp: 0.8 },
    mad:        { pm25: 3.1, mq7: 0.4 },
    nWin:       60,
    rejected:   2,
    crossCheck: "PASS"                   // PASS | HOLD | FAIL
  },

  risk: { score: 0.72, level: "HIGH", rule: "temp_rise+co+pm25" },

  sdRef: "2026-09-07/FG0042_1130.csv"    // pointer to the microSD backup
}
```

An `FS` reading is the same document shape with different measurement keys:

```js
v:   { soil_pct: 38.4, vib_count: 7, vib_peak_ms: 340, vib_rms: 0.21 },
adc: { soil: 1653 }
```

### Why raw ADC counts are kept

MQ sensors drift. When you recalibrate `r0` in six months, every historical ppm
value computed with the old `r0` becomes wrong. Keeping the 12-bit counts lets
you re-derive the entire history against the new calibration. Without them, a
recalibration silently invalidates your training set. This costs about 20 bytes
per document, which time-series columnar compression largely absorbs.

### Why `q` and `risk` are computed at the edge

Time-series documents are immutable in practice — you cannot patch a reading
after insert. So every derived field must exist before the write. This is the
right architecture regardless: the node has the full 1 Hz sample window, while
the server only ever sees the 10-minute summary. The filtering has to happen
where the data is.

### Quality flags

| Flag | Meaning |
|---|---|
| `RANGE_REJECT_<sensor>` | outside physical limits — disconnected or railed |
| `<sensor>_SPIKE_REJECTED` | modified z-score > 3.5, replaced with window median |
| `<sensor>_STUCK` | identical value for the whole window — frozen sensor |
| `<sensor>_HIGH_KURT` | excess kurtosis > 3 with no sustained trend — freak event |
| `MQ7_QUALITATIVE` | CO uncalibrated, heater not cycled |
| `CROSS_HOLD` | one sensor moved, corroborating sensors did not |

`crossCheck` is the strongest hallucination filter available. CO up with temp,
PM2.5 and methane flat is far more likely to be MQ-7 heater instability than a
fire. Vibration burst with soil moisture unchanged and no antecedent rain is far
more likely to be cattle than a slope failure.

---

## 5. `events`

Written only when the edge or the server decides something crossed a threshold.
This is what the command centre polls; `readings` is for charts and forensics.

```js
{
  _id: ObjectId(),
  nodeId: "FGMH26090042",
  hazard: "FF",
  region: "MH",
  location: { type: "Point", coordinates: [73.8567, 18.5204] },

  ts:         ISODate("2026-09-07T11:30:00Z"),   // onset
  detectedAt: ISODate("2026-09-07T11:30:04Z"),   // gateway receipt

  level: "HIGH",                       // WATCH | HIGH | CRITICAL
  score: 0.72,
  rule:  "temp_rise+co+pm25",

  trigger: {                           // snapshot of the deciding window
    window: [ /* last N readings, denormalised */ ],
    peak:   { temp_c: 46.1, pm25: 310, mq7_ppm: 84 }
  },

  img: {                               // webcam evidence, via Cloudinary
    publicId:   "firewatch/ev_20260907_113000",
    secureUrl:  "https://res.cloudinary.com/.../ev_20260907_113000.jpg",
    width: 1280, height: 720,
    capturedAt: ISODate("2026-09-07T11:30:12Z")
  },

  ack: {
    state:      "OPEN",                // OPEN | ACKED | RESOLVED | FALSE_POSITIVE
    by:         null,
    at:         null,
    notes:      null
  }
}
```

`ack.state: "FALSE_POSITIVE"` is the most valuable field in the whole schema.
Operator dispositions are the only source of real labels you will ever get, and
they are what eventually replaces synthetic training data.

---

## 6. Indexes

```js
db.readings.createIndex({ "meta.nodeId": 1, ts: -1 })
db.readings.createIndex({ "meta.hazards": 1, ts: -1 })
db.readings.createIndex({ "meta.gatewayId": 1, ts: -1 })

db.nodes.createIndex({ location: "2dsphere" })              // GIS layer
db.nodes.createIndex({ nodeType: 1, region: 1, status: 1 })
db.nodes.createIndex({ lastSeen: -1 })                      // dead-node sweep

db.events.createIndex({ location: "2dsphere" })
db.events.createIndex({ "ack.state": 1, ts: -1 })           // open-alert queue
db.events.createIndex({ nodeId: 1, ts: -1 })

db.gateways.createIndex({ status: 1, lastSeen: -1 })
```

---

## 7. Creating the collections

`nodes`, `gateways` and `events` are ordinary collections — insert and they
appear. **`readings` is not.** A time-series collection must be created
explicitly *before the first insert*.

```js
await db.createCollection("readings", {
  timeseries: {
    timeField: "ts",
    metaField: "meta",
    granularity: "minutes"          // matches a 10–15 min transmit interval
  },
  expireAfterSeconds: 60 * 60 * 24 * 365    // optional auto-purge
});
```

If you insert first, Mongo silently creates a normal collection. You lose the
columnar compression (roughly 5–10× on telemetry) and the bucketing
optimisations, and you **cannot convert it afterwards** — you would have to drop
and re-ingest.

Two consequences worth internalising:

1. Anything you filter or group by must live inside `meta`. Fields outside
   `meta` are treated as measurements and are much more expensive to filter on.
2. Readings are effectively immutable. Compute `q` and `risk` before writing.

---

## 8. Synthetic data

Generated by `generate_synthetic.js` into a **separate database**,
`firewatch_sim`. Never the production database — synthetic telemetry that leaks
into real collections is very hard to unpick, and a stray `synthetic: true`
filter is easy to forget.

Synthetic documents carry one extra field the real pipeline never produces:

```js
_truth: {
  state:           "NORMAL",   // NORMAL | FIRE_ONSET | GAS_LEAK | FLOOD | LANDSLIDE
  injectedAnomaly: null        // null | SPIKE | RAIL | STUCK | HEATER_OSC | FAUNA
}
```

| Injected fault | What it simulates | Which gate should catch it |
|---|---|---|
| `SPIKE` | one or two impulsive samples | modified z-score |
| `RAIL` | ADC pinned to 0 or full scale | range gate |
| `STUCK` | frozen sensor, identical value for many windows | zero-MAD test |
| `HEATER_OSC` | MQ-7 heater instability, periodic wobble | cross-sensor check |
| `FAUNA` | cattle or vehicle shaking an FS node on dry ground | cross-sensor check |

This is what makes the synthetic set worth generating. Without ground-truth
labels you cannot measure whether the kurtosis + MAD filter is catching
anomalies or eating real onsets — you can only look at charts and hope. With
them you get precision and recall, which is the only honest way to set
thresholds.

Strip `_truth` before anything downstream reads the data:

```js
db.readings.find({ ... }, { projection: { _truth: 0 } })
```

### What synthetic data is and is not good for

Good for: building the dashboard, exercising the ingest path, load-testing
queries, validating the filter chain, and setting initial thresholds.

Not good for: training the final detection model. A model trained on the
generator learns the generator's assumptions. It will score well on held-out
synthetic data and then fail on the first real sensor, because reality's noise
structure is not the one that was coded. Retrain on real telemetry once nodes
are logging — keeping `adc` counts is what makes that retraining possible.
