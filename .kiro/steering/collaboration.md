---
inclusion: always
---

# 牲畜体验器 — 协作规则

## 分工边界

- **A 线（Lead A）** 只改 `src/audio/`，负责麦克风、识别、吐槽文案、调用 `emitTransform`
- **B 线（Lead B）** 只改 `src/game/`，负责跑酷、技能、关卡、UI 展示、订阅 `onTransform`
- **共同维护** `shared/types.ts`、`shared/events.ts`、`src/main.ts`（改前先沟通）

## 接口约定

- 变身事件类型：`TransformEvent`（见 `shared/types.ts`）
- A 线发布：`emitTransform(event)`
- B 线订阅：`onTransform(callback)`
- 动物 ID 固定：`'rooster' | 'monkey' | 'dog' | 'duck'`

## 开发顺序

1. Day 1：mock 联调（键盘 1/2/3/4）必须通过后再各自深入
2. Day 2~3：A 线做识别，B 线做技能与关卡
3. Day 3：真实麦克风联调

## 代码规范

- TypeScript strict，不用 any
- 新文件放对应目录，不跨线改文件
- 参考文档：`docs/PRD-牲畜体验器.md`、`docs/开发分工-*.md`
