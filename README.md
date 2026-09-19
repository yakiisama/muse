# Muse

搜索、下载、播放一体的 macOS 桌面音乐工具。下载引擎基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp)，歌词来自 [lrclib.net](https://lrclib.net)。

## 开发

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build:mac
```

产物在 `dist/` 目录下（dmg + zip，**仅 Apple Silicon / arm64**，不构建 Intel 版本）。Intel Mac 用户双击打开时，macOS 会自动弹出系统原生提示「Muse 不支持此 Mac」，不需要我们额外处理；分发时建议提前注明「仅支持 M 芯片 Mac」。

由于没有 Apple 开发者账号，安装包**未经公证**，Apple Silicon 用户首次打开时会看到「无法验证开发者」的提示，需要：

- 右键点击 App → 打开，在弹窗里点「仍要打开」；或
- 终端执行：`xattr -d com.apple.quarantine /Applications/Muse.app`

## 目录结构

- `src/main` — Electron 主进程：yt-dlp 调用、下载队列、本地 JSON 库、歌词查询
- `src/preload` — 通过 `contextBridge` 暴露给渲染进程的安全 API
- `src/renderer` — React 界面
- `resources/bin/mac` — 打包进 App 的 yt-dlp / ffmpeg 二进制（不依赖用户本机环境）
