// YouTube 标题里常见的"官方MV/Official Video"类噪音，夹在括号里或跟在破折号后面
const JUNK_BRACKET_RE =
  /[([【（][^)\]】）]*?(official|mv|m\/v|lyrics?|audio|video|hd|4k|官方|高清|完整版|歌词|字幕)[^)\]】）]*?[)\]】）]/gi
const JUNK_SUFFIX_RE =
  /[-–—]\s*(official\s*(music\s*)?video|official\s*audio|lyrics?\s*video|m\/?v)\s*$/i
const BRACKET_CHARS_RE = /[【】[\]()（）]/g
const EDGE_PUNCT_RE = /^[\s\-–—|:,]+|[\s\-–—|:,]+$/g
export const CJK_RE = /[㐀-鿿぀-ヿ가-힯]/

function stripArtistFromTitle(title: string, artist: string): string {
  if (!artist) return title
  const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return title.replace(new RegExp(escaped, 'gi'), ' ')
}

/** 去掉视频标题里的"官方MV/Official Video"类噪音和重复的艺术家名，得到更接近真实歌名的字符串 */
export function cleanTrackTitle(title: string, artist: string): string {
  let t = stripArtistFromTitle(title, artist)
  t = t.replace(JUNK_BRACKET_RE, ' ').replace(JUNK_SUFFIX_RE, ' ')
  t = t.replace(BRACKET_CHARS_RE, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  return t.replace(EDGE_PUNCT_RE, '').trim()
}

export function scriptSplit(s: string): { cjk: string; latin: string } {
  const cjk: string[] = []
  const latin: string[] = []
  for (const tok of s.split(/\s+/).filter(Boolean)) {
    ;(CJK_RE.test(tok) ? cjk : latin).push(tok)
  }
  return { cjk: cjk.join(' '), latin: latin.join(' ') }
}
