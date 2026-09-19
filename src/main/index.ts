import { app, BrowserWindow, nativeImage, net, protocol, shell } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerIpcHandlers } from './ipc'

const MEDIA_SCHEME = 'media'

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
  }
])

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 860,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f2efe6',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  registerIpcHandlers(win)

  if (is_dev()) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function is_dev(): boolean {
  return !app.isPackaged && !!process.env['ELECTRON_RENDERER_URL']
}

// 打包后的 .app 会用 electron-builder.yml 里配置的 build/icon.icns，但 `npm run dev`
// 直接跑的是 Electron 自带的可执行文件，Dock 图标默认是 Electron 占位图标，这里手动指定一下。
if (!app.isPackaged && process.platform === 'darwin') {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
  if (!icon.isEmpty()) app.dock?.setIcon(icon)
}

app.whenReady().then(() => {
  // 本地下载文件/封面图通过 media:// 协议提供给渲染进程。
  // 渲染进程在开发态是从 http://localhost 加载的，浏览器不允许 http 页面直接读取 file://
  // 资源（图片会挂空、<audio> 播放会静默失败），自定义协议绕开这个限制，生产态同样适用。
  protocol.handle(MEDIA_SCHEME, (request) => {
    const filePath = decodeURIComponent(request.url.replace(`${MEDIA_SCHEME}://local/`, ''))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
