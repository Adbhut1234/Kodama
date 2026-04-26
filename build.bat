@echo off
echo ============================================
echo   Building Adi's AI Assistant Desktop App
echo ============================================
echo.

:: Install build dependencies
echo [1/3] Installing dependencies...
pip install pyinstaller customtkinter
echo.

:: Build the exe
echo [2/3] Building executable...
pyinstaller --noconfirm --onefile --windowed ^
    --name "AdiAIAssistant" ^
    --collect-all customtkinter ^
    --hidden-import ollama ^
    --hidden-import ddgs ^
    --hidden-import pptx ^
    --hidden-import fpdf ^
    desktop_app.py
echo.

:: Done
echo [3/3] Build complete!
echo.
echo ============================================
echo   Your .exe is in the 'dist' folder:
echo   dist\AdiAIAssistant.exe
echo ============================================
echo.
echo IMPORTANT: The user must have Ollama installed
echo and running (ollama serve) for the app to work.
echo.
pause
