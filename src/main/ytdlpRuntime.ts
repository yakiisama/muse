import { app } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { getYtDlpPath } from './paths'

/**
 * yt-dlp 的 macOS 独立二进制是 PyInstaller "onefile"：每次启动都把 100 多个 .so 解压到临时目录再逐个
 * dlopen，退出时删掉。新版 macOS 对每个"新落盘"的动态库首次加载都要做一次签名/安全评估，一个上百毫秒，
 * 加起来光启动就要 20 秒——这是试听/搜索"点了半天没反应"的根源。
 *
 * 解决办法：让它解压到我们自己的持久目录并保留下来（预热），之后每次启动都通过 PyInstaller 启动器的
 * "子进程模式"环境变量直接复用这个目录，跳过解压；已评估过的文件系统也不会再评估，启动降到 0.2 秒。
 *
 * 预热的做法：TMPDIR 指到缓存目录跑一次 `--version`，等它打印出版本号（说明解压已完成、Python 已跑起来）
 * 就 SIGKILL 掉，启动器来不及清理，解压目录就留下了；再把它改名成以二进制指纹命名的目录。
 * 二进制换了（设置里更新了 yt-dlp）指纹就变，自动重新预热。任何一步失败都退回到普通启动（只是慢）。
 */

const CHILD_ENV_LEVEL = '1'
const WARMUP_TIMEOUT_MS = 90_000

let inflight: Promise<string | null> | null = null
let inflightKey = ''
const listeners = new Set<(state: 'start' | 'done') => void>()

/** 渲染进程想知道"首次初始化"什么时候开始/结束，用来给提示 */
export function onWarmup(cb: (state: 'start' | 'done') => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function runtimeRoot(): string {
  return join(app.getPath('userData'), 'ytdlp-runtime')
}

/** 二进制指纹：大小 + 修改时间，换了文件就变 */
function binaryKey(bin: string): string {
  const st = statSync(bin)
  return `${st.size}-${Math.floor(st.mtimeMs)}`
}

function existingRuntimeDir(root: string, key: string): string | null {
  const dir = join(root, key)
  try {
    if (statSync(dir).isDirectory() && readdirSync(dir).length > 0) return dir
  } catch {
    // 不存在
  }
  return null
}

/** 清掉旧指纹的运行时目录和残留的临时目录 */
function pruneOthers(root: string, keep: string): void {
  let entries: string[] = []
  try {
    entries = readdirSync(root)
  } catch {
    return
  }
  for (const name of entries) {
    if (name === keep) continue
    rmSync(join(root, name), { recursive: true, force: true })
  }
}

function warmup(bin: string, root: string, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    const tmp = join(root, `tmp-${process.pid}-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    const proc = spawn(bin, ['--version'], { env: { ...process.env, TMPDIR: tmp } })
    let settled = false

    const finish = (dir: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(dir)
    }

    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      rmSync(tmp, { recursive: true, force: true })
      finish(null)
    }, WARMUP_TIMEOUT_MS)

    proc.stdout.once('data', () => {
      // 打印出版本号 = 解压完成。SIGKILL 让启动器跳过退出清理，解压目录得以保留
      proc.kill('SIGKILL')
      proc.once('close', () => {
        try {
          const extracted = readdirSync(tmp).find((n) => n.startsWith('_MEI'))
          if (!extracted) throw new Error('no _MEI dir')
          const target = join(root, key)
          rmSync(target, { recursive: true, force: true })
          renameSync(join(tmp, extracted), target)
          rmSync(tmp, { recursive: true, force: true })
          finish(target)
        } catch (err) {
          console.warn('[ytdlp] warmup failed, falling back to plain spawn', err)
          rmSync(tmp, { recursive: true, force: true })
          finish(null)
        }
      })
    })
    proc.once('error', () => {
      rmSync(tmp, { recursive: true, force: true })
      finish(null)
    })
  })
}

/** 确保当前 yt-dlp 二进制对应的解压目录存在；返回目录路径，预热失败返回 null */
async function ensureRuntime(bin: string): Promise<string | null> {
  const root = runtimeRoot()
  const key = binaryKey(bin)
  const ready = existingRuntimeDir(root, key)
  if (ready) return ready

  if (inflight && inflightKey === key) return inflight
  inflightKey = key
  listeners.forEach((cb) => cb('start'))
  inflight = warmup(bin, root, key).finally(() => {
    inflight = null
    listeners.forEach((cb) => cb('done'))
  })
  const dir = await inflight
  if (dir) pruneOthers(root, key)
  return dir
}

/** 应用启动后先把预热做掉，用户第一次点搜索/试听时就不用等了 */
export function prewarmYtDlp(): void {
  ensureRuntime(getYtDlpPath()).catch(() => {})
}

/** yt-dlp 二进制被替换（设置里更新）后调用，让下一次启动重新预热 */
export function invalidateYtDlpRuntime(): void {
  inflight = null
  inflightKey = ''
}

/** 所有 yt-dlp 调用都走这里：等预热完成后用复用模式启动 */
export async function spawnYtDlp(args: string[]): Promise<ChildProcessWithoutNullStreams> {
  const bin = getYtDlpPath()
  const dir = await ensureRuntime(bin)
  const env = dir
    ? {
        ...process.env,
        _PYI_ARCHIVE_FILE: bin,
        _PYI_PARENT_PROCESS_LEVEL: CHILD_ENV_LEVEL,
        _PYI_APPLICATION_HOME_DIR: dir
      }
    : process.env
  return spawn(bin, args, { env })
}
