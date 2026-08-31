import cv2
import numpy as np
import pickle

# Camera settings
width, height = 1920, 1080

# Initialize variables
cap = cv2.VideoCapture(1)
cap.set(3, width)
cap.set(4, height)

points = np.zeros((4, 2), int)
counter = 0


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


def get_warp_size(ordered_points):
    tl, tr, bl, br = ordered_points
    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)

    warp_w = max(2, int(max(width_top, width_bottom)))
    warp_h = max(2, int(max(height_left, height_right)))
    return warp_w, warp_h

def mousePoints(event, x, y, flags, params):
    global counter
    if event == cv2.EVENT_LBUTTONDOWN:
        if counter < 4:
            points[counter] = x, y
            counter += 1
            print(f"Clicked Points: {points}")

def warp_image(img, points, size=None):
    pts1 = order_points(points)
    if size is None:
        size = get_warp_size(pts1)

    pts2 = np.float32([
        [0, 0],
        [size[0], 0],
        [0, size[1]],
        [size[0], size[1]]
    ])
    matrix = cv2.getPerspectiveTransform(pts1, pts2)
    imgOutput = cv2.warpPerspective(img, matrix, (size[0], size[1]))
    return imgOutput, matrix

while True:
    success, img = cap.read()
    if not success:
        break

    if counter == 4:
        ordered_points = order_points(points)
        warp_size = get_warp_size(ordered_points)
        with open("forest_map.p", "wb") as fileObj:
            pickle.dump(
                {
                    "points": ordered_points.astype(np.float32),
                    "warp_size": warp_size,
                },
                fileObj,
            )
        print(f"Points saved with warp size: {warp_size}")

        imgOutput, matrix = warp_image(img, ordered_points, size=warp_size)
        cv2.imshow("Output Image", imgOutput)

    for i in range(min(counter, 4)):
        cv2.circle(img, (points[i][0], points[i][1]), 5, (0, 255, 0), cv2.FILLED)

    cv2.putText(
        img,
        "Click corners in order: TL, TR, BL, BR",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (0, 255, 255),
        2,
    )

    cv2.imshow("Original Image", img)
    cv2.setMouseCallback("Original Image", mousePoints)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
