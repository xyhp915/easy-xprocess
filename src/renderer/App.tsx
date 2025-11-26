import { useEffect, useMemo, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { formatUptime } from '../shared/utils'
import ProcessForm, { ProcessFormValues } from './components/ProcessForm'
import { ProcessInfo } from '../main/processManager'

interface ProcessLogEntry {
  id: string
  stream: 'stdout' | 'stderr'
  chunk: string
  timestamp: number
}

const EMPTY_FORM: ProcessFormValues = {
  command: '',
  args: '',
  beforeStop: '',
  afterStop: '',
}

function App () {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [creatingValues, setCreatingValues] = useState<ProcessFormValues>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<Record<string, ProcessFormValues>>({})
  const [, setTick] = useState(0) // 用于触发组件重新渲染以更新运行时长
  const [runningHooks, setRunningHooks] = useState<Record<string, { hookName: string; hookKey: string }>>({}) // 记录正在执行的钩子
  const terminals = useRef<Record<string, Terminal>>({})
  const hookKeysRef = useRef<Record<string, string>>({}) // 保存 hookKey 的引用，用于终端输入
  const logHandler = useMemo(() => (_event: unknown, payload: ProcessLogEntry) => {
    const term = terminals.current[payload.id]
    if (!term) return
    // 直接写入原始输出，不加时间戳，使其更像真实终端
    term.write(payload.chunk)
  }, [])

  const startProcess = async (values?: ProcessFormValues) => {
    const payload = values ?? creatingValues
    if (!payload.command.trim()) return
    const newProcess = await window.processAPI.start(
        payload.command,
        payload.args.split(' ').filter(Boolean),
        payload.beforeStop || undefined,
        payload.afterStop || undefined,
    )
    setCreatingValues(EMPTY_FORM)
    if (newProcess && newProcess.id) {
      setExpanded((prev) => ({ ...prev, [newProcess.id]: true }))
    }
  }

  const updateProcess = async (id: string) => {
    const payload = editingValues[id]
    if (!payload || !payload.command.trim()) return
    await window.processAPI.update(
        id,
        payload.command,
        payload.args.split(' ').filter(Boolean),
        payload.beforeStop || undefined,
        payload.afterStop || undefined,
    )
    setEditingId(null)
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

  const enterEditMode = (proc: ProcessInfo) => {
    setEditingId(proc.id)
    setEditingValues((prev) => ({
      ...prev,
      [proc.id]: {
        command: proc.command,
        args: proc.args.join(' '),
        beforeStop: proc.beforeStop ?? '',
        afterStop: proc.afterStop ?? '',
      },
    }))
    setExpanded((prev) => ({ ...prev, [proc.id]: true }))
  }

  const cancelEdit = (id: string) => {
    setEditingId((prev) => (prev === id ? null : prev))
  }

  const handleCreateChange = (values: ProcessFormValues) => {
    setCreatingValues(values)
  }

  const handleEditChange = (id: string, values: ProcessFormValues) => {
    setEditingValues((prev) => ({ ...prev, [id]: values }))
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
          rows: 12,
          scrollback: 1000,
          theme: {
            background: '#0f172a',
            foreground: '#e2e8f0',
          },
        })
        term.open(container)
        terminals.current[id] = term

        // 启用输入功能 - 当用户在终端中输入时，发送到进程的 stdin
        // 如果有钩子正在运行，则发送到钩子进程
        term.onData((data) => {
          const hookKey = hookKeysRef.current[id]
          if (hookKey) {
            // 如果有钩子正在执行，发送到钩子进程
            window.processAPI.writeHookInput(hookKey, data)
          } else {
            // 否则发送到主进程
            window.processAPI.writeInput(id, data)
          }
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
    const unsubscribeHookStart = window.processAPI.onHookStart((_event, payload) => {
      console.log('Hook started:', payload)
      setRunningHooks((prev) => ({ ...prev, [payload.id]: { hookName: payload.hookName, hookKey: payload.hookKey } }))
      hookKeysRef.current[payload.id] = payload.hookKey
    })
    const unsubscribeHookEnd = window.processAPI.onHookEnd((_event, payload) => {
      console.log('Hook ended:', payload)
      setRunningHooks((prev) => {
        const next = { ...prev }
        delete next[payload.id]
        return next
      })
      delete hookKeysRef.current[payload.id]
    })
    return () => {
      unsubscribe()
      unsubscribeHookStart()
      unsubscribeHookEnd()
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

  // 每秒更新一次运行时长显示
  useEffect(() => {
    const interval = setInterval(() => {
      // 只在有运行中的进程时才更新
      if (processes.some(p => p.status === 'running')) {
        setTick(t => t + 1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [processes])

  return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-4">Process Launcher</h1>
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <ProcessForm
              initialValues={creatingValues}
              onSubmit={async (values) => startProcess(values)}
              onChange={handleCreateChange}
              submitLabel="Start Process"
              submitButtonClassName="bg-emerald-600"
              resetOnSubmit
          />
        </div>
        <div className="space-y-3">
          {processes.map((proc) => (
              <div key={proc.id} className="relative">
                {editingId === proc.id ? (
                    <div className="bg-slate-800 p-4 rounded">
                      <ProcessForm
                          initialValues={editingValues[proc.id]}
                          onSubmit={async () => updateProcess(proc.id)}
                          onChange={(values) => handleEditChange(proc.id, values)}
                          onCancel={() => cancelEdit(proc.id)}
                          submitLabel="Save Changes"
                          submitButtonClassName="bg-sky-600"
                      />
                    </div>
                ) : (
                    <div
                        className={`bg-slate-800 p-4 ${expanded[proc.id]
                            ? 'rounded-t'
                            : 'rounded'} flex justify-between items-center cursor-pointer active:opacity-70 select-none`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).tagName === 'BUTTON') {
                            if ((e.target as HTMLElement).innerText === 'Restart' ||
                                (e.target as HTMLElement).innerText ===
                                'Stop') {
                              setExpanded((prev) => ({ ...prev, [proc.id]: true }))
                            }
                            return
                          }
                          toggleLogs(proc.id)
                        }}
                    >
                      <div className="flex items-center gap-3">
                        {proc.status === 'running' && (
                            <div className="relative">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div
                                  className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                            </div>
                        )}
                        {runningHooks[proc.id] && (
                            <div className="relative">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div
                                  className="absolute inset-0 w-3 h-3 bg-yellow-500 rounded-full animate-ping opacity-75"></div>
                            </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className={'font-semibold'}>
                              {proc.command}
                            </strong>
                            <span className={'text-xs text-slate-400 font-[500] pt-[1px]'}>
                              {proc.args?.join(' ')}
                            </span>
                            {runningHooks[proc.id] && (
                                <span className="text-xs text-yellow-400 font-semibold bg-yellow-900/30 px-2 py-0.5 rounded">
                                  [{runningHooks[proc.id].hookName}] Running...
                                </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">
                            PID: {proc.pid ?? 'N/A'} • {proc.status}
                            {proc.status === 'running' && proc.startTime && (
                                <> • Uptime: {formatUptime(proc.startTime)}</>
                            )}
                          </div>
                          {(proc.beforeStop || proc.afterStop) && (
                              <div className="text-xs text-slate-500 mt-1">
                                {proc.beforeStop && (
                                    <div>beforeStop: {proc.beforeStop}</div>
                                )}
                                {proc.afterStop && (
                                    <div>afterStop: {proc.afterStop}</div>
                                )}
                              </div>
                          )}
                        </div>
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
                        <button className="px-3 py-1 bg-purple-600 rounded" onClick={() => enterEditMode(proc)}>
                          Edit
                        </button>
                      </div>
                    </div>
                )}
                {expanded[proc.id] && (
                    <div
                        id={`terminal-${proc.id}`}
                        className="bg-slate-900 rounded-b p-3 text-sm font-mono overflow-hidden"
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
