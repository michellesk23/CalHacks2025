#!/usr/bin/env python3
"""
Simple script to start the FastAPI barcode detection server.
"""

import uvicorn
import sys
import os

def main():
    # Check if required dependencies are installed
    try:
        import fastapi
        import cv2
        import numpy
        import PIL
    except ImportError as e:
        print(f"❌ Missing required dependency: {e}")
        print("Please install requirements with: pip install -r requirements.txt")
        sys.exit(1)
    
    # Check if barcode_image.py exists
    if not os.path.exists("barcode_image.py"):
        print("❌ barcode_image.py not found in current directory")
        sys.exit(1)
    
    print("Starting Barcode Detection API Server...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,  # Auto-reload on code changes
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

