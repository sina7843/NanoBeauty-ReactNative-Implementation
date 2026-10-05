@echo off
setlocal
cd /d "%~dp0"
rem Starts Metro. Open the app in a development build (docs\eas-builds.md); see docs\development.md.
call npm run mobile:start
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" pause
exit /b %EXITCODE%
