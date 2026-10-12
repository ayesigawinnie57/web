const CACHE_NAME = 'majo-shell-v3'
const scopeUrl = new URL(self.registration.scope)
const appUrl = new URL('./', scopeUrl)
const manifestUrl = new URL('manifest.webmanifest', scopeUrl)
const icon192Url = new URL('pwa-192.png', scopeUrl)
const icon512Url = new URL('pwa-512.png', scopeUrl)

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([appUrl.href, manifestUrl.href, icon192Url.href, icon512Url.href]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('majo-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  const requestUrl = new URL(request.url)
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then(cache => cache.put(appUrl, copy))
          }
          return response
        })
        .catch(async () => (await caches.match(appUrl)) ?? Response.error()),
    )
    return
  }

  const assetsPath = new URL('assets/', scopeUrl).pathname
  const isBuiltAsset = requestUrl.pathname.startsWith(assetsPath)
  const isInstallAsset = [manifestUrl.pathname, icon192Url.pathname, icon512Url.pathname]
    .includes(requestUrl.pathname)
  if (!isBuiltAsset && !isInstallAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  })())
})