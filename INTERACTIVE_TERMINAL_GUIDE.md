# 交互式终端使用指南

## ✨ 新功能概述

您的 Electron Process Launcher 现在支持完整的交互式终端功能！这意味着您可以：

- ✅ 在终端中直接输入内容
- ✅ 为 `sudo` 命令输入密码
- ✅ 使用任何需要用户交互的命令
- ✅ 查看实时的、原始的终端输出（没有时间戳前缀）

## 🎯 使用示例

### 示例 1: 运行需要 sudo 权限的命令

1. **启动命令**
   - Command: `sudo`
   - Args: `lsof -i`
   - 点击 **"Start Process"**

2. **查看并输入密码**
   - 点击该进程的 **"Logs"** 按钮
   - 您会看到终端提示 `Password:`
   - 直接在终端中输入您的密码
   - **注意**: 输入密码时不会显示任何字符，这是正常的安全行为
   - 按 **Enter** 键

3. **查看结果**
   - 命令将执行并显示结果
   - 所有输出都会实时显示在终端中

### 示例 2: 交互式 Python

```
Command: python3
Args: -i
```

点击 "Logs" 后，您可以：
- 输入 Python 代码
- 看到实时执行结果
- 使用 Ctrl+D 退出（macOS）

### 示例 3: 查看系统日志

```
Command: sudo
Args: tail -f /var/log/system.log
```

- 输入密码后，可以实时查看系统日志
- 按 Ctrl+C 停止（或点击 Stop 按钮）

### 示例 4: SSH 连接

```
Command: ssh
Args: user@hostname
```

- 可以输入密码或确认指纹
- 连接后可以执行远程命令

## 🔧 技术特性

### 终端配置

终端配置包括：
- **光标闪烁**: 清晰显示输入位置
- **字体**: JetBrains Mono（等宽字体）
- **颜色**: 深色主题（背景 #0f172a，前景 #e2e8f0）
- **自动换行**: 支持 convertEol
- **环境变量**: TERM=xterm-256color（支持颜色和交互）

### 输入/输出流程

**输入流程**:
```
用户在终端输入 
  → xterm.onData() 
  → processAPI.writeInput() 
  → 进程的 stdin
```

**输出流程**:
```
进程的 stdout/stderr 
  → ProcessManager 
  → IPC 事件 
  → xterm.write() 
  → 显示在终端
```

## ⚠️ 重要提示

### 密码输入
- 输入 sudo 密码时，**不会显示任何字符**（包括 `*`）
- 这是 Unix/Linux 的标准安全行为
- 只需输入密码然后按 Enter

### 特殊键支持
- ✅ **Enter**: 提交输入
- ✅ **Backspace**: 删除字符
- ✅ **Ctrl+C**: 终止当前命令
- ✅ **Ctrl+D**: EOF（文件结束）
- ✅ **方向键**: 在支持的程序中导航

### 终端大小
- 当前默认高度: 240px
- 可以在 `App.tsx` 中调整 `style={{ height: '240px' }}`

## 🎨 UI 元素说明

每个进程卡片包含：

- **Stop** (红色): 停止进程
- **Restart** (蓝色): 重启进程（会清空日志）
- **Remove** (黄色): 删除已停止的进程
- **Logs/Hide Logs** (灰色): 显示/隐藏终端

终端特征：
- 深色背景
- 闪烁的光标（表示可以输入）
- 原始输出（保持程序的原始格式和颜色）

## 💡 高级用法

### 运行长时间任务

```
Command: npm
Args: run dev
```

或

```
Command: python
Args: -m http.server 8000
```

### 监控文件变化

```
Command: tail
Args: -f /path/to/file.log
```

### 执行脚本

```
Command: bash
Args: /path/to/script.sh
```

如果脚本需要交互（如密码确认），您可以在终端中输入。

## 🐛 故障排除

### 问题: 无法输入
**解决方案**: 确保点击了终端区域使其获得焦点

### 问题: 密码输入后没反应
**解决方案**: 确保按了 Enter 键

### 问题: 终端显示乱码
**解决方案**: 这是正常的 ANSI 转义序列，xterm 会自动处理

### 问题: Ctrl+C 不工作
**解决方案**: 
- 确保终端有焦点
- 或者使用 "Stop" 按钮

## 📚 更多信息

### 关于 xterm.js
本项目使用 [xterm.js](https://xtermjs.org/)，这是一个功能强大的终端模拟器。

### 关于进程管理
使用 Node.js 的 `child_process.spawn()` 创建子进程，支持完整的 stdin/stdout/stderr 流。

### 日志持久化
每个进程的日志会保存在内存中（最多 500 条），关闭日志面板后不会丢失。

## 🎉 享受使用！

现在您可以像使用真实终端一样使用 Process Launcher。所有需要交互的命令都能正常工作！

