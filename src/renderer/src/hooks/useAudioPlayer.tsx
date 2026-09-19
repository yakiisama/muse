import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/player'

export interface AudioControls {
  audioElement: React.JSX.Element
  seekTo: (value: number) => void
  seekBy: (delta: number) => void
}

/**
 * 唯一的 <audio> 实例挂在这里，PlayerBar（迷你条）和 ImmersivePlayer（沉浸式全屏）
 * 共用同一份播放状态，只是通过这里返回的 seekTo/seekBy 去操作它，避免出现两个
 * <audio> 元素同时播放。
 */
export function useAudioPlayer(): AudioControls {
  const audioRef = useRef<HTMLAudioElement>(null)
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const duration = usePlayerStore((s) => s.duration)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const next = usePlayerStore((s) => s.next)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !nowPlaying) return
    audio.src = nowPlaying.audioSrc
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [nowPlaying?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !nowPlaying) return
    if (isPlaying) audio.play().catch(() => {})
    else audio.pause()
  }, [isPlaying, nowPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
  }, [volume])

  function seekTo(value: number): void {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setProgress(value, duration)
  }

  function seekBy(delta: number): void {
    const audio = audioRef.current
    if (!audio) return
    const target = Math.min(Math.max(audio.currentTime + delta, 0), audio.duration || 0)
    audio.currentTime = target
    setProgress(target, duration)
  }

  const audioElement = (
    <audio
      ref={audioRef}
      onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime, e.currentTarget.duration)}
      onLoadedMetadata={(e) => setProgress(e.currentTarget.currentTime, e.currentTarget.duration)}
      onEnded={next}
    />
  )

  return { audioElement, seekTo, seekBy }
}
