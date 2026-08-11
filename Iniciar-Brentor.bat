@echo off
title Brentor.ai - Servidor
cd /d "%~dp0"
echo Iniciando o Brentor.ai em http://localhost:4173 ...
start "" http://localhost:4173
node server.js
pause
