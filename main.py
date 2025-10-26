from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import cv2
import numpy as np
from PIL import Image
import io
import base64
from barcode_image import detect_barcode

app = FastAPI(title="Barcode Detection API", version="1.0.0")

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Barcode Detection API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/favicon.ico")
async def favicon():
    """Return a simple favicon to prevent 404 errors"""
    return Response(content="", media_type="image/x-icon")

@app.post("/detect-barcode")
async def detect_barcode_endpoint(file: UploadFile = File(...)):
    """
    Upload an image and detect barcodes in it.
    
    Returns:
        JSON response with barcode detection results
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process the uploaded image
        contents = await file.read()
        
        # Convert bytes to PIL Image
        pil_image = Image.open(io.BytesIO(contents))
        
        # Convert PIL Image to OpenCV format (BGR)
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Detect barcode (without showing result)
        result = detect_barcode(opencv_image, show_result=False)
        
        # Prepare response
        response_data = {
            "success": result["success"],
            "barcode_text": result["barcode_text"],
            "filename": file.filename,
            "file_size": len(contents)
        }
        
        # Add corners if barcode was found
        if result["success"] and result["corners"] is not None:
            response_data["corners"] = result["corners"].tolist()
        
        # Add annotated image as base64 if available
        if result["image_with_annotations"] is not None:
            # Convert annotated image to base64
            _, buffer = cv2.imencode('.jpg', result["image_with_annotations"])
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            response_data["annotated_image"] = img_base64
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/detect-barcode-base64")
async def detect_barcode_base64(data: dict):
    """
    Detect barcodes from a base64 encoded image.
    
    Expected input:
        {
            "image": "base64_encoded_image_string"
        }
    """
    try:
        if "image" not in data:
            raise HTTPException(status_code=400, detail="Missing 'image' field in request body")
        
        # Decode base64 image
        image_data = base64.b64decode(data["image"])
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to OpenCV format
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Detect barcode
        result = detect_barcode(opencv_image, show_result=False)
        
        # Prepare response
        response_data = {
            "success": result["success"],
            "barcode_text": result["barcode_text"]
        }
        
        if result["success"] and result["corners"] is not None:
            response_data["corners"] = result["corners"].tolist()
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
