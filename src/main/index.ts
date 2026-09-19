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
    // 侧栏区域透出桌面毛玻璃（渲染层把侧栏留成透明，主内容区自己铺底色）
    vibrancy: 'sidebar',
    visualEffectState: 'active',
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

// 打包后的 .app 会用 electron-builder.yml 里配置的 productName / build/icon.icns，但 `npm run dev`
// 直接跑的是 Electron 自带的可执行文件：Dock 图标和"关于"面板默认都是 Electron 占位图标，
// 这里手动指定一下。（菜单栏左上角的应用名固定取自可执行文件 Info.plist 的 CFBundleName，
// 开发态无法从代码里改，打包后会自动变成 Muse。）
const devIconPath = join(__dirname, '../../resources/icon.png')
if (!app.isPackaged && process.platform === 'darwin') {
  const icon = nativeImage.createFromPath(devIconPath)
  if (!icon.isEmpty()) app.dock?.setIcon(icon)
}
app.setAboutPanelOptions({
  applicationName: 'Muse',
  applicationVersion: app.getVersion(),
  version: '',
  copyright: '© 2026 Muse',
  ...(app.isPackaged ? {} : { iconPath: devIconPath })
})

app.whenReady().then(() => {
  // 本地下载文件/封面图通过 media:// 协议提供给渲染进程。
  // 渲染进程在开发态是从 http://localhost 加载的，浏览器不允许 http 页面直接读取 file://
  // 资源（图片会挂空、<audio> 播放会静默失败），自定义协议绕开这个限制，生产态同样适用。
  // 补一个 CORS 头：渲染进程要把封面画进 canvas 取主色，跨源图片没有这个头 canvas 会被污染读不出像素。
  protocol.handle(MEDIA_SCHEME, async (request) => {
    const filePath = decodeURIComponent(request.url.replace(`${MEDIA_SCHEME}://local/`, ''))
    const res = await net.fetch(pathToFileURL(filePath).toString())
    const headers = new Headers(res.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    return new Response(res.body, { status: res.status, headers })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
