# Hook 密码输入功能指南

## 功能说明

现在 `beforeStop` 和 `afterStop` 钩子命令支持交互式输入，可以在钩子执行时输入密码或其他需要的信息。

## 实现原理

1. **PTY 进程持久化**：钩子命令通过 PTY（伪终端）执行，可以保持交互式会话
2. **输入路由**：当钩子正在执行时，终端的输入会自动路由到钩子进程
3. **状态指示**：UI 会显示钩子正在执行的状态，包括黄色指示灯和标签

## 使用示例

### 示例 1：使用 sudo 命令的 beforeStop 钩子

假设您需要在停止进程前执行一个需要 sudo 权限的清理命令：

**配置：**
```
Command: node
Args: server.js
beforeStop: sudo rm -rf /tmp/app-cache
```

**使用流程：**
1. 启动进程后，点击 "Stop" 按钮
2. beforeStop 钩子开始执行，您会看到：
   - 黄色指示灯闪烁
   - 标签显示 `[beforeStop] Running...`
   - 终端显示 `Password:` 提示
3. 在终端中输入您的密码（注意：输入时不会显示字符）
4. 按 Enter 键
5. 钩子执行完成后，进程会被停止

### 示例 2：需要确认的 afterStop 钩子

**配置：**
```
Command: python
Args: app.py
afterStop: bash -c 'read -p "Do you want to clean up? (y/n): " answer && if [ "$answer" = "y" ]; then echo "Cleaning..."; fi'
```

**使用流程：**
1. 停止进程后，afterStop 钩子开始执行
2. 您会看到提示 `Do you want to clean up? (y/n):`
3. 在终端输入 `y` 或 `n` 并按 Enter
4. 钩子根据您的输入执行相应操作

### 示例 3：多步骤交互钩子

**配置：**
```
Command: npm
Args: start
beforeStop: bash -c 'echo "Starting cleanup..."; read -p "Enter backup location: " loc; sudo cp -r ./data "$loc"; echo "Backup complete"'
```

## UI 指示说明

### 钩子执行中
- **黄色闪烁指示灯**：位于进程名称旁边
- **状态标签**：显示 `[beforeStop] Running...` 或 `[afterStop] Running...`
- **终端输入**：此时终端的任何输入都会发送到钩子进程

### 正常运行
- **绿色闪烁指示灯**：进程正常运行
- **终端输入**：发送到主进程

## 技术实现细节

### 后端（Main Process）

1. **hookProcesses Map**：存储正在执行的钩子进程
   ```typescript
   private hookProcesses = new Map<string, pty.IPty>()
   ```

2. **executeHook 方法**：
   - 创建 PTY 进程执行钩子命令
   - 保存钩子进程到 map，使用 `${id}:${hookName}` 作为 key
   - 发送 `hook:start` 事件通知前端
   - 监听进程输出并转发到日志
   - 进程结束时发送 `hook:end` 事件并清理

3. **writeHookInput 方法**：
   - 允许前端向特定钩子进程写入数据
   - 使用 hookKey 定位钩子进程

### 前端（Renderer Process）

1. **状态管理**：
   ```typescript
   const [runningHooks, setRunningHooks] = useState<Record<string, { hookName: string; hookKey: string }>>({})
   const hookKeysRef = useRef<Record<string, string>>({})
   ```

2. **事件监听**：
   - `onHookStart`：钩子开始时保存 hookKey
   - `onHookEnd`：钩子结束时清理 hookKey

3. **输入路由**：
   ```typescript
   term.onData((data) => {
     const hookKey = hookKeysRef.current[id]
     if (hookKey) {
       window.processAPI.writeHookInput(hookKey, data)
     } else {
       window.processAPI.writeInput(id, data)
     }
   })
   ```

## 注意事项

1. **密码输入不可见**：使用 sudo 等命令时，输入的密码不会在终端显示，这是正常行为
2. **自动展开日志**：点击 Stop 或 Restart 按钮时，日志会自动展开，方便查看钩子输出
3. **钩子超时**：如果钩子命令长时间等待输入而不响应，可能需要手动终止应用程序
4. **多个钩子**：beforeStop 和 afterStop 会按顺序执行，每个都可以有自己的交互式输入

## 测试建议

### 简单测试
创建一个简单的交互式钩子测试：
```
Command: echo
Args: "test"
beforeStop: bash -c 'read -p "Enter your name: " name && echo "Hello, $name!"'
```

### Sudo 测试
```
Command: sleep
Args: 1000
beforeStop: sudo echo "Testing sudo access"
```

点击 Stop 后，在终端输入您的密码即可。

## 故障排除

### 钩子卡住不动
- 检查钩子命令是否等待输入
- 尝试在终端输入并按 Enter

### 密码输入后无反应
- 确保输入了正确的密码
- 检查终端日志是否有错误信息

### 无法输入
- 确保日志面板已展开
- 检查黄色指示灯是否显示（表示钩子正在运行）

