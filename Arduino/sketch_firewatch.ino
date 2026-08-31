#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// 🔹 WiFi
const char* ssid = "iPhone";
const char* password = "sanyog@ss";
const char* serverName = "http://172.20.10.4:5000/sensor-data";

// 🔹 MQ Pins
int mq4Pin = 34;
int mq7Pin = 35;
int mq135Pin = 32;

// 🔹 GPS
TinyGPSPlus gps;
HardwareSerial gpsSerial(1); 
#define RXD2 16
#define TXD2 17

// 🔥 Thresholds (adjust properly later)
int MQ4_THRESHOLD = 2500;
int MQ7_THRESHOLD = 1900;
int MQ135_THRESHOLD = 8000;

void setup() {
  Serial.begin(115200);

  gpsSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected to WiFi");
}

void loop() {

  int mq4Value = analogRead(mq4Pin);
  int mq7Value = analogRead(mq7Pin);
  int mq135Value = analogRead(mq135Pin);

  // GPS Read
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

 double latitude = 18.27;
double longitude = 73.52;

 // 🔥 Fire Detection Logic
  String status = "IDLE";

  if (mq4Value > MQ4_THRESHOLD ||
      mq7Value > MQ7_THRESHOLD ||
      mq135Value > MQ135_THRESHOLD) {

    status = "ACTIVE";
  }

  Serial.println("MQ4: " + String(mq4Value));
  Serial.println("MQ7: " + String(mq7Value));
  Serial.println("MQ135: " + String(mq135Value));
  Serial.println("Lat: " + String(latitude, 6));
  Serial.println("Lng: " + String(longitude, 6));
  Serial.println("Status: " + status);

  // Send to server
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    String jsonData = "{";
    jsonData += "\"mq4\":" + String(mq4Value) + ",";
    jsonData += "\"mq7\":" + String(mq7Value) + ",";
    jsonData += "\"mq135\":" + String(mq135Value) + ",";
    jsonData += "\"latitude\":" + String(latitude, 6) + ",";
    jsonData += "\"longitude\":" + String(longitude, 6) + ",";
    jsonData += "\"status\":\"" + status + "\"";
    jsonData += "}";

    int httpResponseCode = http.POST(jsonData);

    Serial.print("HTTP Response: ");
    Serial.println(httpResponseCode);

    http.end();
  }

  delay(5000);
}