import { useEffect, useState } from 'react'
import { ExternalLink, FolderOpen, Loader2, Pencil, RefreshCw, X } from 'lucide-react'
import type { AudioQuality } from '@shared/types'
import { useToastStore } from '../store/toast'

interface Props {
  onClose: () => void
}

const QUALITY_LABELS: Record<AudioQuality, string> = {
  '128K': '标准 · 128kbps',
  '192K': '高品质 · 192kbps',
  '320K': '极高 · 320kbps'
}

export default function SettingsPanel({ onClose }: Props): React.JSX.Element {
  const [downloadDir, setDownloadDir] = useState<string | null>(null)
  const [audioQuality, setAudioQuality] = useState<AudioQuality | null>(null)
  const [version, setVersion] = useState('')
  const [checking, setChecking] = useState(false)
  const [ytdlpVersion, setYtdlpVersion] = useState('')
  const [ytdlpChecking, setYtdlpChecking] = useState(false)
  const pushToast = useToastStore((s) => s.push)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setDownloadDir(s.downloadDir)
      setAudioQuality(s.audioQuality)
    })
    window.api.getAppVersion().then(setVersion)
    window.api.getYtDlpVersion().then(setYtdlpVersion).catch(() => setYtdlpVersion('未知'))
  }, [])

  async function handleChangeDir(): Promise<void> {
    const prevDir = downloadDir
    const s = await window.api.chooseDownloadDir()
    setDownloadDir(s.downloadDir)
    if (s.downloadDir !== prevDir) {
      pushToast({ type: 'success', message: '下载目录已更新' })
    }
  }

  async function handleQualityChange(quality: AudioQuality): Promise<void> {
    setAudioQuality(quality)
    await window.api.setAudioQuality(quality)
    pushToast({ type: 'success', message: `下载音质已设为「${QUALITY_LABELS[quality]}」，对之后的下载生效` })
  }

  async function handleCheckUpdate(): Promise<void> {
    setChecking(true)
    try {
      const res = await window.api.checkForUpdates()
      if (res.hasUpdate) {
        pushToast(
          {
            type: 'info',
            message: `发现新版本 v${res.latestVersion}（当前 v${res.currentVersion}）`,
            actionLabel: '前往下载',
            onAction: () => window.api.openExternal(res.releaseUrl)
          },
          { sticky: true }
        )
      } else {
        pushToast({ type: 'success', message: '已是最新版本' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast({ type: 'error', message: `检查更新失败：${message}` })
    } finally {
      setChecking(false)
    }
  }

  async function handleUpdateYtDlp(downloadUrl: string): Promise<void> {
    try {
      const res = await window.api.updateYtDlp(downloadUrl)
      setYtdlpVersion(res.version)
      pushToast({ type: 'success', message: `下载引擎已更新到 ${res.version}` })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast({ type: 'error', message: `更新下载引擎失败：${message}` })
    }
  }

  async function handleCheckYtDlpUpdate(): Promise<void> {
    setYtdlpChecking(true)
    try {
      const res = await window.api.checkYtDlpUpdate()
      if (res.hasUpdate) {
        pushToast(
          {
            type: 'info',
            message: `下载引擎有新版本 ${res.latestVersion}（当前 ${res.currentVersion || '未知'}）`,
            actionLabel: '立即更新',
            onAction: () => handleUpdateYtDlp(res.downloadUrl)
          },
          { sticky: true }
        )
      } else {
        pushToast({ type: 'success', message: '下载引擎已是最新版本' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast({ type: 'error', message: `检查下载引擎更新失败：${message}` })
    } finally {
      setYtdlpChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="panel w-[420px] max-w-[calc(100vw-2rem)] rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3">
          <p className="text-sm font-bold tracking-tight text-ink/90">设置</p>
          <button onClick={onClose} className="rounded-md p-1.5 transition-colors hover:bg-ink/10">
            <X className="size-4 text-ink/60" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <section>
            <p className="mb-2 px-1 text-xs font-medium text-ink/40">下载位置</p>
            <div className="panel-sm rounded-lg p-3">
              <p className="truncate text-sm text-ink/70" title={downloadDir ?? ''}>
                {downloadDir ?? '加载中…'}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => window.api.openDownloadDir()}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink/90"
                >
                  <FolderOpen className="size-3.5" />
                  打开
                </button>
                <button
                  onClick={handleChangeDir}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink/90"
                >
                  <Pencil className="size-3.5" />
                  更改
                </button>
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 px-1 text-xs font-medium text-ink/40">下载音质</p>
            <select
              value={audioQuality ?? ''}
              onChange={(e) => handleQualityChange(e.target.value as AudioQuality)}
              className="panel-sm w-full rounded-lg px-3.5 py-2.5 text-sm text-ink/80 outline-none [&>option]:bg-paper [&>option]:text-ink"
            >
              {(Object.keys(QUALITY_LABELS) as AudioQuality[]).map((q) => (
                <option key={q} value={q}>
                  {QUALITY_LABELS[q]}
                </option>
              ))}
            </select>
          </section>

          <section>
            <p className="mb-2 px-1 text-xs font-medium text-ink/40">更新</p>
            <div className="panel-sm flex items-center justify-between gap-3 rounded-lg p-3">
              <p className="text-sm text-ink/70">当前版本 v{version || '…'}</p>
              <button
                onClick={handleCheckUpdate}
                disabled={checking}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/80 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
              >
                {checking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                检查更新
              </button>
            </div>
          </section>

          <section>
            <p className="mb-2 px-1 text-xs font-medium text-ink/40">下载引擎（yt-dlp）</p>
            <div className="panel-sm flex items-center justify-between gap-3 rounded-lg p-3">
              <div>
                <p className="text-sm text-ink/70">{ytdlpVersion || '读取中…'}</p>
                <p className="text-xs text-ink/40">
                  YouTube 改版时可能导致搜索/下载失败，遇到问题可以先试试更新它
                </p>
              </div>
              <button
                onClick={handleCheckYtDlpUpdate}
                disabled={ytdlpChecking}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/80 transition-colors hover:border-brass/60 hover:text-brass disabled:opacity-50"
              >
                {ytdlpChecking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                检查更新
              </button>
            </div>
          </section>

          <button
            onClick={() => window.api.openExternal('https://github.com/yakiisama/muse')}
            className="flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-ink/35 transition-colors hover:text-ink/70"
          >
            <ExternalLink className="size-3.5" />
            在 GitHub 上查看项目
          </button>
        </div>
      </div>
    </div>
  )
}
