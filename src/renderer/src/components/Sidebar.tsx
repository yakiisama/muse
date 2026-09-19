import { Download, Library, Search, Settings } from 'lucide-react'
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
    <aside className="flex w-52 shrink-0 flex-col gap-0.5 px-3 pt-12 pb-3">
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

      <div className="mt-auto flex flex-col gap-0.5 text-xs text-ink/55">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <Download className={`size-3.5 ${activeCount > 0 ? 'text-accent' : 'text-ink/40'}`} />
          <span>{activeCount > 0 ? `${activeCount} 个下载中` : '暂无下载任务'}</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-ink/75 transition-colors hover:bg-ink/8 hover:text-ink"
        >
          <Settings className="size-4 text-ink/55" />
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
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
        active ? 'bg-ink/10 text-ink' : 'text-ink/75 hover:bg-ink/6 hover:text-ink'
      }`}
    >
      <span className={active ? 'text-accent' : 'text-ink/55'}>{icon}</span>
      {label}
    </button>
  )
}
