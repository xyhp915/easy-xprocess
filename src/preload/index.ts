import { contextBridge, ipcRenderer } from 'electron'
import type { ProcessInfo, ProcessLogEntry } from '../main/processManager'

const api = {
  list: () => ipcRenderer.invoke('process:list'),
  start: (command: string, args: string[] = [], beforeStop?: string, afterStop?: string) =>
    ipcRenderer.invoke('process:start', { command, args, beforeStop, afterStop }),
  stop: (id: string) => ipcRenderer.invoke('process:stop', id),
  restart: (id: string) => ipcRenderer.invoke('process:restart', id),
  remove: (id: string) => ipcRenderer.invoke('process:remove', id),
  writeInput: (id: string, data: string) => ipcRenderer.invoke('process:input', { id, data }),
  getLogs: (id: string) => ipcRenderer.invoke('process:logs:get', id) as Promise<ProcessLogEntry[]>,
  onLogs: (handler: (event: Electron.IpcRendererEvent, payload: ProcessLogEntry) => void) => {
    ipcRenderer.on('process:logs:push', handler)
    return () => ipcRenderer.off('process:logs:push', handler)
  },
  onProcessList: (handler: (event: Electron.IpcRendererEvent, payload: ProcessInfo[]) => void) => {
    ipcRenderer.on('process:list:update', handler)
    return () => ipcRenderer.off('process:list:update', handler)
  },
}

contextBridge.exposeInMainWorld('processAPI', api)

type ProcessAPI = typeof api;

declare global {
  interface Window {
    processAPI: ProcessAPI;
  }
}
