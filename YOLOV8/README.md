# 🎥 YOLOV8 Fire Detection Module

**Advanced computer vision-based fire and smoke detection using YOLOv8 object detection.**

---

## Overview

This module implements **YOLOv8** for real-time fire and smoke detection. It can run on:

- 📹 **CCTV feeds** from existing surveillance infrastructure
- 📷 **Webcam streams** for live detection
- 🎬 **Video files** for batch processing
- 🖼️ **Image files** for one-time analysis

The system automatically converts detections into **fire incident reports** sent to the FIREWATCH backend.

---

## Features

| Feature | Description |
|---------|-------------|
| **Real-time Detection** | Stream-based fire/smoke detection at 30+ FPS |
| **Pre-trained Model** | YOLOv8 nano/small trained on fire dataset |
| **Multi-Source Input** | CCTV, webcam, video file, or image support |
| **Confidence Filtering** | Adjustable detection confidence threshold |
| **NMS (Non-Max Suppression)** | Removes duplicate overlapping detections |
| **Bounding Boxes** | Visual annotation of detected fires/smoke |
| **Alert Integration** | Automatic incident reporting to backend |
| **Optional GPU Support** | CUDA acceleration for faster processing |

---

## Tech Stack

### Core
- **Framework**: YOLOv8 (Ultralytics)
- **Language**: Python 3.8+
- **ML Framework**: PyTorch
- **Computer Vision**: OpenCV (cv2)
- **HTTP Client**: Requests

### Model
- **Architecture**: YOLOv8 Nano/Small
- **Training Data**: Fire/smoke labeled dataset
- **Input Shape**: 640x640
- **Output**: Bounding boxes, confidence scores, class labels

### Deployment
- **Inference Engine**: PyTorch
- **Optimization**: TorchScript, ONNX ready
- **Hardware**: CPU or CUDA GPU
- **Containerization**: Docker (optional)

---

## Project Structure

```
YOLOV8/
├── main.py                 # Main inference pipeline
├── webcam_client.py        # Webcam stream handler
├── test_client.py          # Testing script
├── best.pt                 # Pre-trained YOLOv8 model (weights)
├── requirements.txt        # Python dependencies
├── client_requirements.txt # Additional client dependencies
└── README.md              # This documentation
```

---

## Installation & Setup

### Prerequisites
- Python 3.8+
- pip package manager
- Optional: NVIDIA CUDA 11.8+ (for GPU acceleration)
- Optional: Docker (for containerized deployment)

### Step 1: Install Dependencies

```bash
cd YOLOV8

# Install core requirements
pip install -r requirements.txt

# Install additional client requirements (if needed)
pip install -r client_requirements.txt
```

### Typical Dependencies

The `requirements.txt` includes:
```
ultralytics>=8.0.0    # YOLOv8 framework
opencv-python         # Computer vision library
numpy                 # Numerical computing
torch>=1.12.0        # PyTorch (CPU or GPU)
torchvision          # PyTorch vision utilities
requests             # HTTP client
```

For GPU support:
```bash
# Install CUDA-enabled PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Step 2: Download/Verify Model

The `best.pt` file contains the pre-trained YOLOv8 weights.

To verify model integrity:
```bash
python -c "from ultralytics import YOLO; model = YOLO('best.pt'); print(model.info())"
```

### Step 3: Verify Installation

```bash
# Test import
python -c "from ultralytics import YOLO; print('YOLOv8 loaded successfully')"

# Test model loading
python -c "from ultralytics import YOLO; model = YOLO('best.pt'); print(f'Model loaded: {model}')"
```

---

## Usage

### Option 1: Main Inference Pipeline

```bash
python main.py --source <source> --conf <confidence> --device <device>
```

**Arguments:**
- `--source`: Input source (0 for webcam, video file path, or image path)
- `--conf`: Confidence threshold (0.0-1.0, default: 0.5)
- `--device`: Device to use (cpu, cuda:0, etc.)
- `--output`: Output directory for results

**Example - Webcam Detection:**
```bash
python main.py --source 0 --conf 0.5 --device cuda:0
```

**Example - Video File:**
```bash
python main.py --source path/to/video.mp4 --conf 0.4 --device cuda:0 --output ./results/
```

**Example - CCTV Stream:**
```bash
python main.py --source rtsp://camera-ip:554/stream --conf 0.5 --device cuda:0
```

### Option 2: Webcam Client

```bash
python webcam_client.py --conf 0.5 --stream-url <backend-url>
```

**Arguments:**
- `--conf`: Confidence threshold
- `--stream-url`: FIREWATCH backend API endpoint
- `--cam-index`: Webcam index (default: 0)
- `--frame-rate`: Processing frame rate (default: 30)

**Example:**
```bash
python webcam_client.py --conf 0.5 --stream-url http://localhost:3000/api/detections
```

### Option 3: Testing

```bash
python test_client.py
```

Runs predefined test cases without backend integration.

---

## Model Details

### Architecture
- **Model**: YOLOv8 Nano (lightweight) or Small (more accurate)
- **Input**: 640×640 RGB images
- **Output**: Detections with bounding boxes, confidence, class

### Classes Detected
1. **Fire**: Active flames
2. **Smoke**: Smoke plume
3. **Hotspot**: High-temperature anomalies (optional)

### Performance
- **Inference Speed**: 
  - CPU: ~100-200ms per frame
  - GPU (RTX 2080): ~10-20ms per frame
- **Accuracy**: mAP50 ~85-92% (depends on training data)
- **Model Size**: best.pt ~40MB (nano), ~80MB (small)

---

## API Integration

### Sending Detections to FIREWATCH Backend

When fire/smoke detected, send POST request:

```python
import requests
import json

detection_payload = {
    "timestamp": "2024-04-05T10:30:00Z",
    "source": "cctv_main_gate",
    "detections": [
        {
            "class": "Fire",
            "confidence": 0.87,
            "bbox": {
                "x1": 120,
                "y1": 80,
                "x2": 450,
                "y2": 380
            }
        },
        {
            "class": "Smoke",
            "confidence": 0.92,
            "bbox": {
                "x1": 130,
                "y1": 50,
                "x2": 480,
                "y2": 250
            }
        }
    ],
    "frame_data": "base64_encoded_frame_or_url"
}

response = requests.post(
    "http://localhost:3000/api/detections",
    json=detection_payload,
    headers={"Content-Type": "application/json"}
)

if response.status_code == 201:
    incident_id = response.json()["incident_id"]
    print(f"Incident created: {incident_id}")
```

### Backend Endpoints

- `POST /api/detections` - Submit detection results
- `POST /api/incidents` - Create fire incident
- `PATCH /api/incidents/{id}` - Update incident status
- `GET /api/incidents/{id}` - Get incident details

---

## Configuration

### Environment Variables

Create `.env` file:

```bash
# FIREWATCH Backend
BACKEND_URL=http://localhost:3000
API_KEY=your-api-key-here

# Model Configuration
MODEL_PATH=./best.pt
CONFIDENCE_THRESHOLD=0.5
DEVICE=cuda:0  # or 'cpu'

# CCTV/Streaming
CCTV_RTSP_URL=rtsp://camera-ip:554/stream
CCTV_USERNAME=admin
CCTV_PASSWORD=password

# Processing
BATCH_SIZE=1
FRAME_SKIP=1  # Process every Nth frame
MAX_FPS=30

# Alerts
ALERT_THRESHOLD=0.7  # Confidence for automatic alert
ALERT_COOLDOWN=60  # Seconds between alerts from same source
```

### Load Configuration

```python
import os
from dotenv import load_dotenv

load_dotenv('.env')

BACKEND_URL = os.getenv('BACKEND_URL')
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.5))
DEVICE = os.getenv('DEVICE', 'cpu')
```

---

## Advanced Usage

### Custom Training (Future Enhancement)

To retrain model on custom dataset:

```bash
from ultralytics import YOLO

# Load a model
model = YOLO('yolov8n.pt')  # Load nano model

# Train the model
results = model.train(
    data='path/to/dataset/data.yaml',
    epochs=100,
    imgsz=640,
    device=0,  # GPU index
    batch=16,
    patience=20
)

# Export model
model.export(format='pt')  # PyTorch format
model.export(format='onnx')  # ONNX format
```

### Model Export for Edge Deployment

```bash
from ultralytics import YOLO

model = YOLO('best.pt')

# Export to ONNX (better cross-platform compatibility)
model.export(format='onnx')

# Export to TorchScript
model.export(format='torchscript')

# Export to TensorFlow (for edge devices)
model.export(format='tflite')
```

### Running on Edge Device (Raspberry Pi)

```bash
# Install lite dependencies
pip install -r requirements_edge.txt

# Run with CPU optimization
python main.py --source 0 --device cpu --conf 0.6 --imgsz 416
```

---

## Performance Optimization

### Reduce Model Size
```python
# Use nano model instead of small
from ultralytics import YOLO
model = YOLO('yolov8n.pt')  # Nano model (~6MB)
```

### Batch Processing
```python
# Process multiple images
results = model.predict(
    source=['img1.jpg', 'img2.jpg', 'img3.jpg'],
    batch=3
)
```

### Inference Settings
```python
# Adjust for speed vs accuracy
results = model.predict(
    source='video.mp4',
    conf=0.6,  # Higher confidence = faster (fewer false positives)
    iou=0.45,  # NMS threshold
    device=0   # GPU
)
```

---

## Troubleshooting

### Model Not Loading
```
Error: Model 'best.pt' not found
Solution: Ensure best.pt file exists in YOLOV8 directory
```

### CUDA Not Found
```
Error: No CUDA capable device found
Solution: 
1. Check NVIDIA drivers: nvidia-smi
2. Install CUDA toolkit
3. Use CPU: --device cpu
```

### Out of Memory (OOM)
```
Error: CUDA out of memory
Solution:
1. Reduce batch size
2. Use smaller model (nano instead of small)
3. Reduce input image size: --imgsz 416
4. Process frames sequentially instead of batch
```

### No Detections Found
```
Symptom: Model runs but finds 0 detections
Solution:
1. Lower confidence threshold: --conf 0.3
2. Check input video quality
3. Verify model is trained correctly
4. Test on sample images first
```

### Latency Too High
```
Symptom: Can't process stream in real-time
Solution:
1. Use GPU: --device cuda:0
2. Skip frames: process every 2nd or 3rd frame
3. Reduce resolution: --imgsz 416
4. Use nano model: best_nano.pt
```

---

## Integration with FIREWATCH System

### Complete Workflow

1. **Detection**
   - YOLOv8 detects fire/smoke on CCTV
   - Confidence > 0.7 triggers alert

2. **Reporting**
   - POST detection to `/api/detections`
   - Incident created in FIREWATCH backend

3. **Response**
   - Backend triggers evacuation alerts
   - Notifications sent to officials and public
   - 3D simulation can visualize incident location

### API Integration Code

```python
import cv2
import requests
from ultralytics import YOLO
from datetime import datetime

class FireDetectionClient:
    def __init__(self, backend_url, model_path='best.pt'):
        self.model = YOLO(model_path)
        self.backend_url = backend_url
        
    def process_frame(self, frame):
        results = self.model(frame)
        detections = []
        
        for result in results:
            for box in result.boxes:
                if box.conf[0] > 0.7:  # Alert threshold
                    detections.append({
                        'class': result.names[int(box.cls[0])],
                        'confidence': float(box.conf[0]),
                        'bbox': box.xyxy[0].tolist()
                    })
        
        if detections:
            self.send_to_backend(frame, detections)
        
        return detections
    
    def send_to_backend(self, frame, detections):
        _, buffer = cv2.imencode('.jpg', frame)
        payload = {
            'timestamp': datetime.utcnow().isoformat(),
            'detections': detections,
            'frame': buffer.tobytes().hex()
        }
        
        response = requests.post(
            f'{self.backend_url}/api/detections',
            json=payload
        )
        return response.status_code == 201
```

---

## Testing

### Unit Tests

```bash
python test_client.py
```

Tests:
- ✅ Model loading
- ✅ Inference on test images
- ✅ Detection parsing
- ✅ Backend API integration

### Performance Benchmarking

```python
import time
from ultralytics import YOLO

model = YOLO('best.pt')

# Benchmark inference speed
times = []
for i in range(100):
    start = time.time()
    results = model.predict('test_image.jpg')
    times.append(time.time() - start)

print(f"Average FPS: {1 / (sum(times) / len(times)):.2f}")
print(f"Min time: {min(times)*1000:.2f}ms")
print(f"Max time: {max(times)*1000:.2f}ms")
```

---

## Future Enhancements

- 🚀 **Multi-model ensemble** - Combine multiple models for improved accuracy
- 📊 **Confidence calibration** - Better uncertainty quantification
- 🌐 **Distributed inference** - Inference on multiple CCTVs simultaneously
- 🔄 **Continuous learning** - Retrain on new data periodically
- 📈 **Analytics dashboard** - Detection statistics and trends
- 🎯 **Fine-tuning on custom data** - Improve accuracy for specific regions

---

## Contributing

Areas for improvement:
- Better dataset annotation
- Model optimization for edge devices
- Integration with more CCTV protocols
- Performance benchmarking tools
- Documentation improvements

---

## License

MIT License - See LICENSE file for details

---

## References

- **YOLOv8 Documentation**: https://docs.ultralytics.com/
- **PyTorch**: https://pytorch.org/
- **OpenCV**: https://opencv.org/
- **YOLOv8 Custom Training**: https://github.com/ultralytics/ultralytics

---

## Support

- **GitHub Issues**: Report bugs and feature requests
- **Email**: support@firewatch.dev
- **Documentation**: https://firewatch-docs.dev/yolov8

---

**Advanced computer vision for smarter fire detection.**

🎥 *FIREWATCH YOLO: Real-time threats detected in a fraction of a second.*
