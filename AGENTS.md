# AGENTS.md

## 项目

Muse — Electron 桌面音乐搜索/下载/播放工具，下载引擎基于 yt-dlp，歌词来自 lrclib.net。仅支持 Apple Silicon / arm64 macOS。

仓库：https://github.com/yakiisama/muse（公开），GitHub 账号 `yakiisama`。

## 发布新版本（GitHub Release + DMG）

发布是全自动的：推送一个 `vX.Y.Z` 格式的 tag，GitHub Actions（`.github/workflows/release.yml`）会自动在 macOS arm64 runner 上构建 DMG，并把它作为该 tag 对应 Release 的附件上传，不需要在本地手动打包上传。

```bash
git add -A && git commit -m "..."
git push
git tag vX.Y.Z
git push origin vX.Y.Z
```

工作流内部执行的是 `npm run build && npx electron-builder --mac --arm64 --publish never`，再由 `softprops/action-gh-release` 创建/更新 Release 并上传 `dist/*.dmg`。

对 electron-builder 显式传 `--publish never` 是因为：CI 中检测到 tag 时它会尝试自己发布到 GitHub，但没有配置 `GH_TOKEN` 会直接报错「GitHub Personal Access Token is not set」，所以让上传这一步完全交给 `softprops/action-gh-release`，不要改回 `npm run build:mac`（那是本地开发用的脚本，不带 `--publish never`）。

## 二进制资源

`resources/bin/mac` 下的 yt-dlp（~35M）/ ffmpeg（~43M）二进制直接提交进 git 仓库（在 GitHub 单文件 100M 限制内），CI 不会重新下载，不要把它们加进 .gitignore 或当作构建产物清理掉。
