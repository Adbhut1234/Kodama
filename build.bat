@echo off
echo ============================================
echo   KODAMA AI — Production Build Script
echo ============================================
echo.

set VENV_PYTHON=llm-env\Scripts\python.exe

:: 1. Install Build Dependencies
echo [1/4] Synchronizing build environment...
"%VENV_PYTHON%" -m pip install pyinstaller ollama duckduckgo_search python-pptx reportlab
echo.

:: 2. Build Python API Bridge
echo [2/4] Synthesizing Neural Bridge (api_bridge.exe)...
"%VENV_PYTHON%" -m PyInstaller --noconfirm --onefile --windowed ^
    --name "api_bridge" ^
    --hidden-import ollama ^
    --hidden-import ddgs ^
    --hidden-import pptx ^
    --hidden-import reportlab ^
    api_bridge.py
echo.

:: 3. Build Electron Application
echo [3/4] Packaging Electron Interface...
call npm run build
echo.

:: 4. Finalize
echo [4/4] Synthesis complete!
echo.
echo ============================================
echo   Your installer is in the 'release' folder.
echo   Neural Bridge is embedded in the binary.
echo ============================================
echo.
pause
