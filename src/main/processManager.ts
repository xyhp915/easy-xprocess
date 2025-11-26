import { promises as fs } from 'fs'
import * as path from 'path'
import * as pty from 'node-pty'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import * as os from 'os'

export interface ProcessInfo {
  id: string;
  command: string;
  args: string[];
  status: 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: number;
  beforeStop?: string;
  afterStop?: string;
}

export interface ProcessLogEntry {
  id: string;
  stream: 'stdout' | 'stderr';
  chunk: string;
  timestamp: number;
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, pty.IPty>()
  private infos = new Map<string, ProcessInfo>()
  private logBuffers = new Map<string, ProcessLogEntry[]>()
  private intentionallyStopped = new Set<string>()
  private readonly maxLogEntries = 500
  // 用于存储正在执行的钩子进程
  private hookProcesses = new Map<string, pty.IPty>()
  private readonly persistencePath: string
  private persistTimer?: NodeJS.Timeout

  constructor(userDataPath: string) {
    super()
    this.persistencePath = path.join(userDataPath, 'processes.json')
  }

  private ensurePersistDir() {
    return fs.mkdir(path.dirname(this.persistencePath), { recursive: true }).catch(() => {})
  }

  private launchProcess(info: ProcessInfo) {
    // 组合命令和参数
    const fullCommand = [info.command, ...info.args].join(' ')

    // 使用 pty.spawn 创建伪终端
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
    const ptyProcess = pty.spawn(shell, ['-c', fullCommand], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME || process.cwd(),
      env: process.env as { [key: string]: string }
    })

    this.processes.set(info.id, ptyProcess)
    info.status = 'running'
    info.pid = ptyProcess.pid
    info.startTime = Date.now()
    this.logBuffers.set(info.id, [])
    this.emitListUpdate()

    // pty 只有一个 data 事件，包含所有输出
    ptyProcess.onData((data) => {
      this.appendLog({ id: info.id, stream: 'stdout', chunk: data, timestamp: Date.now() })
    })

    ptyProcess.onExit(({ exitCode, signal }) => {
      // 如果是主动停止的进程，状态设为stopped
      if (this.intentionallyStopped.has(info.id)) {
        info.status = 'stopped'
        this.intentionallyStopped.delete(info.id)
      } else {
        // 否则根据退出码判断
        info.status = exitCode === 0 && signal === undefined ? 'stopped' : 'error'
      }
      this.emit('exit', { id: info.id, code: exitCode, signal })
      this.cleanup(info.id)
    })

    return info
  }

  private emitListUpdate() {
    this.emit('list:update', this.list())
  }

  list() {
    return Array.from(this.infos.values())
  }

  getLogs(id: string) {
    const buffer = this.logBuffers.get(id) ?? []
    return [...buffer]
  }

  private appendLog(entry: ProcessLogEntry) {
    const buffer = this.logBuffers.get(entry.id) ?? []
    buffer.push(entry)
    if (buffer.length > this.maxLogEntries) {
      buffer.splice(0, buffer.length - this.maxLogEntries)
    }
    this.logBuffers.set(entry.id, buffer)
    this.emit('log', entry)
  }

  // 执行钩子命令
  private async executeHook(id: string, hookCommand: string, hookName: string): Promise<void> {
    return new Promise((resolve) => {
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
      const hookProcess = pty.spawn(shell, ['-c', hookCommand], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME || process.cwd(),
        env: process.env as { [key: string]: string }
      })

      // 将钩子进程保存到 map 中，以便可以接收输入
      const hookKey = `${id}:${hookName}`
      this.hookProcesses.set(hookKey, hookProcess)

      // 输出钩子开始信息
      const startMsg = `\r\n[${hookName}] Executing: ${hookCommand}\r\n`
      this.appendLog({ id, stream: 'stdout', chunk: startMsg, timestamp: Date.now() })

      // 通知前端钩子开始执行
      this.emit('hook:start', { id, hookName, hookKey })

      // 收集输出
      hookProcess.onData((data) => {
        this.appendLog({ id, stream: 'stdout', chunk: data, timestamp: Date.now() })
      })

      hookProcess.onExit(({ exitCode }) => {
        const endMsg = `\r\n[${hookName}] Completed with exit code: ${exitCode}\r\n`
        this.appendLog({ id, stream: 'stdout', chunk: endMsg, timestamp: Date.now() })

        // 清理钩子进程
        this.hookProcesses.delete(hookKey)

        // 通知前端钩子执行完成
        this.emit('hook:end', { id, hookName, hookKey, exitCode })

        resolve()
      })
    })
  }

  start(command: string, args: string[] = [], beforeStop?: string, afterStop?: string) {
    const info: ProcessInfo = {
      id: randomUUID(),
      command,
      args,
      status: 'running',
      beforeStop,
      afterStop,
    }
    this.infos.set(info.id, info)
    this.schedulePersist()
    return this.launchProcess(info)
  }

  async stop(id: string) {
    const proc = this.processes.get(id)
    const info = this.infos.get(id)
    if (!proc) return false

    try {
      // 执行 beforeStop 钩子
      if (info?.beforeStop) {
        await this.executeHook(id, info.beforeStop, 'beforeStop')
      }

      // 标记为主动停止
      this.intentionallyStopped.add(id)
      proc.kill()

      // 等待进程退出
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.processes.has(id)) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)

        // 超时保护（5秒）
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve()
        }, 5000)
      })

      // 执行 afterStop 钩子
      if (info?.afterStop) {
        await this.executeHook(id, info.afterStop, 'afterStop')
      }

      return true
    } catch (err) {
      console.error(`Failed to kill process ${id}:`, err)
      this.intentionallyStopped.delete(id)
      return false
    }
  }

  cleanup(id: string) {
    const hadProcess = this.processes.delete(id)
    const info = this.infos.get(id)
    let changed = hadProcess
    if (info) {
      if (info.pid !== undefined) {
        info.pid = undefined
        changed = true
      }
      if (info.status === 'running') {
        info.status = 'stopped'
        changed = true
      }
    }
    if (changed) {
      this.schedulePersist()
      this.emitListUpdate()
    }
  }

  remove(id: string) {
    const proc = this.processes.get(id)
    if (proc) {
      try {
        // 标记为主动停止
        this.intentionallyStopped.add(id)
        proc.kill()
      } catch (err) {
        console.error(`Failed to kill process ${id}:`, err)
        this.intentionallyStopped.delete(id)
      }
      this.processes.delete(id)
    }
    const removedInfo = this.infos.delete(id)
    const removedLogs = this.logBuffers.delete(id)
    // 清理标志
    this.intentionallyStopped.delete(id)
    if (proc || removedInfo || removedLogs) {
      this.schedulePersist()
      this.emitListUpdate()
    }
    return Boolean(proc || removedInfo || removedLogs)
  }

  restart(id: string) {
    const info = this.infos.get(id)
    if (!info) return false

    // 停止当前进程
    this.stop(id)

    // 清空日志缓冲区（可选，如果想保留历史日志可以注释掉）
    this.logBuffers.set(id, [])

    // 重新启动进程
    this.launchProcess(info)

    return true
  }

  writeInput(id: string, data: string) {
    const proc = this.processes.get(id)
    if (!proc) return false

    try {
      proc.write(data)
      return true
    } catch (err) {
      console.error(`Failed to write to process ${id}:`, err)
      return false
    }
  }

  writeHookInput(hookKey: string, data: string) {
    const hookProc = this.hookProcesses.get(hookKey)
    if (!hookProc) return false

    try {
      hookProc.write(data)
      return true
    } catch (err) {
      console.error(`Failed to write to hook process ${hookKey}:`, err)
      return false
    }
  }

  update(id: string, command: string, args: string[] = [], beforeStop?: string, afterStop?: string) {
    const info = this.infos.get(id)
    if (!info) return false

    info.command = command
    info.args = args
    info.beforeStop = beforeStop
    info.afterStop = afterStop

    // TODO: 如果进程正在运行，是否需要重启？
    // const isRunning = info.status === 'running'
    //
    // if (isRunning) {
    //   this.stop(id)
    //   this.logBuffers.set(id, [])
    //   return this.launchProcess(info)
    // }

    this.schedulePersist()
    this.emitListUpdate()
    return info
  }

  private schedulePersist() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined
      this.persistToDisk().catch((err) => {
        console.error('Failed to persist process list:', err)
      })
    }, 300)
  }

  private async persistToDisk() {
    await this.ensurePersistDir()
    const data = Array.from(this.infos.values()).map((info) => {
      const { id, command, args, beforeStop, afterStop } = info
      return { id, command, args, beforeStop, afterStop }
    })
    await fs.writeFile(this.persistencePath, JSON.stringify({ version: 1, processes: data }, null, 2), 'utf-8')
  }

  async loadFromDisk() {
    try {
      const raw = await fs.readFile(this.persistencePath, 'utf-8')
      const parsed = JSON.parse(raw)
      const processes = parsed?.processes ?? []
      processes.forEach((proc: any) => {
        if (!proc.id) {
          proc.id = randomUUID()
        }
        const info: ProcessInfo = {
          id: proc.id,
          command: proc.command,
          args: Array.isArray(proc.args) ? proc.args : [],
          status: 'stopped',
          beforeStop: proc.beforeStop,
          afterStop: proc.afterStop,
        }
        this.infos.set(info.id, info)
      })
      this.emitListUpdate()
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        return
      }
      console.error('Failed to load processes:', err)
    }
  }
}
