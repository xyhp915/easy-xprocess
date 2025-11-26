# 功能演示步骤

## 演示 1: 基础密码输入 (推荐首次演示)

### 准备
```
Command: sleep
Args: 10
beforeStop: sudo echo "Hello from hook"
```

### 演示步骤
1. 点击 "Start Process" 启动进程
2. 等待进程启动（绿色指示灯出现）
3. 点击 "Stop" 按钮
4. **观察变化**:
   - 🟡 黄色指示灯出现
   - 📛 `[beforeStop] Running...` 标签显示
   - 📟 终端自动展开
5. 终端显示:
   ```
   [beforeStop] Executing: sudo echo "Hello from hook"
   Password:
   ```
6. 在终端中输入你的系统密码（不会显示）
7. 按 Enter 键
8. **观察结果**:
   - 终端显示 "Hello from hook"
   - 黄色指示灯消失
   - 标签消失
   - 进程停止

---

## 演示 2: 交互式脚本

### 准备
```
Command: echo
Args: "Running..."
beforeStop: ./test-hook-password.sh
```

### 演示步骤
1. 启动进程
2. 点击 "Stop"
3. 钩子开始执行，依次回答以下问题:
   - "Enter your name:" → 输入名字
   - "Enter a secret:" → 输入秘密（不显示）
   - "First question - Enter a number:" → 输入数字
   - "Second question - Enter a color:" → 输入颜色
   - "Do you want to continue? (y/n):" → 输入 y
   - "Enter final message:" → 输入消息
4. 查看完整的交互过程和输出

---

## 演示 3: 对比钩子执行前后

### 准备两个进程

**进程 A (有钩子):**
```
Command: node
Args: -e "setInterval(() => console.log('tick'), 1000)"
beforeStop: bash -c 'read -p "Confirm stop (yes/no): " ans && echo "Answer: $ans"'
```

**进程 B (无钩子):**
```
Command: node
Args: -e "setInterval(() => console.log('tock'), 1000)"
```

### 演示步骤
1. 同时启动两个进程
2. 展开两个进程的日志面板
3. 观察两个进程都在运行（绿色指示灯）
4. **停止进程 B（无钩子）**:
   - 点击 Stop
   - 立即停止，没有额外提示
5. **停止进程 A（有钩子）**:
   - 点击 Stop
   - 黄色指示灯出现
   - 提示 "Confirm stop (yes/no):"
   - 输入 "yes"
   - 显示 "Answer: yes"
   - 进程停止

---

## 演示 4: 主进程输入 vs 钩子输入

### 准备
```
Command: bash
Args: 
beforeStop: bash -c 'read -p "Hook input: " inp && echo "Hook got: $inp"'
```

### 演示步骤
1. 启动进程
2. 展开日志
3. **测试主进程输入**:
   - 在终端输入: `echo "hello from main"`
   - 按 Enter
   - 看到输出: "hello from main"
4. **测试钩子输入**:
   - 点击 Stop 按钮
   - 黄色指示灯出现
   - 终端提示: "Hook input:"
   - 输入: "hello from hook"
   - 看到输出: "Hook got: hello from hook"
5. **对比**:
   - 主进程输入: 直接发送到 bash 进程
   - 钩子输入: 发送到钩子进程

---

## 演示 5: Restart 流程（完整生命周期）

### 准备
```
Command: python3
Args: -c "import time; i=0; 
while True: print(f'Count: {i}'); i+=1; time.sleep(1)"
beforeStop: bash -c 'echo "Stopping..."; sleep 1; echo "Stopped"'
afterStop: bash -c 'echo "Cleanup..."; sleep 1; echo "Done"'
```

### 演示步骤
1. 启动进程
2. 观察计数输出
3. 点击 "Restart" 按钮
4. **观察完整流程**:
   - beforeStop 执行:
     - 🟡 `[beforeStop] Running...`
     - "Stopping..."
     - (等待 1 秒)
     - "Stopped"
   - 主进程停止
   - afterStop 执行:
     - 🟡 `[afterStop] Running...`
     - "Cleanup..."
     - (等待 1 秒)
     - "Done"
   - 进程重启
   - 计数从 0 开始

---

## 演示 6: 多进程并发

### 准备三个进程

**进程 1:**
```
Command: sleep
Args: 100
beforeStop: sudo ls /root
```

**进程 2:**
```
Command: sleep
Args: 100
beforeStop: bash -c 'read -p "Name: " n && echo $n'
```

**进程 3:**
```
Command: sleep
Args: 100
```

### 演示步骤
1. 启动所有三个进程
2. 同时点击进程 1 和进程 2 的 "Stop"
3. **观察**:
   - 两个进程都显示黄色指示灯
   - 两个钩子独立执行
   - 可以分别在各自终端输入
4. 先完成进程 2 的输入（输入名字）
5. 再完成进程 1 的输入（输入 sudo 密码）
6. 观察两个进程按各自完成时间停止

---

## 技巧与注意事项

### 密码输入技巧
- 输入密码时不会显示任何字符（包括 * 号）
- 这是 sudo 的正常行为，不是 bug
- 输入完直接按 Enter 即可

### 调试技巧
- 打开浏览器开发者工具（View → Toggle Developer Tools）
- 查看 Console 标签页
- 会看到 "Hook started:" 和 "Hook ended:" 日志

### 常见问题
1. **输入后没反应**: 检查是否按了 Enter
2. **密码错误**: sudo 会提示重新输入
3. **钩子卡住**: 检查终端是否有提示等待输入

### 最佳实践
- 在 beforeStop/afterStop 中添加 echo 语句，便于了解执行进度
- 使用 `read -p "提示文本: "` 提供清晰的输入提示
- 复杂脚本建议写入独立文件，用 `./script.sh` 调用

