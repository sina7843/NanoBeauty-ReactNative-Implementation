@echo off
setlocal
cd /d "%~dp0"
rem Starts the API on http://localhost:4000. Without DATABASE_URL it uses in-memory PGlite (no Docker needed).
call npm run api:dev
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" pause
exit /b %EXITCODE%
