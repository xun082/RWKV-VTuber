#!/usr/bin/env node

/**
 * 修复 macOS 动态库依赖 - ES 模块版本
 */

import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (context) {
  const { appOutDir, packager } = context;

  if (packager.platform.name !== "mac") {
    console.log("跳过非 macOS 平台");
    return;
  }

  const appPath = path.join(
    appOutDir,
    `${packager.appInfo.productFilename}.app`
  );
  const addonPath = path.join(
    appPath,
    "Contents/Resources/native/whisper/addon.node"
  );

  if (!fs.existsSync(addonPath)) {
    console.warn(`⚠️  未找到 addon.node: ${addonPath}`);
    return;
  }

  console.log(`🔧 修复动态库路径: ${addonPath}`);

  try {
    const dylibDir = path.dirname(addonPath);

    // 第一步：修复addon.node指向libwhisper
    execSync(
      `install_name_tool -add_rpath "@loader_path" "${addonPath}" 2>/dev/null || true`
    );
    execSync(
      `install_name_tool -change "@rpath/libwhisper.1.dylib" "@loader_path/libwhisper.1.dylib" "${addonPath}"`
    );

    // 第二步：修复native/whisper/目录下所有dylib之间的依赖
    const dylibFiles = fs
      .readdirSync(dylibDir)
      .filter((f) => f.endsWith(".dylib"));

    console.log("  🔗 修复native/whisper/下所有dylib的依赖关系...");
    for (const dylib of dylibFiles) {
      const dylibPath = path.join(dylibDir, dylib);

      // 给每个dylib添加 @loader_path 到 rpath
      execSync(
        `install_name_tool -add_rpath "@loader_path" "${dylibPath}" 2>/dev/null || true`
      );

      // 修复dylib对其他dylib的引用（关键：从@rpath改为@loader_path）
      for (const otherDylib of dylibFiles) {
        if (dylib !== otherDylib) {
          execSync(
            `install_name_tool -change "@rpath/${otherDylib}" "@loader_path/${otherDylib}" "${dylibPath}" 2>/dev/null || true`
          );
        }
      }
      console.log(`    ✓ ${dylib}`);
    }

    console.log("✅ 动态库路径修复成功");
  } catch (error) {
    console.error("❌ 修复失败:", error.message);
    throw error;
  }
}
