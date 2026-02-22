import cv2
import sys
from barcode_image import detect_barcode

# --- 1. Load the Input Image ---
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot open camera")
    exit()


while True:
    ret, frame = cap.read()
    if not ret:
        print("Cannot read frame")
        break
    cv2.imshow('Video', frame)
    key = cv2.waitKey(1)
    if key == ord('q') or key == 27:  # 27 is the ESC key
        break    
    # --- 3. Detect and Decode the Barcode ---
    result = detect_barcode(frame)
    if result['success']:
        break


