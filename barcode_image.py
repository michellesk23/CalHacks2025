import cv2
import sys

def detect_barcode(image, show_result=True):
    """
    Detect and decode barcodes in an image.
    
    Args:
        image: Input image (numpy array or image path string)
        show_result: Whether to display the result with annotations (default: True)
    
    Returns:
        dict: Contains 'success', 'barcode_text', 'corners', and 'image_with_annotations'
    """
    # Handle both image path strings and numpy arrays
    if isinstance(image, str):
        img = cv2.imread(image)
        if img is None:
            return {
                'success': False,
                'error': f"Cannot load image at {image}",
                'barcode_text': None,
                'corners': None,
                'image_with_annotations': None
            }
    else:
        img = image.copy()
    
    # Initialize the Barcode Detector
    detector = cv2.barcode_BarcodeDetector()
    
    # Detect and Decode the Barcode
    ok, decoded_info, decoded_type, corners = detector.detectAndDecodeWithType(img)
    
    result = {
        'success': False,
        'barcode_text': None,
        'corners': None,
        'image_with_annotations': None
    }
    
    if not ok or not decoded_info or decoded_info[0] == "":
        result['success'] = False
        #if show_result:
            #print("No barcode found.")
    else:
        # At least one barcode detected and decoded
        barcode_text = decoded_info[0]
        result['success'] = True
        result['barcode_text'] = barcode_text
        result['corners'] = corners[0] if corners is not None else None
        
        if show_result:
            #print("Decoded barcode:", barcode_text)
            
            # Create display image with annotations
            h, w = img.shape[:2]
            max_w, max_h = 1000, 800
            scale = min(max_w / w, max_h / h, 1.0)
            display = cv2.resize(img, (int(w * scale), int(h * scale))) if scale < 1.0 else img.copy()
            
            # Draw annotations on the display image
            if corners is not None:
                points = corners[0].astype(int)
                disp_points = (points * scale).astype(int) if scale < 1.0 else points
                
                # Draw polygon around barcode
                cv2.polylines(display, [disp_points], isClosed=True, color=(0, 255, 0), thickness=5)
                
                # Add label above the box
                x_min = int(disp_points[:, 0].min())
                y_min = int(disp_points[:, 1].min())
                label = str(barcode_text)
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.7
                thickness = 2
                (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)
                pad = 4
                text_x = max(0, x_min)
                text_y = max(text_h + pad + 2, y_min - 6)
                
                # Draw background rectangle for text
                cv2.rectangle(
                    display,
                    (text_x - pad, text_y - text_h - baseline - pad),
                    (text_x + text_w + pad, text_y + baseline + pad // 2),
                    (0, 0, 0),
                    thickness=-1,
                )
                
                # Draw text
                cv2.putText(
                    display,
                    label,
                    (text_x, text_y),
                    font,
                    font_scale,
                    (0, 255, 255),
                    thickness,
                    lineType=cv2.LINE_AA,
                )
            
            result['image_with_annotations'] = display
            
            # Display the result
            cv2.namedWindow('Barcode Detection', cv2.WINDOW_NORMAL)
            cv2.imshow('Barcode Detection', display)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
    
    return result

# Example usage when run as script
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python barcode_image.py <image_file>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = detect_barcode(image_path, show_result=True)
    
    if result['success']:
        print(f"Barcode detected: {result['barcode_text']}")
    else:
        print("No barcode found or error occurred.")
