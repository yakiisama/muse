export interface LyricLine {
  time: number
  text: string
}

const TIME_TAG = /\[(\d{2}):(\d{2})(?:[.:](\d{1,3}))?\]/g

export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  for (const rawLine of lrc.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIME_TAG)]
    if (matches.length === 0) continue
    const text = rawLine.replace(TIME_TAG, '').trim()
    for (const match of matches) {
      const minutes = Number(match[1])
      const seconds = Number(match[2])
      const millis = Number((match[3] ?? '0').padEnd(3, '0'))
      lines.push({ time: minutes * 60 + seconds + millis / 1000, text })
    }
  }
  return lines.sort((a, b) => a.time - b.time)
}

export function activeLyricIndex(lines: LyricLine[], currentTime: number): number {
  let index = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) index = i
    else break
  }
  return index
}
