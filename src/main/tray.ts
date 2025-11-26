import { BrowserWindow, Menu, Tray, app, nativeImage } from 'electron'
import path from 'path'
import { ProcessManager } from './processManager'

export function createTray(mainWindowProvider: () => BrowserWindow | null, processManager?: ProcessManager) {
  const iconPath = path.join(__dirname, '../assets', 'tray.png')
  const trayImage = nativeImage.createFromPath(iconPath)

  const tray = new Tray(trayImage)

  // 构建菜单的函数
  const buildMenu = () => {
    const menuItems: any[] = [
      {
        label: 'Show Window',
        click: () => {
          const window = mainWindowProvider()
          if (window) {
            window.show()
          }
        },
      },
    ]

    // 如果提供了 processManager，添加进程列表
    if (processManager) {
      const processes = processManager.list()
      const runningProcesses = processes.filter(p => p.status === 'running')

      if (runningProcesses.length > 0) {
        menuItems.push({ type: 'separator' })
        menuItems.push({
          label: 'Running Processes',
          enabled: false,
        })

        runningProcesses.forEach(process => {
          const label = `${process.command} ${process.args.join(' ')}`.trim()
          const displayLabel = label.length > 50 ? label.substring(0, 47) + '...' : label

          menuItems.push({
            label: `▶ ${displayLabel}`,
            submenu: [
              {
                label: `PID: ${process.pid || 'N/A'}`,
                enabled: false,
              },
              {
                label: 'Stop Process',
                click: () => {
                  processManager.stop(process.id)
                },
              },
              {
                label: 'Restart Process',
                click: () => {
                  processManager.restart(process.id)
                },
              },
            ],
          })
        })
      }
    }

    menuItems.push({ type: 'separator' })
    menuItems.push({
      label: 'Quit',
      click: () => {
        app.quit()
      },
    })

    return Menu.buildFromTemplate(menuItems)
  }

  // 初始化菜单
  tray.setToolTip('Process Launcher')
  tray.setContextMenu(buildMenu())

  // 监听进程列表更新事件，自动刷新菜单
  if (processManager) {
    processManager.on('list:update', () => {
      tray.setContextMenu(buildMenu())
    })
  }

  return tray
}

