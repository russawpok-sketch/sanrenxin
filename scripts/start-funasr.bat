@echo off
chcp 65001 >nul
echo ========================================
echo FunASR 语音识别服务器启动脚本
echo ========================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] 检查 FunASR 是否已安装...
pip show funasr >nul 2>&1
if errorlevel 1 (
    echo [安装] 正在安装 FunASR...
    pip install funasr fastapi uvicorn python-multipart
    if errorlevel 1 (
        echo [错误] FunASR 安装失败
        pause
        exit /b 1
    )
) else (
    echo [✓] FunASR 已安装
)

echo.
echo [2/3] 启动 FunASR 服务器...
echo 模型: SenseVoiceSmall (中文优化)
echo 端口: 10095
echo API: http://localhost:10095/v1/audio/transcriptions
echo.
echo 提示: 首次运行会自动下载模型文件 (~234MB)
echo       下载完成后服务器会自动启动
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 启动 FunASR 服务器 - 使用 python -m 方式调用
python -m funasr.bin.funasr_server --host 0.0.0.0 --port 10095 --model-dir damo/SenseVoiceSmall

pause
