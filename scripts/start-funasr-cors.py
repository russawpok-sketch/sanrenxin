"""
FunASR 服务器启动脚本（支持 CORS）
"""
import sys
import subprocess

def main():
    print("=" * 50)
    print("FunASR 语音识别服务器（CORS 支持）")
    print("=" * 50)
    
    # 启动 FunASR 服务器，添加 CORS 支持
    cmd = [
        sys.executable, "-m", "funasr.bin.server",
        "--host", "0.0.0.0",
        "--port", "10095",
        "--model", "sensevoice",
        "--allow-origins", "*"  # 允许所有来源（开发环境）
    ]
    
    print(f"启动命令: {' '.join(cmd)}")
    print("=" * 50)
    
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except Exception as e:
        print(f"错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
