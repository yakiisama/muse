import { useEffect } from 'react'
import { usePlayerStore } from '../store/player'
import { extractArtworkColor, hslToHex, rgbToHsl } from '../lib/artworkColor'

/**
 * 当前播放曲目换封面时，从封面取主色写进 :root 的 --color-accent，
 * 让播放键 / 当前曲目高亮 / 进度条跟着专辑换色。没封面或取色失败就清掉，回到 CSS 里的默认珊瑚红。
 */
export function useArtworkAccent(): void {
  const artworkUrl = usePlayerStore((s) => s.nowPlaying?.artworkUrl ?? null)

  useEffect(() => {
    const root = document.documentElement
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    let raw: string | null = null
    let canceled = false

    function apply(): void {
      if (!raw) {
        root.style.removeProperty('--color-accent')
        root.style.removeProperty('--color-accent-fg')
        return
      }
      const n = parseInt(raw.slice(1), 16)
      const [h, s, l] = rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255)
      // 封面色直接用往往太浅或太暗，压进一个在各自模式下够对比的区间
      const lightness = dark.matches ? clamp(l, 0.58, 0.72) : clamp(l, 0.36, 0.5)
      const saturation = clamp(s, 0.45, 0.9)
      root.style.setProperty('--color-accent', hslToHex(h, saturation, lightness))
      root.style.setProperty('--color-accent-fg', lightness > 0.6 ? '#1c1c1e' : '#ffffff')
    }

    if (artworkUrl) {
      extractArtworkColor(artworkUrl).then((c) => {
        if (canceled) return
        raw = c
        apply()
      })
    } else {
      apply()
    }

    dark.addEventListener('change', apply)
    return () => {
      canceled = true
      dark.removeEventListener('change', apply)
    }
  }, [artworkUrl])
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
