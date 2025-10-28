# 自动更新功能使用指南

## 🎯 功能说明

RWKV-VTuber 桌面版已集成 **electron-updater** 自动更新功能，支持从 GitHub Release 自动检查和下载更新。

## ✨ 特性

- ✅ 应用启动时自动检查更新（延迟 5 秒）
- ✅ 每小时自动检查一次更新
- ✅ 发现新版本时弹窗询问是否下载
- ✅ 实时显示下载进度和速度
- ✅ 下载完成后可选择立即重启安装或稍后安装
- ✅ 支持在设置页面手动检查更新

## 🚀 发布新版本流程

### 1. 更新版本号并创建 tag

```bash
# 自动升级版本号、生成 CHANGELOG 并创建 git tag
npm run release:create

# 推送代码和 tag 到 GitHub
npm run release:push
```

### 2. GitHub Actions 自动构建

当你推送 tag 后（如 `v1.2.1`），GitHub Actions 会自动：

1. 编译 TypeScript
2. 构建 Vite 前端
3. 打包 Electron 应用
4. 自动上传到 GitHub Release（**自动发布！**）

### 3. 验证 Release

1. 访问 `https://github.com/xun082/RWKV-VTuber/releases`
2. 查看自动创建的 Release
3. 确认安装包已上传：
   - `RWKV-VTuber-x.x.x-x64-Setup.exe`
   - `RWKV-VTuber-x.x.x-x64-Setup.exe.blockmap`
   - `latest.yml`

### 4. 用户端自动更新

- 用户打开旧版本应用
- 应用自动检测到新版本
- 用户点击"立即下载"
- 下载完成后重启安装

## 🔧 配置说明

### GitHub Token

GitHub Actions 会自动使用 `secrets.GITHUB_TOKEN`，无需手动配置。这是 GitHub 自动提供的 token，具有仓库读写权限。

### 更新服务器配置

更新服务器已在 `electron/auto-updater.ts` 中配置：

```typescript
autoUpdater.setFeedURL({
  provider: "github",
  owner: "xun082", // GitHub 用户名
  repo: "RWKV-VTuber", // 仓库名
});
```

**重要**：如果你 fork 了项目，需要修改这里的 `owner` 为你的 GitHub 用户名。

### 构建配置

`package.json` 中的配置：

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "xun082",
        "repo": "RWKV-VTuber"
      }
    ]
  }
}
```

## 📝 工作流程详解

### CI 构建流程

1. **非 tag 推送**（如正常 commit）

   ```bash
   electron-builder --win --x64 --publish never
   ```

   - 只构建，不发布
   - 用于测试构建流程

2. **tag 推送**（如 `v1.2.1`）
   ```bash
   electron-builder --win --x64 --publish always
   ```
   - 构建并自动发布到 GitHub Release
   - 创建或更新 Release
   - 上传安装包和 `latest.yml` 元数据文件

### 自动更新流程

```
用户端应用启动
    ↓
检查 GitHub Release API
    ↓
对比版本号（当前 vs 最新）
    ↓
如果有新版本 → 显示更新通知
    ↓
用户点击"立即下载"
    ↓
从 GitHub Release 下载安装包
    ↓
显示下载进度
    ↓
下载完成 → 询问是否重启
    ↓
用户点击"立即重启" → 安装新版本
```

## 🔍 故障排查

### 1. 构建时报错 "GitHub Personal Access Token is not set"

**原因**：GitHub Token 未传递给 electron-builder

**解决方案**：

- ✅ 已在 workflow 中添加 `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- ✅ GitHub Actions 会自动提供 `GITHUB_TOKEN`
- ✅ 只在 tag 推送时自动发布

### 2. 应用检测不到更新

**可能原因**：

1. Release 未正确创建
2. `latest.yml` 文件未上传
3. 配置的 owner/repo 不正确

**解决方案**：

1. 检查 GitHub Release 页面是否有新版本
2. 确认 Release 中包含 `.exe` 和 `latest.yml` 文件
3. 检查 `electron/auto-updater.ts` 中的 owner/repo 配置
4. 查看浏览器控制台是否有错误日志

### 3. 下载失败

**可能原因**：

1. 网络问题
2. GitHub Release 文件未上传完整

**解决方案**：

1. 检查网络连接
2. 重新下载或稍后重试
3. 查看 GitHub Release 页面确认文件完整

## 📚 相关文档

- [electron-updater 官方文档](https://www.electron.build/auto-update)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [electron-builder 发布配置](https://www.electron.build/configuration/publish)

## 💡 最佳实践

1. **版本号规范**

   - 使用语义化版本：`major.minor.patch`
   - 新功能：`minor` +1
   - Bug 修复：`patch` +1
   - 破坏性更新：`major` +1

2. **发布流程**

   - 本地测试通过后再发布
   - 使用 `npm run release:create` 自动管理版本
   - 推送 tag 前仔细检查代码

3. **Release 说明**
   - GitHub Actions 会自动生成 Release Notes
   - 也可以手动编辑补充重要更新说明

## 🎉 总结

自动更新功能已完全集成！当你推送新版本 tag 时：

1. ✅ GitHub Actions 自动构建
2. ✅ 自动发布到 GitHub Release
3. ✅ 用户端自动检测更新
4. ✅ 一键下载安装

无需手动上传文件，一切自动化！🚀
