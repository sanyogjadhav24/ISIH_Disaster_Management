"""
Fire & Smoke Detection API using YOLOv8
========================================
Provides endpoints for detecting fire and smoke in images and video frames.
"""

import io
import base64
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_PATH = Path(__file__).parent / "best.pt"
CONFIDENCE_THRESHOLD = 0.25  # default confidence threshold

# ---------------------------------------------------------------------------
# App & Model Initialisation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Fire & Smoke Detection API",
    description="YOLOv8‑powered fire and smoke detection service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model once at startup
model: YOLO | None = None


@app.on_event("startup")
def load_model():
    global model
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")
    model = YOLO(str(MODEL_PATH))
    print(f"[INFO] YOLOv8 model loaded from {MODEL_PATH}")
    print(f"[INFO] Class names: {model.names}")


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _read_image_from_upload(file_bytes: bytes) -> np.ndarray:
    """Convert uploaded bytes to a BGR numpy image (OpenCV format)."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return img


def _run_detection(img: np.ndarray, confidence: float):
    """Run YOLOv8 inference and return structured results."""
    results = model.predict(source=img, conf=confidence, verbose=False)[0]

    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        label = model.names[cls_id]
        detections.append({
            "class_id": cls_id,
            "label": label,
            "confidence": round(conf, 4),
            "bbox": {
                "x1": round(x1, 2),
                "y1": round(y1, 2),
                "x2": round(x2, 2),
                "y2": round(y2, 2),
            },
        })

    fire_detected = any(d["label"].lower() in ("fire", "flame") for d in detections)
    smoke_detected = any(d["label"].lower() == "smoke" for d in detections)

    return {
        "fire_detected": fire_detected,
        "smoke_detected": smoke_detected,
        "total_detections": len(detections),
        "detections": detections,
    }


def _annotate_image(img: np.ndarray, confidence: float) -> np.ndarray:
    """Run inference and draw bounding boxes on the image."""
    results = model.predict(source=img, conf=confidence, verbose=False)[0]
    annotated = results.plot()  # YOLO's built‑in annotation
    return annotated


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def index():
    """Simple landing page with API info."""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>FireWatch</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>
            :root {
                --bg-primary: #0a0a0f;
                --bg-secondary: #12121a;
                --bg-card: #16162299;
                --bg-glass: rgba(255,255,255,0.03);
                --accent: #ff6b35;
                --accent-glow: rgba(255,107,53,0.25);
                --accent-hover: #ff8c5a;
                --green: #22c55e;
                --green-dim: #166534;
                --red: #ef4444;
                --red-dim: #991b1b;
                --blue: #3b82f6;
                --text-primary: #f1f1f1;
                --text-secondary: #8b8b9e;
                --text-muted: #55556a;
                --border: rgba(255,255,255,0.06);
                --radius: 12px;
                --radius-lg: 16px;
                --shadow: 0 8px 32px rgba(0,0,0,0.4);
                --transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: var(--bg-primary);
                color: var(--text-primary);
                min-height: 100vh;
                overflow-x: hidden;
            }
            /* Ambient glow */
            body::before {
                content: '';
                position: fixed;
                top: -40%; left: -20%;
                width: 80%; height: 80%;
                background: radial-gradient(ellipse, rgba(255,107,53,0.06) 0%, transparent 70%);
                pointer-events: none;
                z-index: 0;
            }

            /* ---- Header ---- */
            .header {
                position: sticky; top: 0; z-index: 100;
                backdrop-filter: blur(20px) saturate(1.4);
                -webkit-backdrop-filter: blur(20px) saturate(1.4);
                background: rgba(10,10,15,0.75);
                border-bottom: 1px solid var(--border);
                padding: 0 32px;
            }
            .header-inner {
                max-width: 1200px; margin: 0 auto;
                display: flex; align-items: center; justify-content: space-between;
                height: 64px;
            }
            .logo {
                display: flex; align-items: center; gap: 10px;
                font-weight: 800; font-size: 20px; letter-spacing: -0.5px;
            }
            .logo-icon {
                width: 36px; height: 36px; border-radius: 10px;
                background: linear-gradient(135deg, #ff6b35, #ff3d00);
                display: flex; align-items: center; justify-content: center;
                font-size: 18px; box-shadow: 0 0 20px var(--accent-glow);
            }
            .logo span { color: var(--accent); }
            .header-badge {
                font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
                background: var(--bg-card); border: 1px solid var(--border);
                padding: 5px 12px; border-radius: 20px; color: var(--text-secondary);
            }
            .header-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 6px; animation: dotPulse 2s infinite; }
            @keyframes dotPulse { 0%,100%{ opacity:1; } 50%{ opacity:0.4; } }

            /* ---- Main ---- */
            .main { max-width: 1200px; margin: 0 auto; padding: 32px; position: relative; z-index: 1; }

            /* ---- Stats Row ---- */
            .stats-row {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
                margin-bottom: 28px;
            }
            .stat-card {
                background: var(--bg-card);
                backdrop-filter: blur(12px);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 20px; text-align: center;
                transition: var(--transition);
            }
            .stat-card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
            .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-muted); margin-bottom: 8px; }
            .stat-value { font-size: 28px; font-weight: 700; letter-spacing: -1px; }
            .stat-value.fire { color: var(--red); }
            .stat-value.smoke { color: #f59e0b; }
            .stat-value.fps { color: var(--blue); }
            .stat-value.inf { color: var(--green); }

            /* ---- Alert Banner ---- */
            .alert-banner {
                display: none; align-items: center; gap: 12px;
                padding: 14px 20px; border-radius: var(--radius);
                margin-bottom: 20px; font-weight: 600; font-size: 14px;
                border: 1px solid;
            }
            .alert-banner.danger {
                display: flex;
                background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: var(--red);
                animation: alertPulse 1.5s ease-in-out infinite;
            }
            @keyframes alertPulse { 0%,100%{ background: rgba(239,68,68,0.08); } 50%{ background: rgba(239,68,68,0.18); } }
            .alert-banner.safe {
                display: flex;
                background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.2); color: var(--green);
            }

            /* ---- Controls ---- */
            .controls-bar {
                display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
                margin-bottom: 24px;
                background: var(--bg-card);
                backdrop-filter: blur(12px);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 16px 20px;
            }
            .btn {
                display: inline-flex; align-items: center; gap: 8px;
                padding: 10px 22px; border: none; border-radius: 8px;
                font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
                cursor: pointer; transition: var(--transition); letter-spacing: 0.2px;
            }
            .btn:disabled { opacity: 0.35; cursor: not-allowed; }
            .btn-start { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; box-shadow: 0 4px 16px rgba(34,197,94,0.3); }
            .btn-start:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(34,197,94,0.45); transform: translateY(-1px); }
            .btn-stop { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; box-shadow: 0 4px 16px rgba(239,68,68,0.3); }
            .btn-stop:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(239,68,68,0.45); transform: translateY(-1px); }
            .divider { width: 1px; height: 28px; background: var(--border); }
            .toggle-label {
                display: flex; align-items: center; gap: 8px;
                font-size: 13px; color: var(--text-secondary); cursor: pointer; user-select: none;
            }
            .toggle-label input[type=checkbox] { accent-color: var(--accent); width: 16px; height: 16px; }
            .conf-group { display: flex; align-items: center; gap: 10px; margin-left: auto; }
            .conf-group span { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
            .conf-group input[type=range] {
                width: 120px; accent-color: var(--accent);
                -webkit-appearance: none; height: 4px; border-radius: 4px;
                background: rgba(255,255,255,0.1); outline: none;
            }
            .conf-group input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none; width: 16px; height: 16px;
                border-radius: 50%; background: var(--accent); cursor: pointer;
                box-shadow: 0 0 8px var(--accent-glow);
            }
            .conf-val {
                font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600;
                color: var(--accent); min-width: 36px; text-align: right;
            }

            /* ---- Video Grid ---- */
            .video-grid {
                display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
                margin-bottom: 24px;
            }
            .video-card {
                background: var(--bg-card);
                backdrop-filter: blur(12px);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                overflow: hidden;
                transition: var(--transition);
            }
            .video-card:hover { border-color: rgba(255,255,255,0.1); }
            .video-card-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 14px 18px;
                border-bottom: 1px solid var(--border);
            }
            .video-card-title {
                font-size: 12px; font-weight: 600; text-transform: uppercase;
                letter-spacing: 1px; color: var(--text-secondary);
                display: flex; align-items: center; gap: 8px;
            }
            .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); animation: dotPulse 1s infinite; }
            .video-card-body { padding: 0; background: #000; position: relative; min-height: 320px; display: flex; align-items: center; justify-content: center; }
            .video-card-body video,
            .video-card-body img { width: 100%; height: auto; display: block; }
            .placeholder-text { color: var(--text-muted); font-size: 13px; text-align: center; padding: 40px; }

            /* ---- Detection Log ---- */
            .log-card {
                background: var(--bg-card);
                backdrop-filter: blur(12px);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                overflow: hidden;
            }
            .log-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 14px 18px;
                border-bottom: 1px solid var(--border);
            }
            .log-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }
            .log-clear { font-size: 11px; color: var(--text-muted); cursor: pointer; border: none; background: none; font-family: 'Inter', sans-serif; }
            .log-clear:hover { color: var(--text-secondary); }
            .log-body {
                max-height: 200px; overflow-y: auto; padding: 12px 18px;
                font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8;
                color: var(--text-secondary);
            }
            .log-body::-webkit-scrollbar { width: 4px; }
            .log-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            .log-entry { display: flex; gap: 12px; }
            .log-time { color: var(--text-muted); min-width: 80px; }
            .log-fire { color: var(--red); }
            .log-smoke { color: #f59e0b; }

            /* ---- Footer ---- */
            .footer {
                text-align: center; padding: 32px 0 24px;
                color: var(--text-muted); font-size: 12px;
            }
            .footer a { color: var(--text-secondary); text-decoration: none; }
            .footer a:hover { color: var(--accent); }

            /* ---- Responsive ---- */
            @media (max-width: 768px) {
                .stats-row { grid-template-columns: repeat(2, 1fr); }
                .video-grid { grid-template-columns: 1fr; }
                .main { padding: 16px; }
                .conf-group { margin-left: 0; width: 100%; }
            }
        </style>
    </head>
    <body>

    <!-- Header -->
    <div class="header">
        <div class="header-inner">
            <div class="logo">
                <div class="logo-icon">&#128293;</div>
                Fire<span>Watch</span> 
            </div>
            <div class="header-badge">
                <span class="header-dot"></span>  Model Active
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main">

        <!-- Alert Banner -->
        <div id="alertBanner" class="alert-banner">
            <span id="alertIcon">&#9888;&#65039;</span>
            <span id="alertText">System ready. Start webcam to begin detection.</span>
        </div>

        <!-- Stats -->
        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-label">Fire Status</div>
                <div class="stat-value fire" id="statFire">--</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Smoke Status</div>
                <div class="stat-value smoke" id="statSmoke">--</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">FPS</div>
                <div class="stat-value fps" id="statFPS">--</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Inference</div>
                <div class="stat-value inf" id="statInf">--</div>
            </div>
        </div>

        <!-- Controls -->
        <div class="controls-bar">
            <button id="btnStart" class="btn btn-start" onclick="startWebcam()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                Start Webcam
            </button>
            <button id="btnStop" class="btn btn-stop" onclick="stopWebcam()" disabled>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                Stop
            </button>
            <div class="divider"></div>
            <label class="toggle-label">
                <input type="checkbox" id="autoDetect" checked />
                Auto-detect
            </label>
            <div class="conf-group">
                <span>0</span>
                <input type="range" id="confSlider" min="5" max="95" value="25" />
                <span class="conf-val" id="confValue">25%</span>
            </div>
        </div>

        <!-- Video Panels -->
        <div class="video-grid">
            <div class="video-card">
                <div class="video-card-header">
                    <div class="video-card-title">
                        <div class="live-dot" id="liveDot" style="display:none;"></div>
                        Camera Feed
                    </div>
                    <span style="font-size:11px;color:var(--text-muted);" id="resLabel">--</span>
                </div>
                <div class="video-card-body">
                    <video id="webcamVideo" autoplay muted playsinline style="display:none;"></video>
                    <canvas id="webcamCanvas" style="display:none;"></canvas>
                    <div class="placeholder-text" id="camPlaceholder">Click <strong>Start Webcam</strong> to begin</div>
                </div>
            </div>
            <div class="video-card">
                <div class="video-card-header">
                    <div class="video-card-title">Detection Output</div>
                    <span style="font-size:11px;color:var(--text-muted);" id="detCount">0 objects</span>
                </div>
                <div class="video-card-body">
                    <img id="webcamResult" src="" alt="" style="display:none;" />
                    <div class="placeholder-text" id="detPlaceholder">Annotated frames will appear here</div>
                </div>
            </div>
        </div>

        <!-- Detection Log -->
        <div class="log-card">
            <div class="log-header">
                <div class="log-title">Detection Log</div>
                <button class="log-clear" onclick="document.getElementById('detectionLog').innerHTML=''">Clear</button>
            </div>
            <div class="log-body" id="detectionLog">
                <span style="color:var(--text-muted);">Waiting for detections...</span>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            FireWatch &mdash;; &nbsp;|&nbsp;
            <a href="/docs">API Docs</a> &nbsp;|&nbsp;
            <a href="/model/info">Model Info</a> &nbsp;|&nbsp;
            <a href="/health">Health Check</a>
        </div>
    </div>

    <script>
    // ---- State ----
    let webcamStream = null;
    let detecting = false;
    let totalDetections = 0;

    const video = document.getElementById('webcamVideo');
    const canvas = document.getElementById('webcamCanvas');
    const ctx = canvas.getContext('2d');
    const confSlider = document.getElementById('confSlider');

    confSlider.addEventListener('input', () => {
        document.getElementById('confValue').textContent = confSlider.value + '%';
    });

    // ---- Webcam Start ----
    async function startWebcam() {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            video.srcObject = webcamStream;
            video.style.display = 'block';
            document.getElementById('camPlaceholder').style.display = 'none';
            document.getElementById('liveDot').style.display = 'block';
            document.getElementById('btnStart').disabled = true;
            document.getElementById('btnStop').disabled = false;
            detecting = true;

            video.onloadedmetadata = () => {
                document.getElementById('resLabel').textContent = video.videoWidth + 'x' + video.videoHeight;
            };

            updateAlert('safe', '&#9989; System active. Monitoring for fire and smoke...');
            detectLoop();
        } catch (err) {
            updateAlert('danger', '&#10060; Camera access denied: ' + err.message);
        }
    }

    // ---- Webcam Stop ----
    function stopWebcam() {
        detecting = false;
        if (webcamStream) {
            webcamStream.getTracks().forEach(t => t.stop());
            webcamStream = null;
        }
        video.srcObject = null;
        video.style.display = 'none';
        document.getElementById('camPlaceholder').style.display = 'block';
        document.getElementById('liveDot').style.display = 'none';
        document.getElementById('btnStart').disabled = false;
        document.getElementById('btnStop').disabled = true;
        document.getElementById('resLabel').textContent = '--';
        updateAlert('', '');
    }

    // ---- Alert ----
    function updateAlert(type, html) {
        const banner = document.getElementById('alertBanner');
        if (!type) { banner.style.display = 'none'; banner.className = 'alert-banner'; return; }
        banner.className = 'alert-banner ' + type;
        banner.style.display = 'flex';
        document.getElementById('alertText').innerHTML = html;
    }

    // ---- Detection Loop ----
    async function detectLoop() {
        if (!detecting) return;
        if (!document.getElementById('autoDetect').checked) {
            setTimeout(detectLoop, 500);
            return;
        }

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob || !detecting) { setTimeout(detectLoop, 100); return; }

            const conf = parseInt(confSlider.value) / 100;
            const form = new FormData();
            form.append('file', blob, 'frame.jpg');

            const t0 = performance.now();
            try {
                const res = await fetch('/detect/base64?confidence=' + conf, { method: 'POST', body: form });
                const data = await res.json();
                const roundTrip = ((performance.now() - t0) / 1000).toFixed(3);
                const fps = (1 / parseFloat(roundTrip)).toFixed(1);

                // Show annotated image
                const resultImg = document.getElementById('webcamResult');
                resultImg.src = 'data:image/jpeg;base64,' + data.annotated_image;
                resultImg.style.display = 'block';
                document.getElementById('detPlaceholder').style.display = 'none';

                const fire = data.fire_detected;
                const smoke = data.smoke_detected;

                // Stats
                document.getElementById('statFire').textContent = fire ? 'ALERT' : 'Clear';
                document.getElementById('statFire').style.color = fire ? 'var(--red)' : 'var(--green)';
                document.getElementById('statSmoke').textContent = smoke ? 'ALERT' : 'Clear';
                document.getElementById('statSmoke').style.color = smoke ? '#f59e0b' : 'var(--green)';
                document.getElementById('statFPS').textContent = fps;
                document.getElementById('statInf').textContent = data.inference_time_sec + 's';
                document.getElementById('detCount').textContent = data.total_detections + ' objects';

                // Alert banner
                if (fire && smoke) {
                    updateAlert('danger', '&#128680; FIRE AND SMOKE DETECTED! Immediate attention required.');
                } else if (fire) {
                    updateAlert('danger', '&#128293; FIRE DETECTED! Check the area immediately.');
                } else if (smoke) {
                    updateAlert('danger', '&#127787;&#65039; SMOKE DETECTED! Possible fire hazard.');
                } else {
                    updateAlert('safe', '&#9989; All clear. No threats detected.');
                }

                // Log
                if (data.detections && data.detections.length > 0) {
                    totalDetections += data.detections.length;
                    const log = document.getElementById('detectionLog');
                    const time = new Date().toLocaleTimeString();
                    data.detections.forEach(d => {
                        const cls = d.label.toLowerCase().includes('fire') ? 'log-fire' : 'log-smoke';
                        const entry = '<div class="log-entry"><span class="log-time">' + time + '</span><span class="' + cls + '">' + d.label + ' &mdash; ' + (d.confidence * 100).toFixed(1) + '%</span></div>';
                        log.innerHTML = entry + log.innerHTML;
                    });
                    // Trim log
                    while (log.children.length > 80) log.lastChild.remove();
                }
            } catch (err) {
                console.error('Detection error:', err);
            }

            if (detecting) setTimeout(detectLoop, 50);
        }, 'image/jpeg', 0.8);
    }
    </script>
    </body>
    </html>
    """


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/model/info")
def model_info():
    """Return model metadata and class names."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "model_path": str(MODEL_PATH),
        "class_names": model.names,
        "task": model.task,
    }


@app.post("/detect")
async def detect(
    file: UploadFile = File(..., description="Image file (jpg/png/bmp/webp)"),
    confidence: float = Query(CONFIDENCE_THRESHOLD, ge=0.0, le=1.0, description="Min confidence threshold"),
):
    """
    Run fire & smoke detection on the uploaded image.
    Returns JSON with detection results.
    """
    contents = await file.read()
    img = _read_image_from_upload(contents)

    start = time.perf_counter()
    result = _run_detection(img, confidence)
    elapsed = round(time.perf_counter() - start, 4)

    return JSONResponse(content={
        "success": True,
        "inference_time_sec": elapsed,
        **result,
    })


@app.post("/detect/annotated")
async def detect_annotated(
    file: UploadFile = File(..., description="Image file"),
    confidence: float = Query(CONFIDENCE_THRESHOLD, ge=0.0, le=1.0),
):
    """
    Run detection and return the annotated image (with bounding boxes drawn).
    """
    contents = await file.read()
    img = _read_image_from_upload(contents)
    annotated = _annotate_image(img, confidence)

    # Encode as JPEG
    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type="image/jpeg")


@app.post("/detect/base64")
async def detect_base64(
    file: UploadFile = File(..., description="Image file"),
    confidence: float = Query(CONFIDENCE_THRESHOLD, ge=0.0, le=1.0),
):
    """
    Run detection, return JSON with annotated image encoded as base64 AND detection data.
    Useful for front-end rendering without a second request.
    """
    contents = await file.read()
    img = _read_image_from_upload(contents)

    start = time.perf_counter()
    result = _run_detection(img, confidence)
    elapsed = round(time.perf_counter() - start, 4)

    annotated = _annotate_image(img, confidence)
    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

    return JSONResponse(content={
        "success": True,
        "inference_time_sec": elapsed,
        "annotated_image": b64,
        **result,
    })


@app.post("/detect/batch")
async def detect_batch(
    files: list[UploadFile] = File(..., description="Multiple image files"),
    confidence: float = Query(CONFIDENCE_THRESHOLD, ge=0.0, le=1.0),
):
    """
    Run detection on multiple images at once. Returns a list of results.
    """
    all_results = []
    for f in files:
        contents = await f.read()
        img = _read_image_from_upload(contents)
        start = time.perf_counter()
        result = _run_detection(img, confidence)
        elapsed = round(time.perf_counter() - start, 4)
        all_results.append({
            "filename": f.filename,
            "inference_time_sec": elapsed,
            **result,
        })
    return JSONResponse(content={"success": True, "results": all_results})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
