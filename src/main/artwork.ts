import NodeID3 from 'node-id3'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getArtworkDir } from './paths'

/** 从已下载的 mp3 里取出 yt-dlp 内嵌的封面，落地为独立图片文件供 UI 直接引用 */
export function extractArtwork(mp3Path: string, songId: string): string | null {
  try {
    const tags = NodeID3.read(mp3Path)
    const image = tags.image
    if (!image || typeof image === 'string' || !image.imageBuffer) return null

    mkdirSync(getArtworkDir(), { recursive: true })
    const ext = image.mime?.includes('png') ? 'png' : 'jpg'
    const artPath = join(getArtworkDir(), `${songId}.${ext}`)
    writeFileSync(artPath, image.imageBuffer)
    return artPath
  } catch (err) {
    console.error('[artwork] 提取封面失败', mp3Path, err)
    return null
  }
}
