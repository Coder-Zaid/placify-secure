@echo off
title Proctor-Secure Frontend (Port 5173)
echo ========================================================
echo Starting Proctor-Secure Vite Frontend...
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause
