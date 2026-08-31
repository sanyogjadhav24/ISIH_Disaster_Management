"""
Quick test script — sends a local image to the detection API and prints results.
Usage:  python test_client.py <image_path>
"""

import sys
import requests

API_URL = "http://localhost:8000"


def test_health():
    r = requests.get(f"{API_URL}/health")
    print("[Health]", r.json())


def test_model_info():
    r = requests.get(f"{API_URL}/model/info")
    print("[Model Info]", r.json())


def test_detect(image_path: str):
    with open(image_path, "rb") as f:
        r = requests.post(
            f"{API_URL}/detect",
            files={"file": (image_path, f, "image/jpeg")},
            params={"confidence": 0.25},
        )
    data = r.json()
    print(f"\n[Detection Results for '{image_path}']")
    print(f"  Fire detected : {data.get('fire_detected')}")
    print(f"  Smoke detected: {data.get('smoke_detected')}")
    print(f"  Total objects : {data.get('total_detections')}")
    print(f"  Inference time: {data.get('inference_time_sec')}s")
    for det in data.get("detections", []):
        print(f"    - {det['label']} ({det['confidence']:.2%})  bbox={det['bbox']}")


if __name__ == "__main__":
    test_health()
    test_model_info()

    if len(sys.argv) > 1:
        test_detect(sys.argv[1])
    else:
        print("\nUsage: python test_client.py <path_to_image>")
        print("Example: python test_client.py fire_sample.jpg")
