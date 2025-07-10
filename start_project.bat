@echo off
cd /d %~dp0
powershell -Command "Start-Process node -ArgumentList 'index.js' -Verb RunAs"
