# Process Launcher

Electron + React + Tailwind application for launching and managing shell processes with tray support.

## Features

- 🚀 Launch and manage multiple shell processes
- 📊 Real-time process monitoring with PID and status
- 💻 Interactive terminal with xterm.js
- 🔐 Support for interactive commands (e.g., sudo)
- 🪝 Lifecycle hooks with interactive input support (beforeStop, afterStop)
- 🎨 Modern UI with Tailwind CSS
- 📝 Process log history
- 🔄 Restart processes with one click
- ⚡ Visual indicators for process and hook status

## Lifecycle Hooks

### Overview

You can configure `beforeStop` and `afterStop` hooks for each process. These hooks execute shell commands at specific lifecycle events:

- **beforeStop**: Executes before the main process is terminated
- **afterStop**: Executes after the main process has been terminated

### Interactive Input Support

Both hooks support **interactive input**, allowing you to:
- Enter passwords for sudo commands
- Respond to prompts
- Provide multi-step interactive input

### How It Works

1. When a hook is executing, you'll see:
   - A **yellow pulsing indicator** next to the process
   - A status badge showing `[beforeStop] Running...` or `[afterStop] Running...`

2. During hook execution:
   - Any input typed in the terminal is sent to the hook process
   - You can enter passwords, respond to prompts, etc.
   - The terminal shows all hook output in real-time

3. Once the hook completes:
   - The yellow indicator disappears
   - The process continues with its lifecycle (stop/restart)

### Example Use Cases

**1. Cleanup with sudo permissions:**
```
Command: node
Args: server.js
beforeStop: sudo rm -rf /tmp/app-cache
```
When stopping, you'll be prompted for your password.

**2. Interactive confirmation:**
```
Command: python
Args: app.py
afterStop: bash -c 'read -p "Archive logs? (y/n): " ans && [ "$ans" = "y" ] && tar -czf logs.tar.gz ./logs'
```

**3. Backup before stopping:**
```
Command: npm
Args: start
beforeStop: ./test-hook-password.sh
```

For detailed examples and troubleshooting, see [HOOK_PASSWORD_GUIDE.md](./HOOK_PASSWORD_GUIDE.md).

## Interactive Terminal

The application includes a fully interactive terminal for each process. You can:

- View real-time stdout and stderr output
- Type input directly into the terminal
- Enter passwords for sudo commands
- Use interactive CLI tools

### Example: Running sudo commands

1. Start a process with command: `sudo`
2. Args: `lsof -i`
3. Click "Logs" to open the terminal
4. Type your password when prompted (you won't see it, this is normal for password inputs)
5. Press Enter

## Scripts

```sh
npm run dev
npm run build
npm run typecheck
npm run test
```

