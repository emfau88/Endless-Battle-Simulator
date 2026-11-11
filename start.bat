@echo off
rem Endless Battle Simulator - Start per Doppelklick: Server starten und Oberflaeche im Browser oeffnen.
rem Variablen: PORT (Standard 8080), EBS_NO_BROWSER=1 (Browser nicht oeffnen)
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Endless Battle Simulator
if not defined PORT set PORT=8080

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js wurde nicht gefunden.
  echo  Bitte Node.js 18 oder neuer von https://nodejs.org installieren und diese Datei erneut starten.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\playwright" (
  echo  Erster Start: installiere Abhaengigkeiten ^(npm install^) ...
  call npm install
  if errorlevel 1 (
    echo.
    echo  npm install ist fehlgeschlagen. Bitte die Meldung oben pruefen.
    pause
    exit /b 1
  )
)
if not exist "vendor\pixi.min.js" call npm run vendor

set HAVE_FFMPEG=1
where ffmpeg >nul 2>nul
if errorlevel 1 if not defined FFMPEG_PATH set HAVE_FFMPEG=0
if "%HAVE_FFMPEG%"=="0" (
  echo.
  echo  Hinweis: FFmpeg wurde nicht gefunden. Die Vorschau funktioniert, der Videoexport nicht.
  echo  FFmpeg installieren und in den PATH aufnehmen oder FFMPEG_PATH und FFPROBE_PATH setzen.
  echo.
)

echo.
echo  Endless Battle Simulator laeuft auf http://localhost:%PORT%
echo  Dieses Fenster offen lassen. Beenden: Fenster schliessen oder Strg+C.
echo.
if not "%EBS_NO_BROWSER%"=="1" start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"

node server.mjs
if errorlevel 1 (
  echo.
  echo  Der Server wurde mit einem Fehler beendet. Laeuft er vielleicht schon in einem anderen Fenster?
  echo  Dann ist die Oberflaeche bereits unter http://localhost:%PORT% erreichbar.
  pause
)
endlocal
