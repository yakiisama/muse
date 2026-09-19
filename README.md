# Muse

一体化 macOS 桌面音乐工具：搜索、下载、播放。下载引擎基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp)，歌词来自 [lrclib.net](https://lrclib.net)。仅支持 Apple Silicon（M 系列）Mac。

## 下载

前往 [Releases](https://github.com/yakiisama/muse/releases) 下载最新 DMG。

> 安装包未经 Apple 签名与公证，首次打开会提示「无法验证开发者」：右键点击 App → 打开 → 仍要打开；或终端执行 `xattr -d com.apple.quarantine /Applications/Muse.app`。

## 开发

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build:mac
```

产物在 `dist/` 目录下（dmg + zip，仅 arm64）。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `src/main` | Electron 主进程：yt-dlp 调用、下载队列、本地 JSON 库、歌词查询 |
| `src/preload` | 通过 `contextBridge` 暴露给渲染进程的安全 API |
| `src/renderer` | React 界面 |
| `resources/bin/mac` | 打包进 App 的 yt-dlp / ffmpeg 二进制（不依赖用户本机环境） |
