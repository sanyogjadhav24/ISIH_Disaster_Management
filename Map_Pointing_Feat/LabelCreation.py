import cv2
import numpy as np
import pickle
import os

# File paths
map_file_path = "forest_map.p"
countries_file_path = "forest.p"

# Camera settings
width, height = 1920, 1080

cap = cv2.VideoCapture(1)
cap.set(3, width)
cap.set(4, height)

# Load map points from file
with open(map_file_path, 'rb') as file_obj:
    map_data = pickle.load(file_obj)

if isinstance(map_data, dict):
    map_points = np.array(map_data.get("points"), dtype=np.float32)
    map_warp_size = tuple(map_data.get("warp_size", (1920, 1080)))
else:
    map_points = np.array(map_data, dtype=np.float32)
    map_warp_size = (1920, 1080)

print(f"Loaded map coordinates: {map_points}")
print(f"Using warp size: {map_warp_size}")

counter = 0
current_polygon = []


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

# Load countries file if it exists, otherwise initialize an empty list
if os.path.exists(countries_file_path):
    with open(countries_file_path, 'rb') as file_obj:
        polygons = pickle.load(file_obj)
    print(f"Loaded {len(polygons)} countries")
else:
    polygons = []
    print("No countries file found, starting with an empty list")

def mousePoints(event, x, y, flags, params):
    global counter, current_polygon
    if event == cv2.EVENT_LBUTTONDOWN:
        current_polygon.append((x, y))
        print(f"Point added: {x, y}")

def warp_image(img, points, size):
    pts1 = order_points(points)
    pts2 = np.float32([[0, 0], [size[0], 0], [0, size[1]], [size[0], size[1]]])
    matrix = cv2.getPerspectiveTransform(pts1, pts2)
    imgOutput = cv2.warpPerspective(img, matrix, (size[0], size[1]))
    return imgOutput, matrix

while True:
    success, img = cap.read()
    if not success:
        break
    imgWarped, matrix = warp_image(img, map_points, map_warp_size)

    # Draw current polygon
    if current_polygon:
        cv2.polylines(imgWarped, [np.array(current_polygon)], isClosed=True, color=(0, 0, 255), thickness=2)

    # Draw saved polygons
    overlay = imgWarped.copy()
    for polygon, name in polygons:
        cv2.polylines(imgWarped, [np.array(polygon)], isClosed=True, color=(0, 255, 0), thickness=2)
        cv2.fillPoly(overlay, [np.array(polygon)], (0, 255, 0))
        # Optional: Add country name on the polygon
        cv2.putText(overlay, name, tuple(polygon[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    cv2.addWeighted(overlay, 0.35, imgWarped, 0.65, 0, imgWarped)

    cv2.imshow("Warped Image", imgWarped)
    cv2.setMouseCallback("Warped Image", mousePoints)

    key = cv2.waitKey(1)
    if key == ord("s") and len(current_polygon) > 2:
        country_name = input("Enter the Country Name: ")
        polygons.append([current_polygon, country_name])
        current_polygon = []
        counter += 1
        print(f"Number of Countries Saved: {len(polygons)}")

    if key == ord("q"):
        with open(countries_file_path, 'wb') as file_obj:
            pickle.dump(polygons, file_obj)
        print(f"Saved {len(polygons)} countries")
        break

    if key == ord("d"):
        if polygons:
            polygons.pop()
            print("Removed the last polygon")

cap.release()
cv2.destroyAllWindows()
