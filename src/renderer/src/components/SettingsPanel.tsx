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
  const pushToast = useToastStore((s) => s.push)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setDownloadDir(s.downloadDir)
      setAudioQuality(s.audioQuality)
    })
    window.api.getAppVersion().then(setVersion)
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="glass w-[420px] max-w-[calc(100vw-2rem)] rounded-[26px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink/90">设置</p>
          <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-ink/10">
            <X className="size-4 text-ink/60" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <section>
            <p className="mb-2 px-1 text-xs font-medium text-ink/40">下载位置</p>
            <div className="glass-pill rounded-2xl p-3">
              <p className="truncate text-sm text-ink/70" title={downloadDir ?? ''}>
                {downloadDir ?? '加载中…'}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => window.api.openDownloadDir()}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink/90"
                >
                  <FolderOpen className="size-3.5" />
                  打开
                </button>
                <button
                  onClick={handleChangeDir}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink/90"
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
              className="glass-pill w-full rounded-2xl px-3.5 py-2.5 text-sm text-ink/80 outline-none [&>option]:bg-[#f5f4ed] [&>option]:text-ink"
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
            <div className="glass-pill flex items-center justify-between gap-3 rounded-2xl p-3">
              <p className="text-sm text-ink/70">当前版本 v{version || '…'}</p>
              <button
                onClick={handleCheckUpdate}
                disabled={checking}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1.5 text-xs font-medium text-ink/80 transition-colors hover:bg-ink/15 disabled:opacity-50"
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

          <button
            onClick={() => window.api.openExternal('https://github.com/yakiisama/muse')}
            className="flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs text-ink/35 transition-colors hover:text-ink/70"
          >
            <ExternalLink className="size-3.5" />
            在 GitHub 上查看项目
          </button>
        </div>
      </div>
    </div>
  )
}
