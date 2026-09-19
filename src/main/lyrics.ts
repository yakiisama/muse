import { cleanTrackTitle, scriptSplit } from './titleClean'

export interface LyricsResult {
  plainLyrics: string | null
  syncedLyrics: string | null
}

interface LrcLibRecord {
  trackName: string
  artistName: string
  plainLyrics: string | null
  syncedLyrics: string | null
  instrumental: boolean
}

/**
 * lrclib 对搜索词非常敏感：只要 track_name 里混入几个数据库里没有的英文词
 * （比如视频标题里的字幕翻译、频道名），就会整体查不到任何结果（AND 语义）。
 * 所以这里从原始标题里提炼出几个由粗到细的候选词，依次尝试，命中即停。
 */
function buildCandidates(title: string, artist: string): string[] {
  const cleaned = cleanTrackTitle(title, artist)
  const { cjk, latin } = scriptSplit(cleaned)
  return [...new Set([cleaned, cjk, latin].map((s) => s.trim()).filter(Boolean))]
}

async function searchByTrackName(trackName: string): Promise<LrcLibRecord[]> {
  const url = new URL('https://lrclib.net/api/search')
  url.searchParams.set('track_name', trackName)
  const res = await fetch(url, { headers: { 'User-Agent': 'Muse (personal desktop app)' } })
  if (!res.ok) return []
  const data = (await res.json()) as unknown
  return Array.isArray(data) ? (data as LrcLibRecord[]) : []
}

function pickBest(records: LrcLibRecord[], artist: string): LrcLibRecord | null {
  if (records.length === 0) return null
  const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')
  const a = norm(artist)
  const pool = records.some((r) => r.syncedLyrics) ? records.filter((r) => r.syncedLyrics) : records
  const matched = pool.find((r) => {
    const ra = norm(r.artistName)
    return a.includes(ra) || ra.includes(a)
  })
  return matched ?? pool[0]
}

/** 查询 lrclib.net 开放歌词库，找不到时返回 null（不阻塞播放流程） */
export async function fetchLyrics(title: string, artist: string): Promise<LyricsResult | null> {
  const candidates = buildCandidates(title, artist)
  for (const candidate of candidates) {
    try {
      const best = pickBest(await searchByTrackName(candidate), artist)
      if (best) {
        if (best.instrumental) return { plainLyrics: null, syncedLyrics: null }
        return { plainLyrics: best.plainLyrics, syncedLyrics: best.syncedLyrics }
      }
    } catch {
      // 这个候选词请求失败，继续试下一个
    }
  }
  return null
}
