import { useEffect, useState } from 'react'
import { Disc3, Download, FolderOpen, Library, Pencil, Search } from 'lucide-react'
import type { AudioQuality } from '@shared/types'
import { usePlayerStore } from '../store/player'

export type Tab = 'search' | 'library'

interface Props {
  tab: Tab
  onTabChange: (tab: Tab) => void
}

const QUALITY_LABELS: Record<AudioQuality, string> = {
  '128K': '标准 · 128kbps',
  '192K': '高品质 · 192kbps',
  '320K': '极高 · 320kbps'
}

export default function Sidebar({ tab, onTabChange }: Props): React.JSX.Element {
  const downloads = usePlayerStore((s) => s.downloads)
  const activeCount = downloads.filter((d) => d.status === 'downloading').length
  const [downloadDir, setDownloadDir] = useState<string | null>(null)
  const [audioQuality, setAudioQualityState] = useState<AudioQuality | null>(null)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setDownloadDir(s.downloadDir)
      setAudioQualityState(s.audioQuality)
    })
  }, [])

  async function handleChangeDir(): Promise<void> {
    const s = await window.api.chooseDownloadDir()
    setDownloadDir(s.downloadDir)
  }

  async function handleQualityChange(quality: AudioQuality): Promise<void> {
    setAudioQualityState(quality)
    await window.api.setAudioQuality(quality)
  }

  return (
    <aside className="glass mb-3 flex w-60 shrink-0 flex-col gap-1 rounded-[26px] px-3 pt-3 pb-4">
      <div className="mb-3 flex items-center gap-2 px-2 pt-6 text-ink/90">
        <Disc3 className="size-5 text-accent-soft drop-shadow-[0_0_12px_rgba(218,119,86,0.5)]" />
        <span className="text-sm font-semibold tracking-wide">Muse</span>
      </div>

      <NavItem
        icon={<Search className="size-4" />}
        label="搜索"
        active={tab === 'search'}
        onClick={() => onTabChange('search')}
      />
      <NavItem
        icon={<Library className="size-4" />}
        label="音乐库"
        active={tab === 'library'}
        onClick={() => onTabChange('library')}
      />

      <div className="mt-auto flex flex-col gap-2 px-1 pt-3 text-xs text-ink/45">
        <div className="flex items-center gap-1.5 px-1">
          <Download className="size-3.5" />
          <span>{activeCount > 0 ? `${activeCount} 个下载中` : '暂无下载任务'}</span>
        </div>

        <div className="glass-pill rounded-2xl p-2.5">
          <p className="mb-1 text-ink/35">下载位置</p>
          <p className="truncate text-ink/70" title={downloadDir ?? ''}>
            {downloadDir ?? '加载中…'}
          </p>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => window.api.openDownloadDir()}
              className="flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-ink/10 hover:text-ink/85"
            >
              <FolderOpen className="size-3.5" />
              打开
            </button>
            <button
              onClick={handleChangeDir}
              className="flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-ink/10 hover:text-ink/85"
            >
              <Pencil className="size-3.5" />
              更改
            </button>
          </div>
        </div>

        <div className="glass-pill rounded-2xl p-2.5">
          <p className="mb-1.5 text-ink/35">下载音质</p>
          <select
            value={audioQuality ?? ''}
            onChange={(e) => handleQualityChange(e.target.value as AudioQuality)}
            className="w-full rounded-lg bg-transparent py-0.5 text-ink/80 outline-none [&>option]:bg-[#f5f4ed] [&>option]:text-ink"
          >
            {(Object.keys(QUALITY_LABELS) as AudioQuality[]).map((q) => (
              <option key={q} value={q}>
                {QUALITY_LABELS[q]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm transition-all ${
        active
          ? 'glass-pill text-accent-soft shadow-[0_0_20px_-4px_rgba(218,119,86,0.45)]'
          : 'text-ink/55 hover:bg-ink/8 hover:text-ink/90'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
