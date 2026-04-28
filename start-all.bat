@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo [INFO] 正在清理已运行的前后端进程...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1
timeout /t 2 /nobreak >nul

echo [INFO] 启动后端服务...
start "" cmd /c "cd /d D:\Desktop\WorkSpace\github projects\real\real-time-study\study-com-platform-be && npm run dev"

echo [INFO] 启动前端服务...
start "" cmd /c "cd /d D:\Desktop\WorkSpace\github projects\real\real-time-study\study-com-platform-fe && npm run dev"

echo.
echo [DONE] 启动完成！
echo   ▶ 前端: http://localhost:5173
echo   ▶ 后端: http://localhost:3000/api
echo.
echo 按任意键关闭此窗口...
pause >nul
