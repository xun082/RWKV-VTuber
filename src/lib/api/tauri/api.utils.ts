// Electron/Web 环境使用 window.open
export async function openLink(url: string): Promise<void> {
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
