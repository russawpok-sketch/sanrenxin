@echo off
chcp 65001 >nul
echo ========================================
echo FunASR 语音识别服务器启动脚本
echo ========================================
echo.

echo [1/2] 检查依赖...
pip show torch >nul 2>&1
if errorlevel 1 (
    echo [安装] 正在安装 PyTorch...
    pip install torch torchvision torchaudio
)

pip show funasr >nul 2>&1
if errorlevel 1 (
    echo [安装] 正在安装 FunASR...
    pip install funasr fastapi uvicorn python-multipart
)

echo [✓] 依赖已就绪
echo.
echo [2/2] 启动 FunASR 服务器...
echo 模型: SenseVoiceSmall
echo 端口: 10095
echo API: http://localhost:10095/v1/audio/transcriptions
echo.
echo 提示: 首次运行会下载模型 (~234MB)
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

python -m funasr.bin.server --host 0.0.0.0 --port 10095 --model sensevoice

pause
