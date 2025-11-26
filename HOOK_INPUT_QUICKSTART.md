# 钩子密码输入功能 - 快速开始

## 🎯 核心功能

为 `beforeStop` 和 `afterStop` 钩子命令添加了**交互式输入支持**，现在可以在钩子执行时输入密码或响应提示。

## 🚦 状态指示

### 正常运行时
```
🟢 (绿色闪烁) → 进程正在运行
终端输入 → 发送到主进程
```

### 钩子执行时
```
🟡 (黄色闪烁) → 钩子正在执行
📛 标签: [beforeStop] Running... 或 [afterStop] Running...
终端输入 → 发送到钩子进程 (可以输入密码)
```

## 📝 快速测试

### 测试 1: 简单输入测试
```
Command: echo
Args: "test"
beforeStop: bash -c 'read -p "输入你的名字: " name && echo "你好, $name!"'
```

**步骤：**
1. 启动进程
2. 点击 "Stop" 按钮
3. 在终端看到 "输入你的名字: " 提示
4. 输入名字并按 Enter
5. 看到 "你好, [你的名字]!" 输出
6. 进程停止

### 测试 2: Sudo 密码测试
```
Command: sleep
Args: 1000
beforeStop: sudo echo "测试 sudo 访问"
```

**步骤：**
1. 启动进程
2. 点击 "Stop" 按钮
3. 看到黄色指示灯和 [beforeStop] Running... 标签
4. 在终端看到 "Password:" 提示
5. 输入你的系统密码（不会显示）
6. 按 Enter
7. 看到 "测试 sudo 访问" 输出
8. 进程停止

### 测试 3: 使用测试脚本
```
Command: sleep
Args: 5
beforeStop: ./test-hook-password.sh
```

这个脚本会测试多种输入场景。

## 🎨 UI 变化说明

### Before (钩子未执行)
```
┌────────────────────────────────────────┐
│ 🟢 node server.js                      │
│    PID: 12345 • running • Uptime: 5m   │
│    beforeStop: sudo cleanup.sh         │
│    [Stop] [Restart] [Logs] [Edit]      │
└────────────────────────────────────────┘
```

### During Hook Execution (钩子执行中)
```
┌────────────────────────────────────────┐
│ 🟢🟡 node server.js                     │
│      [beforeStop] Running...           │
│      PID: 12345 • running • Uptime: 5m │
│      beforeStop: sudo cleanup.sh       │
│      [Stop] [Restart] [Logs] [Edit]    │
├────────────────────────────────────────┤
│ Terminal (可以输入密码)                │
│ [beforeStop] Executing: sudo cleanup...│
│ Password: ▋                            │
└────────────────────────────────────────┘
```

## 🔧 技术架构

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Renderer  │         │     Main     │         │  PTY/Shell  │
│   Process   │         │   Process    │         │   Process   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │  user clicks Stop      │                        │
      │───────────────────────>│                        │
      │                        │                        │
      │                        │  spawn hook PTY        │
      │                        │───────────────────────>│
      │                        │                        │
      │  hook:start event      │                        │
      │<───────────────────────│                        │
      │  (hookKey saved)       │                        │
      │                        │                        │
      │  UI shows yellow 🟡    │    hook outputs        │
      │  [beforeStop] Running  │<───────────────────────│
      │                        │                        │
      │  Terminal displays     │                        │
      │  "Password:"           │                        │
      │                        │                        │
      │  user types password   │                        │
      │────┐                   │                        │
      │    │ detected hookKey  │                        │
      │<───┘                   │                        │
      │                        │                        │
      │  writeHookInput()      │                        │
      │───────────────────────>│  write to hook PTY     │
      │                        │───────────────────────>│
      │                        │                        │
      │                        │    hook completes      │
      │                        │<───────────────────────│
      │                        │                        │
      │  hook:end event        │                        │
      │<───────────────────────│                        │
      │  (hookKey cleared)     │                        │
      │                        │                        │
      │  UI removes yellow 🟡  │  stop main process     │
      │                        │───────────────────────>│
      │                        │                        │
```

## 📋 API 说明

### 新增的 API

**Main Process:**
```typescript
// 写入数据到钩子进程
manager.writeHookInput(hookKey: string, data: string): boolean

// 事件
manager.on('hook:start', (payload) => {
  // payload: { id, hookName, hookKey }
})

manager.on('hook:end', (payload) => {
  // payload: { id, hookName, hookKey, exitCode }
})
```

**Renderer Process:**
```typescript
// 写入到钩子进程
window.processAPI.writeHookInput(hookKey: string, data: string)

// 监听钩子事件
window.processAPI.onHookStart((event, payload) => { ... })
window.processAPI.onHookEnd((event, payload) => { ... })
```

## ⚠️ 注意事项

1. **密码不可见**: sudo 等命令输入密码时不会显示字符，这是正常的安全行为
2. **自动展开日志**: 点击 Stop/Restart 时会自动展开日志面板
3. **输入路由**: 
   - 钩子执行时: 输入 → 钩子进程
   - 正常运行时: 输入 → 主进程
4. **状态同步**: hookKey 通过 ref 保存，确保输入路由正确

## 🐛 故障排除

**问题**: 输入密码后没反应
- **原因**: 密码输入后需要按 Enter
- **解决**: 输入完密码后按 Enter 键

**问题**: 钩子一直显示 Running
- **原因**: 钩子命令可能在等待输入
- **解决**: 检查终端输出，看是否有提示，尝试输入并按 Enter

**问题**: 无法输入
- **原因**: 日志面板可能未展开
- **解决**: 确保点击 "Logs" 按钮展开日志面板

## 📚 相关文档

- [HOOK_PASSWORD_GUIDE.md](./HOOK_PASSWORD_GUIDE.md) - 详细指南和示例
- [PTY_IMPLEMENTATION.md](./PTY_IMPLEMENTATION.md) - PTY 实现说明
- [INTERACTIVE_TERMINAL_GUIDE.md](./INTERACTIVE_TERMINAL_GUIDE.md) - 交互式终端指南

