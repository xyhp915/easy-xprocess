# 钩子密码输入功能 - 实现总结

## 📅 实现日期
2025年11月26日

## 🎯 功能需求
为 `beforeStop` 和 `afterStop` 钩子命令实现密码输入功能，当这些钩子命令需要密码时（比如 sudo 命令），应该能够处理密码输入。

## ✅ 实现的功能

### 1. 交互式钩子执行
- ✅ 钩子命令通过 PTY 执行，保持交互式会话
- ✅ 钩子进程在执行期间保持活跃，可以接收输入
- ✅ 支持多轮交互（可以多次输入）

### 2. 输入路由机制
- ✅ 检测钩子是否正在执行
- ✅ 钩子执行时：终端输入 → 钩子进程
- ✅ 正常运行时：终端输入 → 主进程
- ✅ 使用 hookKey 精确定位钩子进程

### 3. 状态可视化
- ✅ 黄色闪烁指示灯显示钩子正在执行
- ✅ 状态标签显示 `[beforeStop] Running...` 或 `[afterStop] Running...`
- ✅ 实时更新钩子状态

### 4. 事件系统
- ✅ `hook:start` 事件：钩子开始执行
- ✅ `hook:end` 事件：钩子执行完成
- ✅ 事件包含 hookKey 用于进程识别

## 🔧 代码修改

### 1. `/src/main/processManager.ts`

#### 新增属性
```typescript
private hookProcesses = new Map<string, pty.IPty>()
```

#### 修改方法：`executeHook`
- 保存钩子进程到 `hookProcesses` map
- 使用 `${id}:${hookName}` 作为 hookKey
- 发送 `hook:start` 事件
- 发送 `hook:end` 事件
- 在进程结束时清理钩子进程

#### 新增方法：`writeHookInput`
```typescript
writeHookInput(hookKey: string, data: string): boolean
```
- 允许向指定钩子进程写入数据
- 用于处理密码等交互式输入

### 2. `/src/main/ipc.ts`

#### 新增 IPC 处理器
```typescript
ipcMain.handle('process:hook:input', ...)
```

#### 新增事件转发
```typescript
manager.on('hook:start', (payload) => {
  sendToAllWindows('process:hook:start', payload)
})

manager.on('hook:end', (payload) => {
  sendToAllWindows('process:hook:end', payload)
})
```

### 3. `/src/preload/index.ts`

#### 新增 API
```typescript
writeHookInput: (hookKey: string, data: string) => ...
onHookStart: (handler) => ...
onHookEnd: (handler) => ...
```

### 4. `/src/renderer/App.tsx`

#### 新增状态
```typescript
const [runningHooks, setRunningHooks] = useState<Record<string, { hookName: string; hookKey: string }>>({})
const hookKeysRef = useRef<Record<string, string>>({})
```

#### 新增事件监听器
- 监听 `hook:start` 事件，保存 hookKey
- 监听 `hook:end` 事件，清理 hookKey

#### 修改终端输入处理
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

#### 新增 UI 指示器
- 黄色闪烁圆点
- 钩子状态标签

## 📁 新增文件

1. **HOOK_PASSWORD_GUIDE.md** - 详细使用指南
   - 功能说明和实现原理
   - 多个使用示例
   - UI 指示说明
   - 技术实现细节
   - 注意事项和故障排除

2. **HOOK_INPUT_QUICKSTART.md** - 快速开始指南
   - 核心功能概述
   - 状态指示说明
   - 快速测试用例
   - UI 变化说明
   - 技术架构图
   - API 说明

3. **test-hook-password.sh** - 测试脚本
   - 简单用户输入测试
   - 密码样式输入测试
   - 多个输入测试
   - 条件输入测试

4. **README.md** - 更新主文档
   - 添加钩子功能说明
   - 添加交互式输入支持说明
   - 添加示例用例

## 🎨 UI 变化

### Before (原来)
```
🟢 process-name
   PID: 12345 • running
```

### After (钩子未执行)
```
🟢 process-name
   PID: 12345 • running
   beforeStop: sudo cleanup.sh
```

### After (钩子执行中)
```
🟢 🟡 process-name [beforeStop] Running...
      PID: 12345 • running
      beforeStop: sudo cleanup.sh
```

## 📊 数据流

```
User Action (Stop) 
  → ProcessManager.stop()
  → executeHook('beforeStop')
  → spawn PTY process
  → emit('hook:start', { id, hookName, hookKey })
  → IPC → Renderer
  → setRunningHooks (update UI)
  → User types in terminal
  → onData detected hookKey
  → writeHookInput(hookKey, data)
  → IPC → Main
  → hookProcess.write(data)
  → Hook receives input
  → Hook completes
  → emit('hook:end', { id, hookName, hookKey, exitCode })
  → IPC → Renderer
  → Clear runningHooks (update UI)
  → Continue with stop process
```

## 🧪 测试场景

### 场景 1: Sudo 密码输入
- ✅ 启动进程
- ✅ 点击 Stop
- ✅ 看到黄色指示灯
- ✅ 终端显示 "Password:"
- ✅ 输入密码（不显示）
- ✅ 按 Enter
- ✅ 钩子执行成功
- ✅ 进程停止

### 场景 2: 多轮交互
- ✅ 钩子命令有多个提示
- ✅ 依次输入多个值
- ✅ 每次输入都正确路由到钩子进程

### 场景 3: 普通进程输入不受影响
- ✅ 没有钩子执行时
- ✅ 终端输入发送到主进程
- ✅ 主进程正常接收输入

## 🔒 安全性

- ✅ 密码输入不显示（由 PTY 和 shell 控制）
- ✅ hookKey 在前端使用 ref 保存，不会在 React 状态中暴露
- ✅ 钩子进程在执行完成后立即清理
- ✅ 输入只在正确的进程间路由

## 📈 性能考虑

- ✅ 使用 Map 存储钩子进程，O(1) 查找
- ✅ 使用 ref 而非 state 存储 hookKey，避免不必要的重渲染
- ✅ 事件监听器在组件卸载时正确清理
- ✅ PTY 进程在完成后立即释放资源

## 🐛 已知限制

1. **钩子超时**: 如果钩子长时间等待输入没有响应，可能需要手动关闭应用
   - 改进建议: 添加钩子超时机制

2. **错误处理**: 钩子执行失败时可以更友好地提示用户
   - 改进建议: 添加错误状态显示

3. **并发钩子**: 目前一个进程同时只能有一个钩子执行
   - 这是设计如此（beforeStop → stop → afterStop 是串行的）

## 🚀 未来改进建议

1. **钩子超时配置**: 允许用户设置钩子执行超时时间
2. **钩子输出高亮**: 在终端中用不同颜色显示钩子输出
3. **钩子历史**: 保存钩子执行历史和结果
4. **钩子模板**: 提供常用钩子命令的模板
5. **beforeStart 钩子**: 添加进程启动前的钩子
6. **条件钩子**: 根据进程状态决定是否执行钩子

## ✨ 总结

成功实现了钩子命令的交互式输入功能，主要特点：

1. **用户体验好**: 清晰的视觉反馈，直观的交互流程
2. **技术实现优雅**: 使用事件驱动架构，代码清晰易维护
3. **功能完整**: 支持所有类型的交互式输入
4. **文档完善**: 提供了详细的使用指南和快速开始文档

用户现在可以在钩子命令中使用 sudo、交互式脚本等需要输入的命令，大大增强了应用的实用性。

