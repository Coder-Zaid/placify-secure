# Proctor-Secure (Standalone)

Standalone Secure Assessment and Anti-Cheating Proctoring Platform with dedicated Chrome Browser Extension.

---

## Project Structure

```
Proctor-Secure/
├── backend/                  # FastAPI Backend API Server
│   ├── app/
│   │   ├── main.py           # Server entry point (Port 8001)
│   │   ├── database.py       # SQLite database configuration
│   │   ├── models.py         # SQLAlchemy models (assessments, attempts, violations)
│   │   └── routes/
│   │       └── assessment.py # Assessment management and test taking APIs
│   ├── placify_secure.db     # SQLite assessment database
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React 19 + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── components/assessment/
│   │   │   ├── AssessmentDashboard.jsx # Assessment list & control panel
│   │   │   ├── AssessmentBuilder.jsx   # Create & customize tests
│   │   │   ├── AssessmentAnalytics.jsx # Student attempts & security flag reports
│   │   │   └── StudentPortal.jsx       # Proctored student exam interface
│   │   ├── hooks/
│   │   │   └── useSecureExam.js        # Real-time integrity monitoring & extension hooks
│   │   └── main.jsx                    # Route configuration
│   └── package.json
│
├── extension/                # Chrome Manifest V3 Proctoring Extension
│   ├── manifest.json         # Extension manifest
│   ├── background.js         # Tab tracking & security enforcement worker
│   ├── content.js            # In-page communication & dual handshake support
│   ├── popup.html / .js      # Assessment status HUD popup
│   └── icons/                # Extension icons
│
├── start-all.bat             # 1-Click launcher for both backend & frontend
├── start-backend.bat         # Launch FastAPI backend only
└── start-frontend.bat        # Launch Vite frontend only
```

---

## Quick Start (Running Locally)

### Option 1: One-Click Launch
Double-click `start-all.bat` to launch both Backend and Frontend in separate windows.

### Option 2: Manual Terminal Launch

#### 1. Start Backend:
```bash
cd backend/app
python main.py
```
- **Backend URL:** http://localhost:8001
- **API Documentation (Swagger):** http://localhost:8001/docs
- **Health Check:** http://localhost:8001/health

#### 2. Start Frontend:
```bash
cd frontend
npm run dev
```
- **Frontend App:** http://localhost:5173 (or http://localhost:5174)

---

## Loading the Chrome Extension

1. Open Google Chrome (or any Chromium browser like Edge/Brave).
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the `Proctor-Secure/extension` folder.
6. The **Placify Secure Assessment Monitor** will be active and ready.

---

## Standalone & Future Integration

- This platform runs **100% independently** with its own backend, frontend, database, and extension.
- The extension contains dual-handshake listeners (`data-placify-extension-installed` and `data-placify-secure`) allowing seamless linkage back to Placify Main whenever you're ready.
