# Barcode Detection API

A FastAPI backend service that provides barcode detection and decoding capabilities using OpenCV.

## Features

- 🔍 **Barcode Detection**: Detect and decode various barcode formats
- 📱 **Multiple Input Methods**: Support for file uploads and base64 encoded images
- 🌐 **CORS Enabled**: Ready for frontend integration
- 📊 **JSON API**: Clean REST API with detailed responses
- 🖼️ **Image Annotations**: Returns annotated images with detected barcodes highlighted

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Server

```bash
python start_server.py
```

Or manually:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Access the API

- **API Base URL**: http://localhost:8000
- **Interactive Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

### Detect Barcode (File Upload)

```http
POST /detect-barcode
Content-Type: multipart/form-data
```

**Request:**
- `file`: Image file (JPEG, PNG, etc.)

**Response:**
```json
{
  "success": true,
  "barcode_text": "1234567890123",
  "filename": "product.jpg",
  "file_size": 245760,
  "corners": [[100, 50], [200, 50], [200, 100], [100, 100]],
  "annotated_image": "base64_encoded_image_string"
}
```

### Detect Barcode (Base64)

```http
POST /detect-barcode-base64
Content-Type: application/json
```

**Request:**
```json
{
  "image": "base64_encoded_image_string"
}
```

**Response:**
```json
{
  "success": true,
  "barcode_text": "1234567890123",
  "corners": [[100, 50], [200, 50], [200, 100], [100, 100]]
}
```

## Frontend Integration

### HTML/JavaScript Example

```javascript
// File upload method
async function detectBarcode(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:8000/detect-barcode', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  return result;
}

// Base64 method
async function detectBarcodeBase64(imageBase64) {
  const response = await fetch('http://localhost:8000/detect-barcode-base64', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: imageBase64 })
  });
  
  const result = await response.json();
  return result;
}
```

### React/TypeScript Example

```typescript
interface BarcodeResult {
  success: boolean;
  barcode_text: string | null;
  corners?: number[][];
  filename?: string;
  file_size?: number;
  annotated_image?: string;
}

const detectBarcode = async (file: File): Promise<BarcodeResult> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:8000/detect-barcode', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to detect barcode');
  }
  
  return response.json();
};
```

## Mobile App Integration

For React Native or mobile apps, you can:

1. **Camera Integration**: Capture images and send as base64
2. **File Picker**: Allow users to select images from gallery
3. **Real-time Processing**: Process camera frames in real-time

### React Native Example

```javascript
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const processImage = async (imageUri) => {
  // Convert image to base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // Send to API
  const response = await fetch('http://YOUR_SERVER_IP:8000/detect-barcode-base64', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: base64 })
  });
  
  return response.json();
};
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid file type, missing data)
- `500`: Internal Server Error

**Error Response Example:**
```json
{
  "detail": "File must be an image"
}
```

## Supported Barcode Formats

The API uses OpenCV's barcode detector which supports:
- UPC-A, UPC-E
- EAN-13, EAN-8
- Code 128
- Code 39
- QR Codes
- And more...

## Configuration

### CORS Settings

In `main.py`, you can configure CORS origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],  # Specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Server Configuration

Modify `start_server.py` to change:
- Port number
- Host address
- Auto-reload settings

## Testing

### Using curl

```bash
# Test file upload
curl -X POST "http://localhost:8000/detect-barcode" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@your_image.jpg"

# Test base64
curl -X POST "http://localhost:8000/detect-barcode-base64" \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_string"}'
```

### Using the Frontend Example

1. Open `frontend_example.html` in your browser
2. Upload an image or use the camera
3. Click "Detect Barcode" to test the API

## Production Deployment

### Using Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

```bash
export API_HOST=0.0.0.0
export API_PORT=8000
export CORS_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
```

## Troubleshooting

### Common Issues

1. **"Cannot load image"**: Check file format and size
2. **CORS errors**: Verify CORS settings in `main.py`
3. **Camera not working**: Ensure HTTPS in production
4. **Slow processing**: Consider image resizing before upload

### Performance Tips

- Resize large images before sending to API
- Use base64 for small images, file upload for larger ones
- Implement client-side image compression
- Consider caching for repeated requests

## License

This project is part of the CalHacks 2025 submission.
