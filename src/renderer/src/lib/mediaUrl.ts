/** 本地绝对路径 -> media:// 协议 URL，供 <img>/<audio> 读取主进程本地文件（见 src/main/index.ts 的 protocol.handle） */
export function toMediaUrl(path: string): string {
  return `media://local/${encodeURIComponent(path)}`
}
