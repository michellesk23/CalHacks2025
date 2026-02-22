# SNAP Scanner — CalHacks 2025

A mobile app that lets you scan a product barcode and instantly see whether it's eligible for SNAP (food stamps) in Idaho. Built at CalHacks 2025.

> **Note for the team:** This is the hackathon prototype. The next version will be a full website supporting 3 states — this repo is a good reference for the backend eligibility logic and barcode lookup approach.

---

## What the app does

1. You open the app on your phone
2. Tap **"Scan with Camera"** and point it at a product barcode
3. The app tells you if that product is SNAP-eligible or not, and suggests alternatives if it isn't

---

## What you need before starting

- A Mac or PC with [Node.js](https://nodejs.org/) installed (version 18 or higher)
- [Python 3](https://www.python.org/downloads/) installed
- The **Expo Go** app on your phone — download it free from the App Store (iPhone) or Google Play (Android)
- Your phone and laptop must be on the **same WiFi network**

---

## Setup (do this once)

### 1. Clone the repo

```bash
git clone https://github.com/michellesk23/CalHacks2025.git
cd CalHacks2025
```

### 2. Install JavaScript dependencies

```bash
npm install
```

### 3. Install Python dependencies

```bash
pip3 install -r requirements.txt
```

If that fails on a Mac, try:

```bash
pip3 install -r requirements.txt --break-system-packages
```

---

## Running the app

You need two terminals open at the same time — one for the backend, one for the frontend.

### Terminal 1 — Start the backend (Python server)

```bash
python3 start_server.py
```

You should see:
```
🚀 Starting Barcode Detection API Server...
📡 Server will be available at: http://localhost:8000
```

Leave this running. If you see `Address already in use`, the server is already running — skip this step.

### Terminal 2 — Start the frontend (Expo)

```bash
npx expo start
```

A QR code will appear in the terminal.

- **iPhone**: Open the Camera app, point it at the QR code, tap the notification banner
- **Android**: Open the Expo Go app, tap "Scan QR code"

The app will load on your phone in about 30 seconds.

---

## IMPORTANT: Update the IP address before running

The app needs to know your laptop's IP address to talk to the backend. **Every person on the team has a different IP, and it can change when you switch WiFi networks.**

### Step 1 — Find your laptop's IP address

On Mac, run this in a terminal:
```bash
ipconfig getifaddr en0
```

You'll get something like `10.43.201.56`.

### Step 2 — Update App.js

Open `App.js` and go to **line 27**. Change the IP to yours:

```javascript
// Line 27 in App.js
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://YOUR_IP_HERE:8000';
```

For example, if your IP is `10.43.201.56`:

```javascript
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://10.43.201.56:8000';
```

### Step 3 — Reload the app

In the Expo terminal, press **`r`** to reload the app on your phone.

> **You need to do this every time you switch WiFi networks or use a different laptop.**

---

## Troubleshooting

**"API call failed / Server offline"** — The IP address is wrong or the Python backend isn't running. Double-check steps in the IP section above and make sure `python3 start_server.py` is running in a separate terminal.

**"Address already in use" when starting the backend** — The server is already running from a previous session. You don't need to start it again.

**App loads but camera doesn't open** — Make sure you granted camera permission to Expo Go when prompted. If you denied it, go to your phone's Settings → Expo Go → Camera, and enable it.

**QR code doesn't scan on iPhone** — Try opening the Expo Go app directly and entering the URL manually. The URL shows up in the Expo terminal as `exp://YOUR_IP:8081`.

**`npx expo start` errors about TypeScript** — Run this once to fix it:
```bash
npx expo install typescript @types/react
```

---

## Project structure

```
CalHacks2025/
├── App.js              # Main mobile app (React Native / Expo)
├── main.py             # Backend API (FastAPI)
├── start_server.py     # Script to start the backend
├── eligibility/        # SNAP eligibility logic per state
├── scripts/            # Barcode lookup scripts (Open Food Facts + FDC)
├── mobile/             # Experimental data layer (not currently used in app)
└── requirements.txt    # Python dependencies
```

---

## Branches

- `main` — latest working version, use this
- `feature/databasequery` — database/barcode lookup experiments

When in doubt, use `main`.

---

## For the next version (website rebuild)

The key reusable pieces from this prototype:
- `eligibility/` — contains the SNAP eligibility rules logic, can be adapted for multiple states
- `scripts/check_with_python.js` — barcode lookup that tries USDA FoodData Central first, then Open Food Facts as fallback
- `main.py` — the FastAPI backend structure

The FDC API key is stored in `scripts/check_with_python.js`. You'll want to move it to an environment variable (`.env` file) before going public.
