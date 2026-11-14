@echo off
REM One-click: open the firewall so you can open the AMS app on your phone.
REM Right-click this file -> "Run as administrator".
setlocal
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting administrator privileges...
  powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\share-lan.ps1"
pause
