@echo off
cd /d "%~dp0"
call npm run journal -- --open
if errorlevel 1 pause
