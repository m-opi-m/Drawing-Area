@echo off
cd /d %~dp0
start "" cmd /c "timeout /t 12 >nul & start http://localhost:3000"
npx wrangler@4 dev --port 3000
pause
