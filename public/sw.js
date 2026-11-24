/*
 * iResume 离线缓存。
 * - 页面（导航请求）：网络优先，离线时用缓存的首页；
 * - /assets/ 下带哈希的构建产物：缓存优先（内容不变）；
 * - 其他同源静态文件：先用缓存，后台更新；
 * - /api/ 与跨域请求（GitHub 同步）一律不经过缓存。
 */
const CACHE = 'iresume-shell-v1'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

const put = async (request, response) => {
  if (response.ok && response.type === 'basic') {
    const c = await caches.open(CACHE)
    await c.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => put('/', res))
        .catch(async () => (await caches.match('/')) ?? Response.error())
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches
        .match(request)
        .then((hit) => hit ?? fetch(request).then((res) => put(request, res)))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => put(request, res))
        .catch(() => hit ?? Response.error())
      return hit ?? network
    })
  )
})
