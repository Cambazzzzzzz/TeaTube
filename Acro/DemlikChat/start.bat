@echo off
echo ========================================
echo    DemlikChat Baslangic
echo ========================================
echo.
echo Sunucu baslatiliyor...
echo.
start cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo Electron uygulamasi baslatiliyor...
echo.
npm start
