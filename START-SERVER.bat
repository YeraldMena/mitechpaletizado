@echo off
title MI-TECH Paletizado - Server
color 0A

echo.
echo  ==========================================
echo   MI-TECH Paletizado - Iniciando sistema
echo  ==========================================
echo.

:: Verificar MySQL
net start MySQL84 2>nul
echo  [OK] MySQL verificado
echo.

:: Abrir dashboard en el navegador automaticamente
echo  Abriendo dashboard en el navegador...
start "" http://localhost:3009/index.html

:: Iniciar servidor
cd /d "%~dp0backend"
echo  API iniciada en http://localhost:3009
echo  Base de datos: MySQL (paletizado_db)
echo.
echo  Presiona Ctrl+C para detener
echo  ==========================================
echo.
node server.js

pause
