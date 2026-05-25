# FunASR 语音识别集成说明

## 概述

本项目已集成 FunASR 工业级语音识别引擎，用于提升游戏中动物声音识别的准确度和速度。

## FunASR 优势

- **速度快**：比 Whisper 快 170 倍（GPU）、17 倍（CPU）
- **准确度高**：工业级模型，专门优化中文识别
- **完全离线**：不需要网络，保护隐私
- **MIT 许可**：开源免费，可商用

## 架构设计

```
游戏前端 (浏览器)
    ↓ 录制音频 (1.5秒片段)
    ↓ HTTP POST
FunASR 服务器 (localhost:8000)
    ↓ 语音识别
    ↓ 返回文本
游戏前端
    ↓ 关键词匹配
    ↓ 动物变身
```

## 安装步骤

### 1. 安装 Python

确保已安装 Python 3.8+：

```bash
python --version
```

如果未安装，请访问：https://www.python.org/downloads/

### 2. 启动 FunASR 服务器

**方式一：使用启动脚本（推荐）**

```bash
# Windows
scripts\start-funasr.bat
```

**方式二：手动启动**

```bash
# 安装依赖
pip install funasr fastapi uvicorn python-multipart

# 启动服务器
funasr-server --model sensevoice --device cpu --port 8000
```

**首次运行**：
- 会自动下载模型文件（约 234MB）
- 下载完成后服务器会自动启动
- 服务器地址：http://localhost:8000

### 3. 启动游戏

```bash
npm run dev
```

访问：http://localhost:3000

## 使用说明

### 游戏中使用

1. 点击游戏中的麦克风按钮
2. 系统会自动尝试连接 FunASR 服务器
3. 如果 FunASR 可用，会显示"🎤 FunASR 识别已启动"
4. 如果 FunASR 不可用，会自动回退到浏览器识别

### 识别关键词

说出以下任意关键词即可触发对应动物变身：

| 动物 | 关键词 |
|------|--------|
| 公鸡 | 鸡、公鸡、咯咯、喔喔、rooster、cock |
| 猴子 | 猴、猴子、吱吱、猴儿、monkey |
| 狗 | 狗、汪汪、汪、狗狗、dog、woof |
| 鸭子 | 鸭、鸭子、嘎嘎、嘎、鸭鸭、duck、quack |

### 备用控制方式

如果语音识别不可用，可以使用：

- **键盘**：1（公鸡）、2（猴子）、3（狗）、4（鸭子）
- **触摸按钮**：点击屏幕下方的动物按钮

## 技术实现

### 前端识别器

文件：`src/audio/FunASRRecognizer.ts`

核心流程：
1. 录制 1.5 秒音频片段
2. 转换为 Blob 格式
3. 通过 FormData 发送到 FunASR API
4. 接收识别文本
5. 匹配关键词
6. 触发动物变身

### API 接口

**端点**：`POST http://localhost:8000/v1/audio/transcriptions`

**请求**：
```
Content-Type: multipart/form-data

file: audio.webm (音频文件)
model: sensevoice
response_format: json
```

**响应**：
```json
{
  "text": "鸭子",
  "duration": 1.5,
  "language": "zh"
}
```

### 自动回退机制

```typescript
// 优先尝试 FunASR
try {
  await funasrRecognizer.start(...);
} catch (funasrError) {
  // FunASR 失败，回退到浏览器识别
  await micRecognizer.start(...);
}
```

## 性能优化

### 识别间隔控制

- 最小识别间隔：800ms
- 避免频繁请求导致卡顿

### 录音时长

- 固定 1.5 秒片段
- 平衡识别准确度和响应速度

### 关键词匹配

- 大小写不敏感
- 去除标点符号
- 支持中英文关键词

## 故障排查

### FunASR 服务器无法启动

**问题**：提示"FunASR 服务器未启动"

**解决**：
1. 检查 Python 是否安装
2. 检查 8000 端口是否被占用
3. 手动运行 `scripts\start-funasr.bat`
4. 查看控制台错误信息

### 识别不准确

**问题**：说话后没有反应或识别错误

**解决**：
1. 确保麦克风权限已授予
2. 说话声音要清晰、响亮
3. 直接说动物名称（如"狗"、"鸭子"）
4. 检查 FunASR 服务器日志

### 延迟较高

**问题**：识别响应慢

**解决**：
1. 使用 GPU 加速：`--device cuda`（需要 NVIDIA 显卡）
2. 减少录音时长（修改代码中的 1500ms）
3. 检查网络连接（虽然是本地，但仍需 HTTP 通信）

## 开发调试

### 查看识别日志

打开浏览器控制台（F12），查看：
- `[FunASR]` 开头的日志
- 识别结果和匹配情况

### 测试 API

使用 curl 测试 FunASR 服务器：

```bash
# 下载测试音频
curl -L https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ASR/test_audio/BAC009S0764W0121.wav -o sample.wav

# 测试识别
curl http://localhost:8000/v1/audio/transcriptions \
  -F file=@sample.wav \
  -F model=sensevoice \
  -F response_format=json
```

## 未来优化方向

1. **GPU 加速**：支持 CUDA 加速，进一步提升速度
2. **流式识别**：实时识别，无需等待录音结束
3. **自定义模型**：训练专门识别动物叫声的模型
4. **情感识别**：识别玩家说话的情绪（开心/愤怒等）
5. **多人识别**：区分不同玩家的声音

## 参考资料

- FunASR GitHub：https://github.com/modelscope/FunASR
- FunASR 文档：https://modelscope.github.io/FunASR/
- 项目 PRD：`docs/PRD-牲畜体验器.md`
- 开发分工：`docs/开发分工-A线-声音AI.md`

## 版本历史

### v1.0.0 (2026-05-24)
- ✅ 集成 FunASR 语音识别
- ✅ 支持中文关键词识别
- ✅ 自动回退到浏览器识别
- ✅ 优化识别间隔和性能
