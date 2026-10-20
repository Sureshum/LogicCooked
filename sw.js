// LogicCooked 3D - Service Worker
// Carga la pagina una vez y queda disponible sin conexion (offline-first).

const CACHE_VERSION = 'logiccooked-v15';

// Recursos esenciales que se guardan al instalar.
// Nota: usamos rutas relativas para funcionar en GitHub Pages (subcarpeta del repo).
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './vendor/icon.svg',
    './src/style.css?v=28',
    './src/game.js?v=85',
    './src/landing.js?v=65',
    './src/admin.js?v=2',
    './vendor/tailwind.min.js',
    './vendor/three.min.js',
    './vendor/fontawesome/css/all.min.css',
    './vendor/fonts/fonts.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_VERSION);
        // Cacheamos uno a uno para que un fallo no aborte toda la instalacion.
        await Promise.all(PRECACHE_URLS.map(async (url) => {
            try { await cache.add(new Request(url, { cache: 'reload' })); }
            catch (err) { /* se reintentara en el fetch */ }
        }));
        self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;

    // Navegacion: servir el index cacheado cuando no hay red.
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                const cache = await caches.open(CACHE_VERSION);
                cache.put('./index.html', fresh.clone());
                return fresh;
            } catch (err) {
                const cache = await caches.open(CACHE_VERSION);
                return (await cache.match('./index.html')) ||
                       (await cache.match('./')) ||
                       Response.error();
            }
        })());
        return;
    }

    // Solo cacheamos recursos de nuestro propio origen.
    if (!sameOrigin) return;

    // Cache-first con relleno dinamico: la primera visita guarda todo lo que se usa.
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
            const fresh = await fetch(req);
            if (fresh && (fresh.ok || fresh.type === 'opaque')) {
                cache.put(req, fresh.clone());
            }
            return fresh;
        } catch (err) {
            const fallback = await cache.match(req);
            if (fallback) return fallback;
            throw err;
        }
    })());
});
