@echo off
chcp 65001 > nul
title EBT トラッカー オフライン起動
echo ===================================================
echo   EBT トラッカーをオフライン起動しています...
echo ===================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
