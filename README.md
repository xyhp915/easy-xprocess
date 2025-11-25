# Process Launcher

Electron + React + Tailwind application for launching and managing shell processes with tray support.

## Features

- 🚀 Launch and manage multiple shell processes
- 📊 Real-time process monitoring with PID and status
- 💻 Interactive terminal with xterm.js
- 🔐 Support for interactive commands (e.g., sudo)
- 🎨 Modern UI with Tailwind CSS
- 📝 Process log history
- 🔄 Restart processes with one click

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

