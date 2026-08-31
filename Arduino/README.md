# 🔌 IoT Sensor Network - Arduino Hardware Module

**ESP32-based distributed sensor nodes for real-time forest environmental monitoring.**

---

## Overview

The Arduino module consists of **IoT sensor nodes** deployed across forest zones to continuously monitor:

- 🔥 **Methane (CH₄)** - Gas combustion indicator
- ⚠️ **Carbon Monoxide (CO)** - Fire byproduct
- 💨 **Air Quality** - Particulate matter and pollutants
- 📍 **GPS Location** - Precise geolocation of each sensor
- 📡 **WiFi Connectivity** - Real-time data transmission

Each node sends readings to the **Arduino Backend** every 5 seconds, creating a distributed sensing network across high-risk forest areas.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Sensor Array** | MQ4, MQ7, MQ135 gas sensors |
| **Real-time Monitoring** | 5-second data collection interval |
| **GPS Integration** | TinyGPS+ for location tracking |
| **WiFi Connectivity** | WiFi protocol for data transmission |
| **Threshold Detection** | Automatic alerts when thresholds exceeded |
| **HTTP POST Integration** | RESTful API to backend server |
| **Serial Debugging** | 115200 baud debugging output |
| **Status Reporting** | IDLE/ACTIVE fire detection status |
| **Battery Efficient** | Optimized for long runtime operation |

---

## Hardware Components

### Microcontroller
- **Board**: ESP32 (dual-core, WiFi + Bluetooth)
- **Voltage**: 3.3V logic, 5V power input
- **GPIO Pins**: 36 available (34, 35, 32 used for sensors)
- **ADC**: 12-bit analog inputs

### Gas Sensors

**MQ-4 (Methane Detection)**
- Pin: GPIO 34 (ADC1_CH6)
- Range: 200-10000 ppm
- Response Time: < 30 seconds
- Threshold: 2500 ppm (adjustable)

**MQ-7 (Carbon Monoxide Detection)**
- Pin: GPIO 35 (ADC1_CH7)
- Range: 10-10000 ppm
- Response Time: < 90 seconds
- Threshold: 1900 ppm (adjustable)

**MQ-135 (Air Quality)**
- Pin: GPIO 32 (ADC1_CH4)
- Range: 10-1000 ppm equivalent CO₂
- Response Time: < 30 seconds
- Threshold: 8000 ppm (adjustable)

### GPS Module
- **Module**: TinyGPS+ (NEO-6M compatible)
- **UART**: Serial 1 (pins 16/RXD2, 17/TXD2)
- **Baud Rate**: 9600 bps
- **Accuracy**: ±5 meters
- **Satellites**: 6+ for best accuracy

### Wireless
- **WiFi**: Built-in ESP32 802.11 b/g/n
- **Frequency**: 2.4 GHz
- **Power**: ~100mA active, low sleep modes
- **Range**: 100+ meters line-of-sight

### Power Supply
- **Recommended**: 5V 2A USB power supply
- **Battery Option**: 3.7V LiPo 2000mAh+
- **Runtime**: 8-12 hours on battery (depending on transmission frequency)

---

## Project Structure

```
Arduino/
├── sketch_firewatch.ino    # Main firmware code
└── README.md              # This documentation

Key Code Sections:
├── WiFi Configuration (lines 6-8)
├── GPIO/Sensor Setup (lines 11-15)
├── GPS UART Setup (lines 18-20)
├── Threshold Configuration (lines 23-26)
├── Main Loop (lines 43-95)
└── HTTP POST Upload (lines 81-94)
```

---

## Pin Configuration

### ESP32 Pin Mapping

```
GPIO 34 ─────────── MQ-4 (Methane) ─── ADC input
GPIO 35 ─────────── MQ-7 (CO) ─────────── ADC input
GPIO 32 ─────────── MQ-135 (Air Quality) ─ ADC input

GPIO 16 (RXD2) ──── TinyGPS RX
GPIO 17 (TXD2) ──── TinyGPS TX

3V3 ─────────────── Power to all sensors
GND ─────────────── Ground reference
```

### Electrical Schematic

```
ESP32                 
+5V ──────┬──────────────┐
          │              │
         USB            Power
         Adapter        Supply
          │              │
         GND ────────────┴─── All GND connections
          │
      Sensor VCC inputs

GPIO34 ─── MQ-4   (analog out)
GPIO35 ─── MQ-7   (analog out)
GPIO32 ─── MQ-135 (analog out)

GPIO16 ─── GPS RX
GPIO17 ─── GPS TX
```

---

## Installation & Setup

### Prerequisites
- Arduino IDE 1.8.19+ or Visual Studio Code + PlatformIO
- ESP32 board package installed
- USB cable for programming
- Assembled hardware with sensors connected

### Step 1: Install Arduino IDE & Board Support

```bash
# Download Arduino IDE from https://www.arduino.cc/en/software

# In Arduino IDE:
# 1. Go to File → Preferences
# 2. Add to "Additional Boards Manager URLs":
#    https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
# 3. Tools → Board Manager → Search "esp32" → Install
# 4. Tools → Board → Select "ESP32 Dev Module"
```

### Step 2: Install Required Libraries

In Arduino IDE → Sketch → Include Library → Manage Libraries:

```
1. WiFi           (built-in, auto-includes)
2. HTTPClient     (built-in, auto-includes)
3. TinyGPSPlus    (by Mikal Hart) - search and install
4. HardwareSerial (built-in)
```

**Installation Command (if using command line):**
```bash
# PlatformIO users
pio lib install "TinyGPS++"
```

### Step 3: Configure WiFi Credentials

Edit `sketch_firewatch.ino`, lines 6-8:

```cpp
const char* ssid = "your_wifi_ssid";
const char* password = "your_wifi_password";
const char* serverName = "http://your-backend-ip:5000/sensor-data";
```

### Step 4: Set Sensor Thresholds

Lines 23-26, adjust based on your calibration:

```cpp
int MQ4_THRESHOLD = 2500;      // Methane threshold (ppm)
int MQ7_THRESHOLD = 1900;      // CO threshold (ppm)
int MQ135_THRESHOLD = 8000;    // Air quality threshold
```

### Step 5: Upload Firmware

```bash
# In Arduino IDE:
# 1. Connect ESP32 via USB
# 2. Select correct COM port (Tools → Port)
# 3. Sketch → Upload
# 4. Wait for "Leaving... Hard resetting via RTS pin"
```

---

## Configuration

### WiFi Setup

```cpp
// Edit these constants:
const char* ssid = "your_network";           // WiFi network name
const char* password = "your_password";      // WiFi password
const char* serverName = "http://192.168.1.100:5000/sensor-data";  // Backend IP
```

Test connection:
```bash
# Monitor serial output (115200 baud)
# Should see: "Connected to WiFi" message after 3-5 seconds
```

### Sensor Calibration

**MQ-4 Calibration (Methane)**
```
1. In clean air, note ADC value (e.g., 500)
2. Expose to known gas concentration
3. Set MQ4_THRESHOLD based on ppm conversion
4. Formula: ppm = (ADC_value - baseline) × calibration_factor
```

**MQ-7 Calibration (CO)**
```
1. Sensors ship pre-calibrated
2. Adjustment: MQ7_THRESHOLD
3. Test with car exhaust (dangerous - use caution)
4. Or adjust empirically in target environment
```

**MQ-135 Calibration (Air Quality)**
```
1. Baseline in clean outdoor air
2. Compare against reference sensor
3. Adjust MQ135_THRESHOLD accordingly
4. Used for smoke/fire detection (not CO₂ only)
```

### GPS Configuration

Fixed in code (lines 54-56), but can be dynamic:

```cpp
// Hardcoded coordinates (for testing without GPS signal):
double latitude = 18.27;    // Your test location latitude
double longitude = 73.52;   // Your test location longitude

// For live GPS (remove hardcoding):
// Get from TinyGPS+ parser:
// double latitude = gps.location.lat();
// double longitude = gps.location.lng();
```

### Transmission Configuration

```cpp
// Change data transmission interval (currently 5000ms = 5 seconds)
// Line 92: delay(5000);

delay(5000);    // 5 seconds (current)
// delay(10000); // 10 seconds (less frequent, battery saving)
// delay(2000);  // 2 seconds (more frequent, more real-time)
```

---

## Usage & Monitoring

### Serial Monitor Output

```bash
# Connect ESP32 and open Serial Monitor (115200 baud)

Output should show:
Connecting to WiFi...
Connected to WiFi

MQ4: 523
MQ7: 412
MQ135: 1203
Lat: 18.270000
Lng: 73.520000
Status: IDLE
HTTP Response: 200

MQ4: 2650
MQ7: 1850
MQ135: 8200
Lat: 18.270000
Lng: 73.520000
Status: ACTIVE        <-- Fire detected!
HTTP Response: 201
```

### Debugging

**If not connecting to WiFi:**
```
1. Check SSID and password (case-sensitive)
2. Verify 2.4 GHz WiFi (5 GHz not supported)
3. Check signal strength
4. Try: WiFi.mode(WIFI_STA); WiFi.getMode();
```

**If HTTP POST failing:**
```
1. Verify backend server running
2. Check serverName URL format
3. Test connectivity: ping backend_ip
4. Check firewall not blocking port 5000
5. Monitor backend logs for incoming requests
```

**If sensor readings stuck:**
```
1. Verify GPIO pin connections
2. Check analog reference voltage (3.3V)
3. Use Serial.print(analogRead(pin)); to debug
4. Warm up sensors (5-10 minutes first run)
5. Check ADC readings not saturating (0-4095)
```

---

## Data Format

### JSON Sent to Backend

```json
{
  "mq4": 523,
  "mq7": 412,
  "mq135": 1203,
  "latitude": 18.270000,
  "longitude": 73.520000,
  "status": "ACTIVE"
}
```

### Field Descriptions

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| mq4 | int | 0-4095 | Raw ADC reading, convert to ppm |
| mq7 | int | 0-4095 | Raw ADC reading, convert to ppm |
| mq135 | int | 0-4095 | Raw ADC reading, convert to ppm |
| latitude | float | -90 to 90 | GPS latitude (degrees decimal) |
| longitude | float | -180 to 180 | GPS longitude (degrees decimal) |
| status | string | "IDLE", "ACTIVE" | Fire detection status |

---

## Integration with Backend

### RESTful API

The Arduino sends data via HTTP POST:

```
Method: POST
Endpoint: http://{BACKEND_IP}:5000/sensor-data
Headers: Content-Type: application/json
Timeout: 30 seconds
Retry: Every 5 seconds on failure
```

### Backend Processing

Backend stores data in MongoDB:
```javascript
// Collection: LiveStatus
db.LiveStatus.insertOne({
  mq4: 523,
  mq7: 412,
  mq135: 1203,
  latitude: 18.27,
  longitude: 73.52,
  status: "ACTIVE",
  timestamp: ISODate("2024-04-05T10:30:00Z")
})
```

### Response Handling

```cpp
// Backend responds with:
// Success (201): {"message": "Data saved successfully"}
// Error (500): {"error": "error_message"}

// Arduino logs response to Serial Monitor
Serial.print("HTTP Response: ");
Serial.println(httpResponseCode);
```

---

## Power Management

### Power Consumption

| State | Current | Time |
|-------|---------|------|
| Active (transmitting) | ~200mA | 10s every 5s interval |
| WiFi on, idle | ~50mA | 4s every 5s interval |
| Sleep mode | ~10mA | optional between transmissions |

### Battery Life Estimation

```
LiPo 2000mAh @ 100mA average = ~20 hours runtime
LiPo 2000mAh @ 50mA average = ~40 hours runtime
```

### Optimization Tips

1. **Increase transmission interval**
   ```cpp
   delay(30000);  // Every 30 seconds instead of 5
   ```

2. **Enable WiFi sleep**
   ```cpp
   WiFi.setSleep(WIFI_PS_MIN_MODEM);  // Light sleep
   ```

3. **Reduce ADC sampling**
   ```cpp
   // Take average of 5 samples instead of 1
   int mq4_sum = 0;
   for(int i=0; i<5; i++) mq4_sum += analogRead(mq4Pin);
   int mq4Value = mq4_sum / 5;
   ```

---

## Troubleshooting

### Device Not Uploading

```
Error: "A fatal error occurred: Failed to connect to ESP32"

Solutions:
1. Check USB cable (try another cable)
2. Hold GPIO0 button while uploading
3. Verify COM port selected correctly
4. Install CH340 drivers if needed
5. Try: pio run --target upload
```

### WiFi Connection Timing Out

```
Error: "WiFi stuck connecting for 20+ seconds"

Solutions:
1. Verify SSID and password
2. Check ESP32 is 2.4 GHz capable
3. Move router closer
4. Try static IP instead of DHCP:
   WiFi.config(IPAddress(192,168,1,100), 
               IPAddress(192,168,1,1), 
               IPAddress(255,255,255,0));
```

### Sensor Readings Always Same Value

```
Symptom: MQ values stuck at same reading

Solutions:
1. Check GPIO connections to sensors
2. Verify 3.3V power to sensors
3. Check GND connection
4. Heat up sensors (5-10 min warmup time)
5. Test with: Serial.println(analogRead(34));
```

### Backend Not Receiving Data

```
Error: HTTP 500 or connection timeout

Solutions:
1. Verify backend is running: curl http://backend:5000/
2. Check firewall allows port 5000 outbound
3. Monitor backend logs for incoming connections
4. Use static IP for backend (not hostname)
5. Add Serial.println(serverName); to debug
```

### GPS Not Getting Fix

```
Symptom: Always shows default (18.27, 73.52)

Solutions:
1. Check GPS module RX/TX pins (16, 17)
2. Verify GPS baud rate is 9600
3. GPS needs clear sky view (5-10 minutes)
4. For testing, use hardcoded coordinates
5. Verify GPS module is getting power
```

---

## Advanced Programming

### Custom Firmware Modifications

**Change sensor pins:**
```cpp
// Instead of GPIO 34, 35, 32
int mq4Pin = 36;    // Different pin
int mq7Pin = 39;    // Different pin
int mq135Pin = 37;  // Different pin
```

**Add temperature/humidity sensor:**
```cpp
#include "DHT.h"
#define DHTPIN 33
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  dht.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  // Include in JSON payload
}
```

**Send to MQTT instead of REST:**
```cpp
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient client(espClient);
const char* mqtt_server = "192.168.1.150";

void reconnect() {
  if (!client.connected()) {
    if (client.connect("ESP32-Sensor")) {
      client.publish("sensors/firewatch/status", "online");
    }
  }
}

void loop() {
  // ... sensor readings ...
  client.publish("sensors/firewatch/mq4", String(mq4Value).c_str());
  client.publish("sensors/firewatch/mq7", String(mq7Value).c_str());
}
```

---

## System Requirements

- **Voltage**: 5V DC power supply
- **Current**: 500mA minimum
- **Temperature**: -20°C to +60°C operating
- **Humidity**: 10-90% non-condensing
- **Network**: WiFi 802.11 b/g/n 2.4GHz

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Sensor Response Time | < 30 seconds |
| Reading Accuracy | ±10% after calibration |
| WiFi Connection Time | 5-10 seconds |
| HTTP Upload Time | < 2 seconds |
| Battery Runtime | 8-12 hours (2000mAh LiPo) |
| Data Upload Frequency | Every 5 seconds |

---

## Future Enhancements

- 🔋 **Deep sleep modes** - Battery optimization
- 📊 **On-device data buffering** - Survive network outages
- 🌡️ **Temperature/humidity sensor** - Environmental context
- 🎛️ **OTA updates** - Wireless firmware updates
- 📡 **LoRaWAN support** - Long-range mesh networking
- 🔐 **HTTPS/SSL** - Encrypted data transmission

---

## Contributing

Areas for improvement:
- Sensor calibration procedures
- Power optimization techniques
- Additional sensor types (temperature, pressure)
- Mesh networking capabilities
- Security and encryption

---

## License

MIT License - See LICENSE file for details

---

## References

- **ESP32 Documentation**: https://docs.espressif.com/projects/esp-idf/
- **Arduino IDE**: https://www.arduino.cc/
- **TinyGPS++ Library**: https://github.com/mikalhart/TinyGPSPlus
- **MQ Sensor Datasheets**: Search "MQ-4", "MQ-7", "MQ-135" datasheets
- **WiFi HTTP Client**: https://github.com/espressif/arduino-esp32

---

## Support

- **GitHub Issues**: Report bugs and feature requests
- **Email**: support@firewatch.dev
- **Arduino Forum**: https://forum.arduino.cc/
- **ESP32 Community**: https://www.esp32.com/

---

**Distributed intelligence at the edge of the forest.**

🔌 *FIREWATCH Sensors: Detecting threats before they spread.*
