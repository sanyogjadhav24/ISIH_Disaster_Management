import cv2
import pickle
import cvzone
import numpy as np
import os
import time
from datetime import datetime
from cvzone.HandTrackingModule import HandDetector

try:
    from twilio.rest import Client
except Exception:
    Client = None

# -------------------- CONFIG --------------------
CAM_WIDTH, CAM_HEIGHT = 1280, 720
WARP_WIDTH, WARP_HEIGHT = 1920, 1080

MAP_FILE = "forest_map.p"
COUNTRIES_FILE = "forest.p"
HTML_OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "location_output.html")
ALERT_PHONE_NUMBER = "+917559183891"
SMS_COOLDOWN_SECONDS = 300

TWILIO_ACCOUNT_SID = "ACdbef51319cd287f72d54458ff121441d"
TWILIO_AUTH_TOKEN = "12813d13dd8be7abc9cd209e08cee182"
TWILIO_FROM_NUMBER = "+16812902695"

# -------------------- LOAD DATA --------------------
with open(MAP_FILE, "rb") as f:
    map_data = pickle.load(f)

if isinstance(map_data, dict):
    map_points = np.array(map_data.get("points"), dtype=np.float32)
    map_warp_size = tuple(map_data.get("warp_size", (WARP_WIDTH, WARP_HEIGHT)))
else:
    map_points = np.array(map_data, dtype=np.float32)
    map_warp_size = (WARP_WIDTH, WARP_HEIGHT)

WARP_WIDTH, WARP_HEIGHT = int(map_warp_size[0]), int(map_warp_size[1])
print("Loaded Map Coordinates")
print(f"Using warp size: {WARP_WIDTH}x{WARP_HEIGHT}")

with open(COUNTRIES_FILE, "rb") as f:
    polygons = pickle.load(f)
print(f"Loaded {len(polygons)} regions")

# -------------------- CAMERA --------------------
cap = cv2.VideoCapture(1)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

# -------------------- HAND DETECTOR --------------------
detector = HandDetector(maxHands=1, detectionCon=0.5, minTrackCon=0.5)

last_html_content = None
last_alerted_region = None
last_alert_time = 0


def order_points(pts):
    pts = np.array(pts, dtype=np.float32)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)

    ordered = np.zeros((4, 2), dtype=np.float32)
    ordered[0] = pts[np.argmin(s)]      # top-left
    ordered[1] = pts[np.argmin(diff)]   # top-right
    ordered[2] = pts[np.argmax(diff)]   # bottom-left
    ordered[3] = pts[np.argmax(s)]      # bottom-right
    return ordered


def write_location_html(location_name):
    global last_html_content

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    location_text = location_name if location_name else "No region selected"
    html = f"""<!doctype html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <meta http-equiv=\"refresh\" content=\"1\" />
    <title>FireWatch Location Output</title>
    <style>
        body {{
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Segoe UI, Tahoma, sans-serif;
            background: linear-gradient(120deg, #eef6ff, #f4fff1);
            color: #0f172a;
        }}
        .card {{
            width: min(92vw, 760px);
            border-radius: 18px;
            background: #ffffff;
            padding: 28px;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
            text-align: center;
        }}
        .title {{
            margin: 0 0 12px;
            font-size: 1.2rem;
            color: #1e293b;
        }}
        .location {{
            margin: 0;
            font-size: clamp(1.8rem, 4vw, 2.8rem);
            font-weight: 700;
            color: #14532d;
        }}
        .time {{
            margin-top: 14px;
            font-size: 0.95rem;
            color: #475569;
        }}
    </style>
</head>
<body>
    <section class=\"card\">
        <h1 class=\"title\">Current Pointed Location</h1>
        <p class=\"location\">{location_text}</p>
        <p class=\"time\">Last Update: {now}</p>
    </section>
</body>
</html>
"""

    # Avoid rewriting if content hasn't changed.
    if html == last_html_content:
        return

    tmp_file = f"{HTML_OUTPUT_FILE}.tmp"
    with open(tmp_file, "w", encoding="utf-8") as file_obj:
        file_obj.write(html)
    os.replace(tmp_file, HTML_OUTPUT_FILE)
    last_html_content = html


def send_sms_alert(region_name):
    global last_alerted_region, last_alert_time

    if not region_name:
        return

    now = time.time()
    if region_name == last_alerted_region and now - last_alert_time < SMS_COOLDOWN_SECONDS:
        return

    if not Client or not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        print(
            "SMS skipped. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to enable alerts."
        )
        return

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message_body = f"Fire detected in region: {region_name}"
        client.messages.create(
            body=message_body,
            from_=TWILIO_FROM_NUMBER,
            to=ALERT_PHONE_NUMBER,
        )
        last_alerted_region = region_name
        last_alert_time = now
        print(f"SMS alert sent for region: {region_name}")
    except Exception as exc:
        print(f"SMS alert failed: {exc}")

# -------------------- FUNCTIONS --------------------
def warp_image(img, points):
    pts1 = order_points(points)
    pts2 = np.float32([
        [0, 0],
        [WARP_WIDTH, 0],
        [0, WARP_HEIGHT],
        [WARP_WIDTH, WARP_HEIGHT]
    ])
    matrix = cv2.getPerspectiveTransform(pts1, pts2)
    warped = cv2.warpPerspective(img, matrix, (WARP_WIDTH, WARP_HEIGHT))
    return warped, matrix


def warp_single_point(point, matrix):
    point_h = np.array([[point[0], point[1], 1]], dtype=np.float32)
    transformed = matrix @ point_h.T
    transformed = transformed.T
    return transformed[0][:2] / transformed[0][2]


def get_finger_location(img, matrix):
    # cvzone versions return either `hands` or `(hands, img)`.
    result = detector.findHands(img, draw=False)
    hands = result[0] if isinstance(result, tuple) else result

    if hands:
        hand = hands[0]
        lm_list = hand.get("lmList") if isinstance(hand, dict) else hand
        if lm_list and len(lm_list) > 8:
            index_finger = lm_list[8][:2]
            cv2.circle(img, (int(index_finger[0]), int(index_finger[1])), 6, (255, 0, 255), cv2.FILLED)
            wp = warp_single_point(index_finger, matrix)
            return int(wp[0]), int(wp[1])
    return None


def draw_selected_region(polygons, point):
    output = np.zeros((WARP_HEIGHT, WARP_WIDTH, 3), dtype=np.uint8)
    selected_name = None

    for polygon, name in polygons:
        poly_np = np.array(polygon, np.int32)
        if cv2.pointPolygonTest(poly_np, point, False) >= 0:
            selected_name = name
            cv2.fillPoly(output, [poly_np], (0, 180, 0))
            cv2.polylines(output, [poly_np], True, (0, 255, 0), 3)

            cvzone.putTextRect(
                output,
                name,
                (50, 80),
                scale=2,
                thickness=3
            )
            break  # show only ONE selected region

    return output, selected_name


write_location_html(None)


# -------------------- MAIN LOOP --------------------
while True:
    success, img = cap.read()
    if not success:
        break

    # Warp camera to map space
    _, matrix = warp_image(img, map_points)

    # Get finger position
    warped_point = get_finger_location(img, matrix)

    # Create map view
    if warped_point:
        map_view, selected_location = draw_selected_region(polygons, warped_point)
    else:
        map_view = np.zeros((WARP_HEIGHT, WARP_WIDTH, 3), dtype=np.uint8)
        selected_location = None

    write_location_html(selected_location)
    send_sms_alert(selected_location)

    # Resize for display
    cam_view = cv2.resize(img, (640, 480))
    map_view = cv2.resize(map_view, (640, 480))

    # Show ONLY TWO WINDOWS
    cv2.imshow("Camera View", cam_view)
    cv2.imshow("Map View (Selected Region)", map_view)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# -------------------- CLEANUP --------------------
cap.release()
cv2.destroyAllWindows()
