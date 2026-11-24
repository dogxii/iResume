import { toast } from '../ui/toast'

/** 注册离线缓存。仅在生产构建中启用，开发时不缓存任何东西。 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 首次安装不提示；之后换了新版本才提示刷新
    if (!hadController) return
    toast(
      'iResume 有新版本',
      { label: '刷新', run: () => location.reload() },
      10_000
    )
  })
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* 不支持或被禁用：不影响在线使用 */
    })
  })
}
