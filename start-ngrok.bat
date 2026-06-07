@echo off
echo ===================================================
echo   Starting ngrok tunnel for FloraMentor...
echo   Exposing http://127.0.0.1:5173
echo   Access via: https://species-undone-thrive.ngrok-free.dev
echo ===================================================
ngrok start --all --config "%USERPROFILE%\AppData\Local\ngrok\ngrok.yml" --config "%~dp0ngrok.yml"
