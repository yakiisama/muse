import { Disc3, Download, Library, Search, Settings } from 'lucide-react'
import { usePlayerStore } from '../store/player'

export type Tab = 'search' | 'library'

interface Props {
  tab: Tab
  onTabChange: (tab: Tab) => void
  onOpenSettings: () => void
}

export default function Sidebar({ tab, onTabChange, onOpenSettings }: Props): React.JSX.Element {
  const downloads = usePlayerStore((s) => s.downloads)
  const activeCount = downloads.filter((d) => d.status === 'downloading').length

  return (
    <aside className="panel mb-3 flex w-60 shrink-0 flex-col gap-1 rounded-2xl px-3 pt-3 pb-4">
      <div className="mb-3 flex items-center gap-2 border-b border-ink/10 px-2 pb-3 pt-6 text-ink/90">
        <Disc3 className="size-5 text-accent" />
        <span className="text-sm font-bold tracking-tight">Muse</span>
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

      <div className="mt-auto flex flex-col gap-1 border-t border-ink/10 pt-3 text-xs text-ink/45">
        <div className="flex items-center gap-1.5 px-2.5 pb-1">
          <Download className="size-3.5 text-brass" />
          <span>{activeCount > 0 ? `${activeCount} 个下载中` : '暂无下载任务'}</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 rounded-md px-3.5 py-2 text-sm text-ink/55 transition-colors hover:bg-ink/8 hover:text-ink/90"
        >
          <Settings className="size-4" />
          设置
        </button>
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
      className={`flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-accent bg-ink/6 text-accent'
          : 'border-transparent text-ink/55 hover:bg-ink/6 hover:text-ink/90'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
