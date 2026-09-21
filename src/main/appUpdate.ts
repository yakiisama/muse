import { app, net } from 'electron'
import { execFile } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, renameSync, writeSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import type { UpdateCheckResult, UpdateProgressEvent } from '@shared/types'

/**
 * 应用内自更新。没有开发者账号做不了签名/公证，用户从浏览器下载的 DMG 一定带 quarantine 属性，
 * 每个新版本都要重新 xattr 一次。而程序自己用 net.fetch 写到磁盘的文件不会被打这个属性，Gatekeeper
 * 根本不看，所以走"App 自己下载 zip → 解压 → 换掉 /Applications/Muse.app → 重启"这条路，
 * 用户只需要在第一次安装时放行一次。
 *
 * 老的 .app 先改名成 Muse.app.old 留着（当前进程还在从里面按需加载资源），新版本启动后再删。
 */

const REPO = 'yakiisama/muse'
const OLD_SUFFIX = '.old'
const execFileAsync = promisify(execFile)

function isNewerVersion(latest: string, current: string): boolean {
  const parts = (v: string): number[] => v.split('.').map((n) => parseInt(n, 10) || 0)
  const a = parts(latest)
  const b = parts(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()
  // 测试用：指到一个本地 JSON（同 GitHub releases/latest 的字段）就能不发版验证整个流程
  const feed = process.env['MUSE_UPDATE_FEED'] || `https://api.github.com/repos/${REPO}/releases/latest`
  const res = await net.fetch(feed)
  if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`)
  const data = (await res.json()) as {
    tag_name?: string
    html_url?: string
    assets?: { name: string; size: number; browser_download_url: string }[]
  }
  const latestVersion = (data.tag_name ?? '').replace(/^v/, '')
  const zip = data.assets?.find((a) => a.name.endsWith('-arm64-mac.zip'))
  return {
    currentVersion,
    latestVersion,
    hasUpdate: latestVersion.length > 0 && isNewerVersion(latestVersion, currentVersion),
    releaseUrl: data.html_url ?? `https://github.com/${REPO}/releases`,
    // 只有打包后的应用能自更新；老版本 release 没传 zip 的话只能去网页下载
    zipUrl: app.isPackaged && zip ? zip.browser_download_url : null,
    zipSize: zip?.size ?? 0
  }
}

/** 当前运行的 .app 路径（…/Muse.app/Contents/MacOS/Muse 往上三层） */
function currentBundlePath(): string {
  const bundle = resolve(app.getPath('exe'), '..', '..', '..')
  if (!app.isPackaged || !bundle.endsWith('.app')) throw new Error('只有安装后的应用才能自更新')
  if (bundle.includes('/AppTranslocation/')) {
    throw new Error('应用正运行在系统隔离路径下，请先把它拖到「应用程序」文件夹再试')
  }
  return bundle
}

function stagingDir(): string {
  return join(app.getPath('temp'), 'muse-update')
}

/** Electron 把 fs 打了补丁，.asar 文件会被当成目录，fs.rm 递归删到 app.asar 就会卡住；交给 rm 干净 */
async function rmrf(path: string): Promise<void> {
  await execFileAsync('rm', ['-rf', path])
}

async function downloadZip(
  url: string,
  dest: string,
  onProgress: (e: UpdateProgressEvent) => void
): Promise<void> {
  const res = await net.fetch(url)
  if (!res.ok || !res.body) throw new Error(`下载更新失败 (${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  let received = 0
  let lastSent = -1
  // 逐块同步写盘：net.fetch 给的 chunk 底层缓冲区会被复用，交给异步的写流有机会被后面的数据覆盖
  const reader = res.body.getReader()
  const fd = openSync(dest, 'w')
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      writeSync(fd, value)
      received += value.length
      const percent = total > 0 ? Math.floor((received / total) * 100) : 0
      if (percent !== lastSent) {
        lastSent = percent
        onProgress({ phase: 'downloading', percent })
      }
    }
  } finally {
    closeSync(fd)
  }
  if (total > 0 && received !== total) throw new Error('下载不完整，请重试')
}

export async function installUpdate(
  zipUrl: string,
  onProgress: (e: UpdateProgressEvent) => void
): Promise<void> {
  const bundle = currentBundlePath()
  const staging = stagingDir()
  await rmrf(staging)
  mkdirSync(staging, { recursive: true })

  const zipPath = join(staging, 'update.zip')
  await downloadZip(zipUrl, zipPath, onProgress)

  onProgress({ phase: 'installing', percent: 100 })
  // ditto 能正确还原 .app 里的符号链接（Frameworks 里一堆），比 unzip 稳
  const extracted = join(staging, 'extracted')
  await execFileAsync('ditto', ['-x', '-k', zipPath, extracted])
  const appName = readdirSync(extracted).find((n) => n.endsWith('.app'))
  if (!appName) throw new Error('更新包里没有找到应用')
  const newBundle = join(extracted, appName)
  const exeName = basename(app.getPath('exe'))
  if (!existsSync(join(newBundle, 'Contents', 'MacOS', exeName))) {
    throw new Error('更新包内容不完整')
  }
  // 保险起见把可能带上的隔离属性清掉，不然又要手动放行
  await execFileAsync('xattr', ['-rd', 'com.apple.quarantine', newBundle]).catch(() => {})

  // 换包：老的先挪开，新的挪进来；新的挪不进来就把老的放回去
  const oldBundle = bundle + OLD_SUFFIX
  await rmrf(oldBundle)
  renameSync(bundle, oldBundle)
  try {
    renameSync(newBundle, bundle)
  } catch (err) {
    renameSync(oldBundle, bundle)
    throw new Error(
      `无法写入 ${dirname(bundle)}：${err instanceof Error ? err.message : String(err)}`
    )
  }
  await rmrf(staging)

  // process.execPath 还指着老路径（已改名成 .old），必须显式用新的
  app.relaunch({ execPath: join(bundle, 'Contents', 'MacOS', exeName) })
  app.exit(0)
}

/** 上个版本更新时留下的 Muse.app.old，启动后清掉 */
export function cleanupOldBundle(): void {
  if (!app.isPackaged) return
  try {
    const old = currentBundlePath() + OLD_SUFFIX
    if (existsSync(old)) rmrf(old).catch((err) => console.error('清理旧版本失败', err))
  } catch {
    // 不在 .app 里跑，没什么可清的
  }
}
