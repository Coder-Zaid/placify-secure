@echo off
title Proctor-Secure Launcher
echo ========================================================
echo Launching Proctor-Secure (Backend + Frontend)
echo ========================================================

start "Proctor-Secure Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "Proctor-Secure Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo Both services launched in separate windows!
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:5173
echo.
pause
