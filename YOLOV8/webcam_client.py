"""
🔥 Fire & Smoke Detection — Webcam Client
==========================================
Run this on the laptop that has the webcam.
It captures frames, sends them to the remote server API,
and displays the annotated result with bounding boxes.

Usage:
    pip install opencv-python requests numpy
    python webcam_client.py --server http://<SERVER_IP>:8000

Controls:
    Q  — Quit
    +  — Increase confidence threshold
    -  — Decrease confidence threshold
"""

import argparse
import time
import sys

import cv2
import numpy as np
import requests


def parse_args():
    p = argparse.ArgumentParser(description="Webcam client for Fire & Smoke Detection API")
    p.add_argument(
        "--server",
        type=str,
        default="http://localhost:8000",
        help="Base URL of the detection server (e.g. http://192.168.1.10:8000)",
    )
    p.add_argument("--camera", type=int, default=0, help="Webcam index (default: 0)")
    p.add_argument("--confidence", type=float, default=0.25, help="Initial confidence threshold (0-1)")
    p.add_argument("--width", type=int, default=640, help="Capture width")
    p.add_argument("--height", type=int, default=480, help="Capture height")
    p.add_argument("--skip-frames", type=int, default=0, help="Skip N frames between detections to reduce load")
    return p.parse_args()


def check_server(base_url: str):
    """Verify the server is reachable."""
    try:
        r = requests.get(f"{base_url}/health", timeout=5)
        data = r.json()
        if data.get("model_loaded"):
            print(f"[OK] Server is up and model is loaded at {base_url}")
            # Get model info
            info = requests.get(f"{base_url}/model/info", timeout=5).json()
            print(f"[OK] Classes: {info.get('class_names')}")
            return True
        else:
            print("[WARN] Server is up but model is NOT loaded yet.")
            return False
    except requests.ConnectionError:
        print(f"[ERROR] Cannot reach server at {base_url}")
        print("        Make sure the server is running and the IP/port is correct.")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False


def send_frame(base_url: str, frame: np.ndarray, confidence: float):
    """Send a frame to the server and get annotated image + detections back."""
    # Encode frame as JPEG
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    files = {"file": ("frame.jpg", buf.tobytes(), "image/jpeg")}
    params = {"confidence": confidence}

    try:
        r = requests.post(f"{base_url}/detect/base64", files=files, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
        else:
            print(f"[WARN] Server returned {r.status_code}")
            return None
    except requests.ConnectionError:
        print("[WARN] Lost connection to server...")
        return None
    except requests.Timeout:
        print("[WARN] Request timed out")
        return None


def draw_status_bar(frame, fire, smoke, fps, confidence, inference_time):
    """Draw an info bar at the top of the frame."""
    h, w = frame.shape[:2]
    # Dark overlay bar
    cv2.rectangle(frame, (0, 0), (w, 60), (0, 0, 0), -1)

    # Fire status
    fire_color = (0, 0, 255) if fire else (0, 200, 0)
    fire_text = "FIRE DETECTED!" if fire else "No Fire"
    cv2.putText(frame, fire_text, (10, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, fire_color, 2)

    # Smoke status
    smoke_color = (0, 165, 255) if smoke else (0, 200, 0)
    smoke_text = "SMOKE DETECTED!" if smoke else "No Smoke"
    cv2.putText(frame, smoke_text, (10, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.6, smoke_color, 2)

    # FPS & confidence
    cv2.putText(frame, f"FPS: {fps:.1f}", (w - 200, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.putText(frame, f"Conf: {confidence:.0%}", (w - 200, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    if inference_time:
        cv2.putText(frame, f"Inf: {inference_time}s", (w - 380, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

    # Alert flash if fire or smoke
    if fire or smoke:
        cv2.rectangle(frame, (0, 0), (w, 4), (0, 0, 255), -1)
        cv2.rectangle(frame, (0, h - 4), (w, h), (0, 0, 255), -1)

    return frame


def main():
    args = parse_args()
    base_url = args.server.rstrip("/")
    confidence = args.confidence

    print("=" * 50)
    print("  Fire & Smoke Detection — Webcam Client")
    print("=" * 50)
    print(f"  Server : {base_url}")
    print(f"  Camera : {args.camera}")
    print(f"  Confidence: {confidence:.0%}")
    print("=" * 50)

    # Check server connectivity
    if not check_server(base_url):
        sys.exit(1)

    # Open webcam
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera {args.camera}")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)
    print(f"[OK] Webcam opened ({args.width}x{args.height})")
    print("\nControls: Q=quit  +/=increase conf  -/_ decrease conf\n")

    frame_count = 0
    fps = 0.0
    last_result = None
    last_annotated = None
    last_inference_time = None
    fire_detected = False
    smoke_detected = False

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Failed to read from webcam")
            break

        frame_count += 1

        # Skip frames if configured (to reduce network load)
        if args.skip_frames > 0 and frame_count % (args.skip_frames + 1) != 0:
            # Show last annotated frame or raw frame
            display = last_annotated if last_annotated is not None else frame
            display = draw_status_bar(display.copy(), fire_detected, smoke_detected, fps, confidence, last_inference_time)
            cv2.imshow("Fire & Smoke Detection", display)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            continue

        t0 = time.perf_counter()

        # Send frame to server
        result = send_frame(base_url, frame, confidence)

        t1 = time.perf_counter()
        round_trip = t1 - t0
        fps = 1.0 / round_trip if round_trip > 0 else 0

        if result and result.get("success"):
            fire_detected = result.get("fire_detected", False)
            smoke_detected = result.get("smoke_detected", False)
            last_inference_time = result.get("inference_time_sec")
            last_result = result

            # Decode the annotated image from base64
            import base64
            img_bytes = base64.b64decode(result["annotated_image"])
            nparr = np.frombuffer(img_bytes, np.uint8)
            last_annotated = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            display = last_annotated
        else:
            display = frame

        # Draw overlay
        display = draw_status_bar(display.copy(), fire_detected, smoke_detected, fps, confidence, last_inference_time)
        cv2.imshow("Fire & Smoke Detection", display)

        # Handle keyboard input
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key in (ord("+"), ord("=")):
            confidence = min(confidence + 0.05, 1.0)
            print(f"[INFO] Confidence -> {confidence:.0%}")
        elif key in (ord("-"), ord("_")):
            confidence = max(confidence - 0.05, 0.05)
            print(f"[INFO] Confidence -> {confidence:.0%}")

    cap.release()
    cv2.destroyAllWindows()
    print("\n[INFO] Client stopped.")


if __name__ == "__main__":
    main()
