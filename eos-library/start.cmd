@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js LTS truoc khi mo Studyroom.
  echo https://nodejs.org/
  pause
  exit /b 1
)
start "" http://127.0.0.1:4178
node "%~dp0server.cjs"
pause
