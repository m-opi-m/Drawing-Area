@echo off
cd /d %~dp0
call npm install
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
npm start
pause
