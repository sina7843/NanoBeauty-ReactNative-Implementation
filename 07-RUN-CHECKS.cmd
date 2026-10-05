@echo off
setlocal
cd /d "%~dp0"
echo Installing from package-lock.json and running all checks (typecheck, lint, tests, Expo config)...
call npm ci
if errorlevel 1 goto :fail
call npm run check
if errorlevel 1 goto :fail
echo.
echo All checks passed.
pause
exit /b 0
:fail
echo.
echo Checks failed. Read the output above.
pause
exit /b 1
