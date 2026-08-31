# 📱 Android FIREWATCH Mobile App

**Citizen-reported fire incident app with real-time alerts, GPS tracking, and photo evidence.**

---

## Overview

**FIREWATCH Android** is a mobile application that enables citizens and field teams to **quickly report fire incidents** with:

- 📸 **Photo Evidence** - Capture and upload fire/smoke photos
- 📍 **GPS Location** - Automatic geolocation of incident
- ⚠️ **Real-time Alerts** - Receive notifications of fire incidents nearby
- 👥 **Community Reporting** - See reports from others in the area
- 🗺️ **Interactive Map** - View incidents on real-time forest map
- 💬 **Status Updates** - Follow incident progression
- 🚒 **Responder Integration** - Direct communication with emergency teams
- 🔔 **Push Notifications** - Never miss critical alerts

**Core Purpose**: Bridge the gap between citizens and emergency response by enabling crowdsourced fire detection with **instant, geotagged reporting**.

---

## Features

| Feature | Description |
|---------|-------------|
| **Quick Report** | 2-tap incident reporting with photos |
| **GPS Tracking** | Automatic location capture via device GPS |
| **Photo Upload** | Attach up to 5 fire/smoke photos per report |
| **Real-time Map** | Live incident visualization on forest map |
| **Alert Notifications** | Push alerts for nearby incidents (5km radius) |
| **Incident History** | View your submitted reports and status |
| **Emergency Contact** | Direct hotline to emergency services |
| **Offline Support** | Queue reports when no connectivity |
| **User Authentication** | Phone/email signup and login |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **Dark Mode** | Easy on eyes, battery efficient |
| **Multi-language** | English, Hindi, Marathi (extensible) |

---

## Tech Stack

### Development
- **Language**: Kotlin (on Java compatible)
- **IDE**: Android Studio
- **Build System**: Gradle 8.0+
- **Android SDK**: Target API 33 (Android 13+)

### Core Libraries
- **AndroidX**: UI components, lifecycle, navigation
- **Firebase**: Authentication, Firestore, Cloud Messaging
- **Google Maps**: Location visualization and routing
- **Retrofit**: HTTP client for API communication
- **Room**: Local database for offline support
- **Coroutines**: Asynchronous operations
- **Jetpack Compose**: Modern UI framework (optional)

### Services
- **Firebase Authentication**: Email/phone login
- **Firestore Database**: Incident storage and real-time sync
- **Firebase Cloud Messaging**: Push notifications
- **Google Play Services**: GPS, maps, location
- **TensorFlow Lite**: Optional on-device image analysis

### Permissions Required
- `ACCESS_FINE_LOCATION` - GPS location
- `CAMERA` - Photo capture
- `INTERNET` - Network access
- `READ_EXTERNAL_STORAGE` - Photo library access

---

## Project Structure

```
android_firewatch/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/firewatch/
│   │   │   │   ├── MainActivity.kt                # Main entry point
│   │   │   │   ├── features/
│   │   │   │   │   ├── report/
│   │   │   │   │   │   ├── ReportActivity.kt      # Report submission
│   │   │   │   │   │   ├── PhotoUploadFragment.kt # Photo handling
│   │   │   │   │   │   └── ReportViewModel.kt     # Business logic
│   │   │   │   │   ├── map/
│   │   │   │   │   │   ├── MapFragment.kt         # Incident map
│   │   │   │   │   │   └── MapViewModel.kt
│   │   │   │   │   ├── alerts/
│   │   │   │   │   │   ├── AlertsFragment.kt      # Notifications
│   │   │   │   │   │   └── AlertAdapter.kt
│   │   │   │   │   └── auth/
│   │   │   │   │       ├── LoginActivity.kt       # User login
│   │   │   │   │       └── SignupActivity.kt
│   │   │   │   ├── data/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── FirewatchAPI.kt        # API endpoints
│   │   │   │   │   ├── repository/
│   │   │   │   │   ├── local/
│   │   │   │   │   │   └── IncidentDatabase.kt    # Room DB
│   │   │   │   │   └── remote/
│   │   │   │   │       └── FirebaseService.kt
│   │   │   │   ├── utils/
│   │   │   │   │   ├── LocationManager.kt
│   │   │   │   │   ├── PermissionHelper.kt
│   │   │   │   │   └── NotificationManager.kt
│   │   │   │   └── models/
│   │   │   │       ├── Incident.kt
│   │   │   │       ├── User.kt
│   │   │   │       └── Alert.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/        # XML layouts
│   │   │   │   ├── drawable/      # Icons and images
│   │   │   │   ├── values/        # Colors, strings, themes
│   │   │   │   └── mipmap/        # App icons
│   │   │   ├── AndroidManifest.xml # App configuration
│   │   │   └── google-services.json # Firebase config
│   │   ├── test/                 # Unit tests
│   │   └── androidTest/          # Instrumentation tests
│   ├── build.gradle.kts          # App build configuration
│   ├── proguard-rules.pro        # Code obfuscation
│   └── .gitignore
├── gradle/
│   └── libs.versions.toml        # Dependency versions
├── build.gradle.kts              # Project-level config
├── settings.gradle.kts           # Module configuration
├── gradle.properties             # Gradle properties
├── gradlew & gradlew.bat        # Gradle wrapper scripts
└── README.md                     # This documentation
```

---

## Installation & Setup

### Prerequisites
- Android Studio 2022.1+
- Android SDK 33 (API level 33)
- JDK 11+
- Gradle 8.0+
- Firebase account

### Step 1: Clone & Open Project

```bash
git clone https://github.com/firewatch/android-app.git
cd android-firewatch

# Open in Android Studio
open -a "Android Studio" .  # macOS
# Or File → Open → Select this directory
```

### Step 2: Install Dependencies

```bash
# Gradle automatically handles dependencies
# Or manually sync:
./gradlew build
```

### Step 3: Configure Firebase

1. Create Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Add Android app to project
3. Download `google-services.json`
4. Place in `app/` directory:
   ```
   android-firewatch/app/google-services.json
   ```
5. Sync Gradle

### Step 4: Configure SDK & API Keys

Edit `app/build.gradle.kts`:

```kotlin
android {
    compileSdk = 33
    
    defaultConfig {
        applicationId = "com.firewatch"
        minSdk = 27
        targetSdk = 33
        versionCode = 1
        versionName = "1.0.0"
        
        // Google Maps API Key
        manifestPlaceholders["MAPS_API_KEY"] = "YOUR_MAPS_API_KEY"
    }
}
```

### Step 5: Build & Run

```bash
# Build APK
./gradlew build

# Run on emulator/device
./gradlew installDebug

# Or in Android Studio:
# Run → Run 'app'
```

---

## Configuration

### Firebase Setup

**Option 1: Automatic (via Android Studio)**
```
Tools → Firebase → Get Started Guides
→ Cloud Messaging → Connect to Firebase
```

**Option 2: Manual (using google-services.json)**
```json
{
  "project_info": {
    "project_number": "123456789",
    "firebase_url": "https://firewatch-123.firebaseio.com",
    "project_id": "firewatch-app",
    "storage_bucket": "firewatch-app.appspot.com"
  },
  "client": [{
    "client_info": {
      "mobilesdk_app_id": "1:123456789:android:abcdef123456",
      "package_name": "com.firewatch"
    },
    "oauth_client": [],
    "api_key": [{
      "current_key": "AIzaSyD1234..."
    }]
  }]
}
```

### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create API key for Android
3. Restrict to Android apps
4. Add package name + signing certificate SHA-1
5. Place in AndroidManifest.xml:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_MAPS_API_KEY" />
```

### Backend API Configuration

Edit `data/api/FirewatchAPI.kt`:

```kotlin
object ApiConfig {
    const val BASE_URL = "http://your-backend-ip:3000"
    const val TIMEOUT = 30L  // seconds
    const val API_KEY = "your-api-key-here"
}
```

### Notification Configuration

In Firebase Console → Cloud Messaging:
- Enable Android notifications
- Set default notification title/body
- Configure notification click behavior

---

## Usage

### Launch & Authentication

1. **Start App**
   - Home screen shows: "Welcome to FIREWATCH"
   - Options: "Report Incident" or "View Alerts"

2. **Sign Up/Login**
   - Enter email and password
   - Firebase handles authentication
   - Verify phone (optional SMS)

3. **Grant Permissions**
   - Camera (for photos)
   - Location (for GPS)
   - Storage (for offline data)

### Report Fire Incident

**Flow:**
```
Home → "Report Incident" → Add Photos → 
Confirm Location → Submit → Success
```

**Steps:**
1. Tap **"Quick Report"** button
2. **Take Photos** (1-5 images)
   - Camera opens
   - Crop/confirm each photo
3. **Confirm Location**
   - GPS automatically captures
   - Can adjust on map if needed
4. **Add Details**
   - Description of fire
   - Estimated severity (1-5)
5. **Submit**
   - Photos compressed and uploaded
   - Incident created in Firestore
   - Confirmation displayed

### View Real-time Map

**Features:**
- Incident markers shown as red pins
- Tap pin to see incident details
- Time-based color coding:
  - Red: Last 1 hour
  - Orange: Last 6 hours
  - Yellow: Last 24 hours

**Filters:**
- Show only verified incidents
- Distance range (1-50 km)
- Incident type selection

### Receive Alerts

**Push Notifications:**
- Incident within 5 km: Sound + vibration
- Incident within 10 km: Silent + notification
- Tap notification to view incident details

**In-App Alerts Tab:**
- List of all alerts for you
- Mark as read
- Share with others

---

## Data Models

### Incident Model

```kotlin
data class Incident(
    val id: String,
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val title: String,
    val description: String,
    val severity: Int,  // 1-5
    val photoUrls: List<String>,
    val timestamp: Long,
    val status: String,  // REPORTED, VERIFIED, RESPONDING, CONTAINED
    val verifiedCount: Int = 0,
    val responderStatus: String? = null
)
```

### User Model

```kotlin
data class User(
    val id: String,
    val email: String,
    val phone: String?,
    val name: String,
    val profileImage: String?,
    val createdAt: Long,
    val reportsCount: Int = 0,
    val verificationScore: Float = 1.0f
)
```

### Alert Model

```kotlin
data class Alert(
    val id: String,
    val incidentId: String,
    val userId: String,
    val distance: Double,  // km
    val message: String,
    val timestamp: Long,
    val read: Boolean = false
)
```

---

## API Integration

### Report Incident Endpoint

```kotlin
// POST /api/incidents
interface FirewatchAPI {
    @POST("/api/incidents")
    suspend fun reportIncident(
        @Body incident: IncidentRequest
    ): Response<IncidentResponse>
}

data class IncidentRequest(
    val latitude: Double,
    val longitude: Double,
    val title: String,
    val description: String,
    val severity: Int,
    val photoUrls: List<String>
)

data class IncidentResponse(
    val id: String,
    val status: String,
    val message: String
)
```

### Usage Example

```kotlin
class ReportViewModel : ViewModel() {
    private val api: FirewatchAPI = ApiClient.instance
    
    fun submitIncident(incident: IncidentRequest) = viewModelScope.launch {
        try {
            val response = api.reportIncident(incident)
            if (response.isSuccessful) {
                // Success
                incidents.postValue(response.body())
            } else {
                // Error handling
                error.postValue(response.errorBody()?.string())
            }
        } catch (e: Exception) {
            error.postValue(e.message)
        }
    }
}
```

---

## Push Notifications (Firebase Cloud Messaging)

### Receive Notifications

```kotlin
class FirewatchMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Data from FIREWATCH backend
        val title = remoteMessage.notification?.title
        val body = remoteMessage.notification?.body
        val incidentId = remoteMessage.data["incident_id"]
        
        // Show notification
        showNotification(title, body, incidentId)
    }
    
    override fun onNewToken(token: String) {
        // Send device token to backend
        sendTokenToBackend(token)
    }
}
```

### Backend Send Notification

```javascript
// From FIREWATCH backend (Node.js)
const admin = require('firebase-admin');

admin.messaging().send({
    notification: {
        title: "🔥 Fire Reported Nearby!",
        body: "Incident 500m from your location"
    },
    data: {
        incident_id: incident.id,
        latitude: incident.latitude,
        longitude: incident.longitude
    },
    android: {
        ttl: 3600,
        notification: {
            sound: "default",
            channelId: "fire_alerts"
        }
    },
    token: userDeviceToken
});
```

---

## Offline Support

### Local Database (Room)

```kotlin
@Database(entities = [Incident::class, Alert::class], version = 1)
abstract class IncidentDatabase : RoomDatabase() {
    abstract fun incidentDao(): IncidentDao
    abstract fun alertDao(): AlertDao
    
    companion object {
        @Volatile
        private var instance: IncidentDatabase? = null
        
        fun getInstance(context: Context): IncidentDatabase {
            return instance ?: synchronized(this) {
                Room.databaseBuilder(
                    context,
                    IncidentDatabase::class.java,
                    "firewatch_db"
                ).build().also { instance = it }
            }
        }
    }
}
```

### Queue & Sync When Online

```kotlin
class OfflineQueueManager(context: Context) {
    private val db = IncidentDatabase.getInstance(context)
    
    suspend fun queueIncident(incident: Incident) {
        // Save to local DB
        db.incidentDao().insert(incident)
    }
    
    suspend fun syncPendingIncidents() {
        // On connectivity restored
        val pending = db.incidentDao().getPending()
        for (incident in pending) {
            try {
                api.reportIncident(incident)
                db.incidentDao().markSynced(incident.id)
            } catch (e: Exception) {
                // Retry later
            }
        }
    }
}
```

---

## Photo Upload

### Compress Before Upload

```kotlin
private fun compressImage(imagePath: String): File {
    val inputFile = File(imagePath)
    var compressedFile = inputFile
    
    var quality = 100
    while (compressedFile.length() > 1_000_000 && quality > 10) {
        quality -= 10
        compressedFile = compressImage(inputFile, quality)
    }
    return compressedFile
}

private fun compressImage(file: File, quality: Int): File {
    val bitmap = BitmapFactory.decodeFile(file.absolutePath)
    val outputFile = File(cacheDir, "compressed_${System.currentTimeMillis()}.jpg")
    
    FileOutputStream(outputFile).use { fos ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, fos)
    }
    return outputFile
}
```

### Upload to Firebase Storage

```kotlin
private fun uploadPhoto(file: File, incidentId: String) {
    val storageRef = FirebaseStorage.getInstance().reference
    val photoRef = storageRef.child("incidents/$incidentId/${UUID.randomUUID()}.jpg")
    
    val uploadTask = photoRef.putFile(Uri.fromFile(file))
    uploadTask.continueWithTask { task ->
        if (!task.isSuccessful) throw task.exception!!
        photoRef.downloadUrl
    }.addOnCompleteListener { task ->
        if (task.isSuccessful) {
            val photoUrl = task.result.toString()
            // Add to incident
        }
    }
}
```

---

## Location Tracking

### Get Current Location

```kotlin
class LocationManager(context: Context) {
    private val fusedLocationClient = 
        LocationServices.getFusedLocationProviderClient(context)
    
    fun getCurrentLocation(callback: (Location?) -> Unit) {
        if (ActivityCompat.checkSelfPermission(
            context,
            ACCESS_FINE_LOCATION
        ) != PERMISSION_GRANTED
        ) {
            return
        }
        
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            callback(location)
        }
    }
}
```

### Continuous Updates

```kotlin
private fun startLocationUpdates() {
    val locationRequest = LocationRequest.Builder(
        Priority.PRIORITY_HIGH_ACCURACY,
        10000L  // 10 seconds
    ).build()
    
    if (ActivityCompat.checkSelfPermission(
        context,
        ACCESS_FINE_LOCATION
    ) != PERMISSION_GRANTED
    ) {
        return
    }
    
    fusedLocationClient.requestLocationUpdates(
        locationRequest,
        locationCallback,
        Looper.getMainLooper()
    )
}
```

---

## Testing

### Unit Tests

```kotlin
@RunWith(AndroidJUnit4::class)
class IncidentRepositoryTest {
    private lateinit var repo: IncidentRepository
    
    @Before
    fun setup() {
        repo = IncidentRepository()
    }
    
    @Test
    fun testReportIncident() = runBlocking {
        val incident = Incident(
            id = "test_1",
            latitude = 18.2704,
            longitude = 73.5186,
            title = "Test Fire",
            severity = 4
        )
        
        val result = repo.reportIncident(incident)
        assertEquals(result?.id, "test_1")
    }
}
```

### UI Tests (Espresso)

```kotlin
@RunWith(AndroidJUnit4::class)
class ReportActivityTest {
    @get:Rule
    val activityRule = ActivityScenarioRule(ReportActivity::class.java)
    
    @Test
    fun testPhotoCapture() {
        onView(withId(R.id.camera_button))
            .perform(click())
        
        onView(withId(R.id.photo_preview))
            .check(matches(isDisplayed()))
    }
}
```

---

## Deployment

### Build Release APK

```bash
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Sign Release APK

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA256 \
  -keystore release.keystore \
  app-release-unsigned.apk \
  release_key

zipalign -v 4 \
  app-release-unsigned.apk \
  app-release-signed.apk
```

### Upload to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. Create app entry
3. Upload signed APK
4. Fill in app details, screenshots, description
5. Submit for review

---

## Troubleshooting

### Build Errors

```
Error: com.android.build.api.dsl.ManagedVirtualDevice is abstract
Solution:
1. Update gradle: gradle wrapper update
2. Sync gradle files
3. Invalidate caches: File → Invalidate Caches
```

### Firebase Not Connecting

```
Error: Failed to initialize Firebase
Solution:
1. Verify google-services.json in app/ directory
2. Check Firebase console project ID matches
3. Re-sync gradle files
4. Clean build: ./gradlew clean build
```

### Permission Denial

```
Error: Permission denied: android.permission.ACCESS_FINE_LOCATION
Solution:
1. Request runtime permissions in code
2. Check AndroidManifest.xml permissions
3. Test on device with Android 6+
4. Grant permissions in app settings
```

### Push Notifications Not Received

```
Solution:
1. Verify Firebase Cloud Messaging enabled
2. Check device token is sent to backend
3. Test with sample notification from Firebase Console
4. Enable notification permissions in app
5. Check notification channel exists
```

---

## Performance Optimization

- 🎯 **Code shrinking**: ProGuard/R8 enabled by default
- 📦 **Asset compression**: WebP for images
- ⚡ **Lazy loading**: Fragments load on-demand
- 💾 **Memory management**: Proper lifecycle handling
- 🔄 **Coroutines**: Non-blocking operations

---

## Future Enhancements

- 🤖 **AI image analysis** - Auto-detect fire in photos
- 🗺️ **Incident heatmaps** - Visualization of hotspots
- 👥 **Community badges** - Reward active reporters
- 🎖️ **Verification system** - Community validation
- 📊 **Analytics** - Personal contribution dashboard
- 🔗 **Social sharing** - Enable incident sharing

---

## Contributing

Areas for improvement:
- UI/UX enhancements
- Performance optimization
- Feature additions
- Translations
- Test coverage

---

## License

MIT License - See LICENSE file for details

---

## References

- **Android Developers**: https://developer.android.com/
- **Firebase Documentation**: https://firebase.google.com/docs
- **Google Maps API**: https://developers.google.com/maps/documentation/android-sdk/overview
- **Kotlin Coroutines**: https://kotlinlang.org/docs/coroutines-overview.html
- **Jetpack Libraries**: https://developer.android.com/jetpack

---

## Support

- **GitHub Issues**: Report bugs and feature requests
- **Email**: support@firewatch.dev
- **Google Play Store**: https://play.google.com/store/apps/details?id=com.firewatch
- **Community Forum**: https://community.firewatch.dev

---

**Empowering citizens to protect their forests.**

📱 *FIREWATCH Mobile: Report. Alert. Respond. Save Lives.*
