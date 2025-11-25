# 使用 PTY (伪终端) 支持交互式命令

## 🎯 问题解决

之前使用 `child_process.spawn()` 时，`sudo` 等需要 TTY 的命令无法正常显示密码提示。现在已经改用 `node-pty` 来创建真正的伪终端，完全支持交互式命令。

## ✅ 已完成的修改

### 1. 安装依赖
```bash
npm install node-pty
```

### 2. 重写 ProcessManager (`src/main/processManager.ts`)

**主要变化：**

- ✅ 从 `child_process.spawn` 改为 `pty.spawn`
- ✅ 创建真正的伪终端 (PTY)
- ✅ 支持 ANSI 颜色代码
- ✅ 支持交互式密码输入
- ✅ 使用 `proc.write()` 发送输入数据

**新的 pty 配置：**
```typescript
const ptyProcess = pty.spawn(shell, ['-c', fullCommand], {
  name: 'xterm-256color',  // 终端类型
  cols: 80,                // 终端列数
  rows: 30,                // 终端行数
  cwd: process.env.HOME,   // 工作目录
  env: process.env         // 环境变量
})
```

### 3. 自动打开日志终端 (`src/renderer/App.tsx`)

启动进程后会自动展开日志终端，这样用户可以立即看到输出和密码提示。

## 🎉 现在的工作流程

### 运行 sudo 命令

1. **输入命令**
   - Command: `sudo`
   - Args: `lsof -i`

2. **点击 "Start Process"**
   - ✅ 进程启动
   - ✅ 日志终端自动展开
   - ✅ 立即看到 `Password:` 提示

3. **输入密码**
   - ✅ 直接在终端中输入密码
   - ✅ 密码不会显示（安全行为）
   - ✅ 按 Enter 继续

4. **查看结果**
   - ✅ 命令执行并显示输出
   - ✅ 保留完整的 ANSI 颜色

## 🔍 PTY vs Spawn 的区别

| 特性 | child_process.spawn | node-pty (PTY) |
|------|---------------------|----------------|
| TTY 检测 | ❌ 进程认为不是终端 | ✅ 进程认为是真实终端 |
| sudo 密码提示 | ❌ 可能不显示 | ✅ 正常显示 |
| ANSI 颜色 | ⚠️ 部分支持 | ✅ 完全支持 |
| 交互式程序 | ❌ 受限 | ✅ 完全支持 |
| 输入回显 | ❌ 需要手动处理 | ✅ 自动处理 |
| 终端大小 | ❌ 不支持 | ✅ 可配置 |

## 📝 技术细节

### PTY 工作原理

```
┌─────────────┐
│   xterm.js  │ (渲染进程)
└──────┬──────┘
       │ IPC
┌──────▼──────┐
│ node-pty    │ (主进程)
│  (Master)   │
└──────┬──────┘
       │ PTY
┌──────▼──────┐
│   Process   │
│   (Slave)   │
└─────────────┘
```

### 输入/输出流

**输入：**
```
用户输入 → xterm.onData() 
  → IPC: writeInput 
  → pty.write() 
  → 进程的 stdin
```

**输出：**
```
进程输出 → pty.onData() 
  → appendLog() 
  → IPC: process:logs:push 
  → xterm.write() 
  → 显示
```

## ⚠️ 注意事项

### macOS/Linux
- ✅ 使用 `bash -c "command args"` 执行命令
- ✅ 完全支持 sudo 和其他交互式命令
- ✅ 支持所有 shell 特性（管道、重定向等）

### Windows
- 使用 `powershell.exe -c "command args"`
- 可能需要以管理员权限运行 Electron 应用

### 终端大小
- 当前设置：80 列 × 30 行
- 可以在 `processManager.ts` 中调整 `cols` 和 `rows`
- 也可以动态调整：`ptyProcess.resize(cols, rows)`

## 🚀 测试示例

### 1. Sudo 命令
```
Command: sudo
Args: lsof -i
```

### 2. 交互式 SSH
```
Command: ssh
Args: user@hostname
```

### 3. 需要确认的命令
```
Command: rm
Args: -i file.txt
```

### 4. 带颜色输出的命令
```
Command: ls
Args: -la --color=auto
```

### 5. Python 交互式
```
Command: python3
Args: -i
```

## 🎨 额外好处

使用 PTY 后，您还获得了：

1. **完整的 ANSI 支持**
   - 颜色代码
   - 光标控制
   - 清屏等

2. **更好的交互体验**
   - 正确的退格键处理
   - Tab 补全（如果程序支持）
   - 历史记录导航

3. **与真实终端一致**
   - 程序行为与在 Terminal.app 中完全一致
   - 不需要特殊处理

## 🎉 全部完成！

现在您的 Process Launcher 拥有了真正的终端功能，可以运行任何需要 TTY 的交互式命令！

