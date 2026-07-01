@echo off
:: Enable UTF-8 encoding for console output
chcp 65001 >nul

set "TARGET_DIR=%LOCALAPPDATA%\AlgoVision-Extension"
echo ======================================================
echo    Installing AlgoVision LeetCode Bridge Extension...
echo ======================================================
echo.

:: Create target directory if it doesn't exist
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: Copy extension files (excluding this install batch script)
echo Copying extension files to %TARGET_DIR%...
xcopy /E /Y /I "%~dp0*" "%TARGET_DIR%" >nul
del "%TARGET_DIR%\install.bat" >nul 2>&1

:: Register extension in Chrome Registry
echo Registering extension in Google Chrome registry...
reg add "HKCU\Software\Google\Chrome\Extensions\hgabpjkbbnheeonceoplchffpiiofkbn" /v "path" /t REG_SZ /d "%TARGET_DIR%" /f >nul

if %errorlevel% neq 0 (
    echo [ERROR] Failed to write to Windows Registry. Please run this script as Administrator if it persists.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo    SUCCESS: AlgoVision Extension registered!
echo.
echo    1. Restart Google Chrome if it's currently open.
echo    2. Chrome will prompt you: "New extension added" 
echo       with a button to "Enable extension".
echo ======================================================
echo.
pause
