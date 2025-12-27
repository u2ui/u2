import './url-change-event.js';

/**
 * Smart Client-Side Router mit intelligentem Prefetching
 * 
 * Verwendung:
 * <script type="module" src="router.js"></script>
 */

// ==================== CONFIG ====================
const CONFIG = {
  cacheSize: 50,
  prefetchDelay: 100,
  mouseProximity: 200,
  cacheDuration: 3 * 60 * 60 * 1000, // 3 Stunden
  cacheVersion: 'v1',
};

// ==================== STATE ====================
const state = {
  pageCache: new Map(),
  prefetchQueue: new Set(),
  mouse: { x: 0, y: 0 },
  isIdle: false,
  idleTimer: null,
  persistentCache: null,
  abortController: null,
};

// ==================== PERSISTENT STORAGE ====================
class PersistentStorage {
  static async init() {
    if ('caches' in globalThis) {
      state.persistentCache = await caches.open(`router-cache-${CONFIG.cacheVersion}`);
      return 'Cache API';
    }
    state.persistentCache = 'localStorage';
    return 'localStorage';
  }
  
  static async get(url) {
    const now = performance.now() + performance.timeOrigin;
    
    if (state.persistentCache === 'localStorage') {
      try {
        const item = localStorage.getItem(`router:${url}`);
        if (!item) return null;
        
        const data = JSON.parse(item);
        if (now - data.timestamp > CONFIG.cacheDuration) {
          localStorage.removeItem(`router:${url}`);
          return null;
        }
        return data.html;
      } catch {
        return null;
      }
    }
    
    // Cache API
    try {
      const response = await state.persistentCache.match(url);
      if (!response) return null;
      
      const timestamp = Number(response.headers.get('X-Cached-Time') ?? '0');
      if (now - timestamp > CONFIG.cacheDuration) {
        await state.persistentCache.delete(url);
        return null;
      }
      
      return await response.text();
    } catch {
      return null;
    }
  }
  
  static async set(url, html) {
    const now = performance.now() + performance.timeOrigin;
    
    if (state.persistentCache === 'localStorage') {
      try {
        const data = { html, timestamp: now };
        localStorage.setItem(`router:${url}`, JSON.stringify(data));
        this.cleanup();
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          this.cleanup(true);
        }
      }
      return;
    }
    
    // Cache API
    try {
      const response = new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Cached-Time': String(now),
        },
      });
      await state.persistentCache.put(url, response);
    } catch (error) {
      console.warn('Cache write failed:', error);
    }
  }
  
  static cleanup(force = false) {
    if (state.persistentCache !== 'localStorage') return;
    
    const now = performance.now() + performance.timeOrigin;
    const keys = Object.keys(localStorage).filter(k => k.startsWith('router:'));
    
    for (const key of keys) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (force || now - item.timestamp > CONFIG.cacheDuration) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }
}

// ==================== DOM MORPHING (IdleCallback optimiert) ====================
class Morph {
  static morph(oldNode, newNode) {
    if (oldNode.nodeType === Node.TEXT_NODE) {
      if (oldNode.nodeValue !== newNode.nodeValue) {
        oldNode.nodeValue = newNode.nodeValue;
      }
      return;
    }
    this.#morphAttributes(oldNode, newNode);
    this.#morphChildren(oldNode, newNode);
  }
  
  static #morphAttributes(oldNode, newNode) {
    const oldAttrs = oldNode.attributes;
    const newAttrs = newNode.attributes;
    if (newAttrs) { // Update/Add attributes
      for (const attr of newAttrs) {
        if (oldNode.getAttribute(attr.name) !== attr.value) oldNode.setAttribute(attr.name, attr.value);
      }
    }
    if (oldAttrs) { // Remove old attributes
      for (let i = oldAttrs.length - 1; i >= 0; i--) {
        const attr = oldAttrs[i];
        if (!newNode.hasAttribute(attr.name)) oldNode.removeAttribute(attr.name);
      }
    }
  }
  static #morphChildren(oldNode, newNode) {
    const oldChildren = [...oldNode.childNodes];
    const newChildren = [...newNode.childNodes];
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];
      
      if (!oldChild && newChild) {
        oldNode.append(newChild);
      } else if (oldChild && !newChild) {
        oldNode.removeChild(oldChild);
      } else if (oldChild && newChild) {
        if (this.#shouldReplace(oldChild, newChild)) {
          oldNode.replaceChild(newChild, oldChild);
        } else {
          this.morph(oldChild, newChild);
        }
      }
    }
  }
  static #shouldReplace(oldNode, newNode) {
    if (oldNode.nodeType !== newNode.nodeType) return true;
    if (oldNode.nodeType === Element.TEXT_NODE) return oldNode.textContent !== newNode.textContent;
    if (oldNode.tagName !== newNode.tagName) return true;
    return oldNode.id !== newNode.id;
  }
}

// ==================== UTILITIES ====================
const Utils = {
    isInternalLink(url) {
        try {
            const link = new URL(url, location.origin);
            return link.origin === location.origin;
        } catch {
            return false;
        }
    },
    getDistance(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    },
    idlePromise(options) {
        return new Promise(resolve => {
            if ('requestIdleCallback' in globalThis) {
                requestIdleCallback(resolve, options);
            } else {
                setTimeout(resolve, 1);
            }
        });
    },
};

// ==================== CACHE MANAGEMENT ====================
class CacheManager {
  static addToCache(url, html) {
    if (state.pageCache.size >= CONFIG.cacheSize) {
      const firstKey = state.pageCache.keys().next().value;
      state.pageCache.delete(firstKey);
    }
    
    state.pageCache.set(url, html);
    PersistentStorage.set(url, html);
  }
  
  static async fetchPage(url) {
    // 1. Memory Cache
    if (state.pageCache.has(url)) {
      return state.pageCache.get(url);
    }
    
    // 2. Persistent Storage
    const cachedHtml = await PersistentStorage.get(url);
    if (cachedHtml) {
      state.pageCache.set(url, cachedHtml);
      return cachedHtml;
    }
    
    // 3. Network (mit AbortController)
    try {
      state.abortController = new AbortController();
      const response = await fetch(url, {
        signal: state.abortController.signal,
        headers: { 'X-Requested-With': 'SmartRouter' },
      });
      
      
      if (!response.ok) {
        if (response.status === 404) return null; // todo: 404 will try again and again
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      this.addToCache(url, html);
      return html;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted:', url);
      } else {
        console.error('Fetch failed:', url, error);
      }
      return null;
    }
  }
}

// ==================== PAGE NAVIGATION ====================
async function loadPage(url, shouldUpdateHistory = true) {
    const html = await CacheManager.fetchPage(url);
    if (!html) {
        location.href = url;
        return;
    }
    
    // Parse mit DOMParser
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    
    // Update document
    document.title = newDoc.title;
    
    // Morph Body
    // am liebsten würde ich ganzes dokument inklusive header morphen, aber dann kann generiertes css verloren gehen... :(
    const oldRoot = document.body;
    const newRoot = newDoc.body;
    
    if ('startViewTransition' in document) { // hm... macht, dass hover status kurz verloren geht!
        document.startViewTransition(() => {
            Morph.morph(oldRoot, newRoot);
        });
    } else Morph.morph(oldRoot, newRoot);
    
    if (shouldUpdateHistory) history.pushState({ url }, '', url);

    scrollTo({ top: 0, behavior: 'instant' });
    
    Prefetch.scheduleIdlePrefetch();
}

// ==================== PREFETCHING ====================
class Prefetch {
    static getAllInternalLinks() {
        const links = [];

        for (const link of document.querySelectorAll('a[href]')) {
            const href = link.href;
            if (!href || !Utils.isInternalLink(href)) continue;

            const url = new URL(href, location.origin).href;
            if (state.pageCache.has(url)) continue;

            const rect = link.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Utils.getDistance(state.mouse.x, state.mouse.y, centerX, centerY);

            links.push({ url, distance, element: link });
        }

        return links;
    }

    static async prefetchLinks() {
        if (!state.isIdle) return;

        const links = this.getAllInternalLinks();
        links.sort((a, b) => a.distance - b.distance);

        // Priority: Links nahe der Maus
        const nearbyLinks = links.filter(l => l.distance < CONFIG.mouseProximity);
        const otherLinks = links.filter(l => l.distance >= CONFIG.mouseProximity);

        // Prefetch
        for (const link of nearbyLinks.slice(0, 3)) {
            if (!state.isIdle || state.prefetchQueue.has(link.url)) continue;
            await Utils.idlePromise({ timeout: 2000 });
            state.prefetchQueue.add(link.url);
            await CacheManager.fetchPage(link.url);
            state.prefetchQueue.delete(link.url);
        }

        // Rest der Links (rate-limited)
        for (const link of otherLinks.slice(0, 10)) {
            if (!state.isIdle || state.prefetchQueue.has(link.url)) break;
            await Utils.idlePromise({ timeout: 2000 });
            state.prefetchQueue.add(link.url);
            await CacheManager.fetchPage(link.url);
            state.prefetchQueue.delete(link.url);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    static scheduleIdlePrefetch() {
        clearTimeout(state.idleTimer);
        state.isIdle = false;

        state.idleTimer = setTimeout(() => {
            state.isIdle = true;
            this.prefetchLinks();
        }, CONFIG.prefetchDelay);
    }
}

// ==================== EVENT HANDLERS ====================
class EventHandlers {
    static setupLinkInterception() {
        document.addEventListener('click', (e) => {
            if (e.ctrlKey || e.shiftKey) return;

            const link = e.target.closest('a');
            const href = link?.href;

            if (!href || link.target || !Utils.isInternalLink(href)) return;

            const sameDoc = location.href.replace(/#.*$/, '') === href.replace(/#.*$/, '');

            if (link.hash && sameDoc) return; // same document, but hash-link: don't preventDefault
            e.preventDefault();
            if (sameDoc) return; // same document, nothing to load, but prevent reload

            loadPage(link.href);

        }, { passive: false });
    }

    static setupHistoryNavigation() {
        addEventListener('popstate', (e) => {
            if (e.state === null) return; // hash-links only? ok?
            if (e.state.source === 'u2-target') { // todo, make it generic
              console.log('new url handled by u2-navigable');
              return;
            }
            const url = e.state?.url ?? location.href;
            // todo: from hash-link to same document without hash, it is should not load
            loadPage(url, false);
        });
    }

    static setupMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
        }, { passive: true });
    }

    static setupIdleDetection() {
        for (const event of ['scroll', 'mousemove', 'keydown', 'click', 'touchstart']) {
            addEventListener(event, () => Prefetch.scheduleIdlePrefetch(), {
                passive: true
            });
        }
    }
}

// ==================== INITIALIZATION ====================
async function init() {
  // Persistent Storage
  const storageType = await PersistentStorage.init();
  //console.log(`🚀 Smart Router initialized (${storageType})`);
  
  // Cleanup
  PersistentStorage.cleanup();
  
  // Cache current page
  CacheManager.addToCache(location.href, document.documentElement.outerHTML);
  
  // History state
  history.replaceState({ url: location.href }, '', location.href);
  
  // Event listeners
  EventHandlers.setupLinkInterception();
  EventHandlers.setupHistoryNavigation();
  EventHandlers.setupMouseTracking();
  EventHandlers.setupIdleDetection();
  
  // Start prefetching
  Prefetch.scheduleIdlePrefetch();
}

// Auto-init
init();
