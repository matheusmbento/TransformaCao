@echo off
title Iniciando Espaco Pet TransformaCao...
echo ========================================================
echo   🐾 INICIANDO SISTEMA ESPACO PET TRANSFORMACAO 🐾
echo ========================================================
echo.
echo [1/2] Iniciando servidor de banco de dados SQLite...
start /min cmd /c "node server.js"

echo [2/2] Aguardando o banco inicializar...
timeout /t 2 /nobreak >nul

echo [OK] Abrindo o painel no seu navegador...
start http://localhost:3000

echo.
echo ========================================================
echo   PRONTO! O sistema ja deve ter aberto no navegador.
echo   Mantenha esta janelinha aberta enquanto estiver usando.
echo ========================================================
echo.
pause
