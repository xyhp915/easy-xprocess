import { BrowserWindow, IpcMain } from 'electron'
import { ProcessManager } from './processManager'

const sendToAllWindows = (channel: string, payload: unknown) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  })
}

export function registerIPC(ipcMain: IpcMain, manager: ProcessManager) {
  const broadcastProcessList = () => {
    sendToAllWindows('process:list:update', manager.list())
  }

  ipcMain.handle('process:list', () => manager.list())
  ipcMain.handle('process:start', (_event, args: {
    command: string;
    args: string[];
    beforeStop?: string;
    afterStop?: string
  }) => {
    return manager.start(args.command, args.args, args.beforeStop, args.afterStop)
  })
  ipcMain.handle('process:stop', (_event, id: string) => {
    return manager.stop(id)
  })
  ipcMain.handle('process:restart', (_event, id: string) => {
    return manager.restart(id)
  })
  ipcMain.handle('process:remove', (_event, id: string) => manager.remove(id))
  ipcMain.handle('process:logs:get', (_event, id: string) => manager.getLogs(id))
  ipcMain.handle('process:input', (_event, args: { id: string; data: string }) => {
    return manager.writeInput(args.id, args.data)
  })
  ipcMain.handle('process:hook:input', (_event, args: { hookKey: string; data: string }) => {
    return manager.writeHookInput(args.hookKey, args.data)
  })
  ipcMain.handle('process:update', (_event, args: {
    id: string;
    command: string;
    args: string[];
    beforeStop?: string;
    afterStop?: string
  }) => {
    return manager.update(args.id, args.command, args.args, args.beforeStop, args.afterStop)
  })

  manager.on('log', (payload) => {
    sendToAllWindows('process:logs:push', payload)
  })

  manager.on('hook:start', (payload) => {
    sendToAllWindows('process:hook:start', payload)
  })

  manager.on('hook:end', (payload) => {
    sendToAllWindows('process:hook:end', payload)
  })

  manager.on('list:update', broadcastProcessList)
}
