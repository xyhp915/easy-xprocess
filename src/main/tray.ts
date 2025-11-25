import { BrowserWindow, Menu, Tray, app, nativeImage } from 'electron';
import path from 'path';

export function createTray(mainWindowProvider: () => BrowserWindow | null) {
  const iconPath = path.join(app.getAppPath(), 'assets', 'trayTemplate.png');
  const trayImage = nativeImage.createFromPath(iconPath);
  const tray = new Tray(trayImage);
  const menu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        const window = mainWindowProvider();
        if (window) {
          window.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setToolTip('Process Launcher');
  tray.setContextMenu(menu);
  return tray;
}

