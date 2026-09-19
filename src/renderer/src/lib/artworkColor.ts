const SAMPLE = 32
const cache = new Map<string, string | null>()

/**
 * 从封面图里取一个"有代表性又能当强调色用"的颜色，返回 #rrggbb；取不到返回 null。
 * 用 canvas 缩到 32×32 后读像素；https 缩略图靠 crossOrigin + 对方的 CORS 头，
 * media:// 本地封面靠主进程 protocol.handle 里补的 Access-Control-Allow-Origin。
 */
export async function extractArtworkColor(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url)!
  let color: string | null = null
  try {
    color = pickColor(await loadPixels(url))
  } catch {
    color = null
  }
  if (cache.size > 200) cache.clear()
  cache.set(url, color)
  return color
}

function loadPixels(url: string): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = SAMPLE
      canvas.height = SAMPLE
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return reject(new Error('no 2d context'))
      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE)
      resolve(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data)
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

function pickColor(data: Uint8ClampedArray): string | null {
  // 按色相分 12 桶，只统计"有颜色"的像素（去掉太暗 / 太亮 / 太灰的），
  // 取像素最多的那个桶的加权平均色，这样黑白封面上的一抹红也能被挑出来。
  const buckets = Array.from({ length: 12 }, () => ({ r: 0, g: 0, b: 0, n: 0, w: 0 }))
  const fallback = { r: 0, g: 0, b: 0, n: 0 }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (data[i + 3] < 128) continue
    fallback.r += r
    fallback.g += g
    fallback.b += b
    fallback.n++
    const [h, s, l] = rgbToHsl(r, g, b)
    if (s < 0.25 || l < 0.12 || l > 0.9) continue
    const bucket = buckets[Math.floor(h * 12) % 12]
    const w = s * (1 - Math.abs(l - 0.5))
    bucket.r += r * w
    bucket.g += g * w
    bucket.b += b * w
    bucket.w += w
    bucket.n++
  }
  const best = buckets.reduce((a, b) => (b.n > a.n ? b : a))
  if (best.n >= 4 && best.w > 0) {
    return toHex(best.r / best.w, best.g / best.w, best.b / best.w)
  }
  if (fallback.n === 0) return null
  return toHex(fallback.r / fallback.n, fallback.g / fallback.n, fallback.b / fallback.n)
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}

export function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number): string => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number): string =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
