@echo off
title Proctor-Secure Backend (Port 8001)
echo ========================================================
echo Starting Proctor-Secure FastAPI Backend on port 8001...
echo ========================================================
cd /d "%~dp0backend\app"
python main.py
pause
