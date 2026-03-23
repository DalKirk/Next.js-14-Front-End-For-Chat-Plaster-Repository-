@echo off
REM Compress banner preview videos to ~280x220 resolution with high compression.
REM Requires FFmpeg: https://ffmpeg.org/download.html  (winget install ffmpeg)
REM Run from the project root:  compress-banner-videos.bat

setlocal enabledelayedexpansion
set SRC=public\previews
set OUT=public\previews\compressed

if not exist "%OUT%" mkdir "%OUT%"

for %%f in ("%SRC%\*.mp4") do (
    echo Compressing %%~nxf ...
    ffmpeg -y -i "%%f" -vf "scale=560:440:force_original_aspect_ratio=decrease" -c:v libx264 -preset slow -crf 28 -an -movflags +faststart "%OUT%\%%~nxf"
)

echo.
echo Done! Compressed files are in %OUT%.
echo Review them, then copy back:
echo   xcopy /Y "%OUT%\*" "%SRC%\"
pause
