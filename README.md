# 牲畜体验器

基于「声音识别 + 动物变身 + 跑酷闯关」的 Web Demo。

## ✨ 新功能：FunASR 语音识别

现已集成 FunASR 工业级语音识别引擎：
- 🚀 比 Whisper 快 170 倍
- 🎯 识别准确度更高
- 🔒 完全离线，保护隐私
- 🆓 开源免费，MIT 许可

详见：[FunASR 集成说明](docs/FunASR集成说明.md)

## 在线体验

https://russawpok-sketch.github.io/cursor/

> **首次访问 404？** 到仓库 [Settings → Pages](https://github.com/russawpok-sketch/cursor/settings/pages)，**Source** 选 **GitHub Actions**，等 1~2 分钟部署完成。

## 快速开始

### 方式一：使用 FunASR（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 启动 FunASR 服务器
scripts\start-funasr.bat

# 3. 启动游戏
npm run dev
```

### 方式二：仅浏览器识别

```bash
npm install
npm run dev          # 本机 http://localhost:5173/
npm run dev:host     # 局域网访问，手机同 WiFi 可测
```

### 玩法

1. 点击开始，允许麦克风
2. 看到障碍提示后，对着麦叫或按键盘变身：

| 按键 | 动物 | 技能 | 语音关键词 |
|------|------|------|------------|
| `1` | 公鸡 | 啄墙 | 鸡、公鸡、咯咯 |
| `2` | 猴子 | 爬树 | 猴、猴子、吱吱 |
| `3` | 狗 | 跳坑 | 狗、汪汪 |
| `4` | 鸭子 | 游泳 | 鸭、鸭子、嘎嘎 |

3. 失败按 `R` 重开

## 部署

推送到 `master` 后，GitHub Actions 自动部署到 GitHub Pages：

```bash
npm run build:pages   # 本地验证 Pages 构建
```

## 双人 Git 协作

| 目录 | 负责人 | 职责 |
|------|--------|------|
| `src/audio/` | A 线 | 麦克风、识别、吐槽 |
| `src/game/` | B 线 | 跑酷、技能、关卡、UI |
| `shared/` | 共同 | 类型与事件总线 |

## 文档

- [PRD](docs/PRD-牲畜体验器.md)
- [FunASR 集成说明](docs/FunASR集成说明.md)
- [A 线任务](docs/开发分工-A线-声音AI.md)
- [B 线任务](docs/开发分工-B线-游戏玩法.md)
- [共同接口](docs/开发分工-共同接口.md)
- [Agent 工作规范](AGENTS.md)

## 技术栈

- Vite + TypeScript
- FunASR（语音识别）
- Canvas 2D（游戏渲染）
- Web Audio API（音频处理）

## License

MIT
