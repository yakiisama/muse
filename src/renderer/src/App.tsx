import { useEffect, useState } from 'react'
import Sidebar, { type Tab } from './components/Sidebar'
import SearchView from './components/SearchView'
import LibraryView from './components/LibraryView'
import DownloadQueue from './components/DownloadQueue'
import PlayerBar from './components/PlayerBar'
import LyricsPanel from './components/LyricsPanel'
import ImmersivePlayer from './components/ImmersivePlayer'
import SettingsPanel from './components/SettingsPanel'
import Toaster from './components/Toaster'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { usePlayerStore } from './store/player'
import { useToastStore } from './store/toast'

export default function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('search')
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [immersiveOpen, setImmersiveOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const loadLibrary = usePlayerStore((s) => s.loadLibrary)
  const updateDownloadProgress = usePlayerStore((s) => s.updateDownloadProgress)
  const completeDownload = usePlayerStore((s) => s.completeDownload)
  const failDownload = usePlayerStore((s) => s.failDownload)
  const pushToast = useToastStore((s) => s.push)
  const { audioElement, seekTo, seekBy } = useAudioPlayer()

  useEffect(() => {
    loadLibrary()
    const offProgress = window.api.onDownloadProgress((e) =>
      updateDownloadProgress(e.taskId, e.percent, e.eta, e.speed)
    )
    const offDone = window.api.onDownloadDone((e) => {
      completeDownload(e.taskId, e.song)
      pushToast({ type: 'success', message: `下载完成：《${e.song.title}》` })
    })
    const offError = window.api.onDownloadError((e) => {
      failDownload(e.taskId, e.message)
      pushToast({ type: 'error', message: `下载失败：${e.message}` })
    })
    return () => {
      offProgress()
      offDone()
      offError()
    }
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {audioElement}
      <Toaster />
      <div className="h-8 shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <div className="relative flex min-h-0 flex-1 gap-3 px-3">
        <Sidebar tab={tab} onTabChange={setTab} onOpenSettings={() => setSettingsOpen(true)} />
        <main className="relative min-w-0 flex-1 overflow-hidden rounded-[26px]">
          <div className={`h-full ${tab === 'search' ? '' : 'hidden'}`}>
            <SearchView />
          </div>
          <div className={`h-full ${tab === 'library' ? '' : 'hidden'}`}>
            <LibraryView />
          </div>
          <DownloadQueue />
          {lyricsOpen && <LyricsPanel onClose={() => setLyricsOpen(false)} />}
        </main>
      </div>
      <PlayerBar
        lyricsOpen={lyricsOpen}
        onToggleLyrics={() => setLyricsOpen((v) => !v)}
        onOpenImmersive={() => setImmersiveOpen(true)}
        seekTo={seekTo}
        seekBy={seekBy}
      />
      {immersiveOpen && (
        <ImmersivePlayer onClose={() => setImmersiveOpen(false)} seekTo={seekTo} seekBy={seekBy} />
      )}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
