# Todo

## 当前任务：集成 FunASR 语音识别

- [x] 创建 FunASR 服务器部署脚本
- [x] 创建 FunASRRecognizer.ts
- [x] 修改前端代码调用 FunASR API
- [x] 测试构建
- [ ] 安装 FunASR 依赖（需要手动运行脚本）
- [ ] 启动 FunASR 服务器（需要手动运行脚本）
- [ ] 测试语音识别功能
- [ ] 更新文档
- [x] Git 提交

## 技术方案

### 后端（FunASR 服务器）
- 使用 `funasr-server` 命令启动 OpenAI 兼容 API
- 端口：8000
- 模型：SenseVoiceSmall（支持中文）
- 启动脚本：`scripts/start-funasr.bat`

### 前端（游戏客户端）
- 录制音频（1.5秒片段）→ 发送到 FunASR API
- 接收识别结果 → 映射到动物类型
- 关键词映射：
  - 公鸡：鸡、公鸡、咯咯、喔喔
  - 猴子：猴、猴子、吱吱
  - 狗：狗、汪汪、汪
  - 鸭子：鸭、鸭子、嘎嘎、嘎

### 备用方案
- 自动回退：FunASR 不可用时自动使用浏览器识别
- 保留键盘控制（1/2/3/4）
- 保留触摸按钮控制

## 已完成的修改

### 新增文件
1. `src/audio/FunASRRecognizer.ts` - FunASR 识别器
2. `scripts/start-funasr.bat` - FunASR 服务器启动脚本
3. `docs/todo.md` - 任务清单

### 修改文件
1. `src/main.ts` - 集成 FunASR，优先使用 FunASR，失败时回退到浏览器识别

## 使用说明

### 启动 FunASR 服务器
```bash
# Windows
scripts\start-funasr.bat

# 或手动启动
pip install funasr fastapi uvicorn python-multipart
funasr-server --model sensevoice --device cpu --port 8000
```

### 启动游戏
```bash
npm run dev
```

### 测试流程
1. 启动 FunASR 服务器（首次会下载模型 ~234MB）
2. 启动游戏开发服务器
3. 打开浏览器访问 http://localhost:3000
4. 点击麦克风按钮
5. 说出动物名称测试识别
