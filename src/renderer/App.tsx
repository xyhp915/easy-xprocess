import { useEffect, useMemo, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

interface ProcessInfo {
  id: string;
  command: string;
  args: string[];
  status: 'running' | 'stopped' | 'error';
  pid?: number;
}

interface ProcessLogEntry {
  id: string
  stream: 'stdout' | 'stderr'
  chunk: string
  timestamp: number
}

function App () {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const terminals = useRef<Record<string, Terminal>>({})
  const logHandler = useMemo(() => (_event: unknown, payload: ProcessLogEntry) => {
    const term = terminals.current[payload.id]
    if (!term) return
    // 直接写入原始输出，不加时间戳，使其更像真实终端
    term.write(payload.chunk)
  }, [])

  const startProcess = async () => {
    if (!command) return
    const newProcess = await window.processAPI.start(command, args.split(' ').filter(Boolean))
    setCommand('')
    setArgs('')

    // 自动打开新进程的日志终端
    if (newProcess && newProcess.id) {
      setExpanded((prev) => ({ ...prev, [newProcess.id]: true }))
    }
  }

  const stopProcess = async (id: string) => {
    await window.processAPI.stop(id)
  }

  const restartProcess = async (id: string) => {
    await window.processAPI.restart(id)
  }

  const removeProcess = async (id: string) => {
    await window.processAPI.remove(id)
  }

  const toggleLogs = (id: string) => {
    if (!processes.some((proc) => proc.id === id)) return
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      // 如果是关闭日志，清理终端
      if (prev[id]) {
        terminals.current[id]?.dispose()
        delete terminals.current[id]
      }
      return next
    })
  }

  // 当 expanded 状态变化时初始化终端
  useEffect(() => {
    Object.entries(expanded).forEach(async ([id, isExpanded]) => {
      if (!isExpanded || terminals.current[id]) return

      // 使用 setTimeout 确保 DOM 已经更新
      setTimeout(async () => {
        const container = document.getElementById(`terminal-${id}`)
        if (!container) {
          console.error(`Terminal container not found for process ${id}`)
          return
        }

        const term = new Terminal({
          convertEol: true,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          cursorBlink: true,
          theme: {
            background: '#0f172a',
            foreground: '#e2e8f0',
          },
        })
        term.open(container)
        terminals.current[id] = term

        // 启用输入功能 - 当用户在终端中输入时，发送到进程的 stdin
        term.onData((data) => {
          window.processAPI.writeInput(id, data)
        })

        const history = await window.processAPI.getLogs(id)
        history.forEach((entry) => {
          term.write(entry.chunk)
        })
        term.scrollToBottom()
      }, 0)
    })
  }, [expanded])

  useEffect(() => {
    window.processAPI.list().then((data) => setProcesses(data))
    const unsubscribe = window.processAPI.onLogs(logHandler)
    return () => {
      unsubscribe()
      Object.values(terminals.current).forEach((term) => term.dispose())
      terminals.current = {}
    }
  }, [logHandler])

  useEffect(() => {
    const handler = (_event: unknown, data: ProcessInfo[]) => {
      setProcesses(data)
      setExpanded((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((key) => {
          if (!data.some((proc) => proc.id === key)) {
            terminals.current[key]?.dispose()
            delete terminals.current[key]
            delete next[key]
          }
        })
        return next
      })
    }
    const off = window.processAPI.onProcessList(handler)
    return () => {
      off()
    }
  }, [])

  return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-4">Process Launcher</h1>
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <div className="flex gap-4 mb-4">
            <input
                className="flex-1 px-3 py-2 rounded bg-slate-900"
                placeholder="Command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
            />
            <input
                className="flex-1 px-3 py-2 rounded bg-slate-900"
                placeholder="Args"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
            />
            <button className="px-4 py-2 bg-emerald-600 rounded" onClick={startProcess}>
              Start Process
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {processes.map((proc) => (
              <div key={proc.id}>
                <div
                    className="bg-slate-800 p-4 rounded flex justify-between items-center cursor-pointer active:opacity-70 select-none"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName === 'BUTTON') {
                        // if restart/stop button clicked, force log visible
                        if ((e.target as HTMLElement).innerText === 'Restart' || (e.target as HTMLElement).innerText ===
                            'Stop') {
                          setExpanded((prev) => ({ ...prev, [proc.id]: true }))
                        }

                        return
                      }
                      toggleLogs(proc.id)
                    }}
                >
                  <div>
                    <div className="font-semibold">{proc.command}</div>
                    <div className="text-sm text-slate-400">PID: {proc.pid ?? 'N/A'} • {proc.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-rose-600 rounded" onClick={() => stopProcess(proc.id)}>
                      Stop
                    </button>
                    <button className="px-3 py-1 bg-blue-600 rounded" onClick={() => restartProcess(proc.id)}>
                      Restart
                    </button>
                    {proc.status !== 'running' && (
                        <button className="px-3 py-1 bg-amber-600 rounded" onClick={() => removeProcess(proc.id)}>
                          Remove
                        </button>
                    )}
                    <button className="px-3 py-1 bg-slate-600 rounded" onClick={() => toggleLogs(proc.id)}>
                      {expanded[proc.id] ? 'Hide Logs' : 'Logs'}
                    </button>
                  </div>
                </div>
                {expanded[proc.id] && (
                    <div
                        id={`terminal-${proc.id}`}
                        className="mt-3 bg-slate-900 rounded p-3 text-sm font-mono"
                        style={{ height: '240px' }}
                    />
                )}
              </div>
          ))}
        </div>
        {processes.length === 0 && (
            <div className="text-center text-slate-500 py-6">
              No processes found. Start a new process using the form above.
            </div>
        )}
      </div>
  )
}

export default App
