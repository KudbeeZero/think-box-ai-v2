/**
 * Shared UI helpers for the Apple-style polish layer
 * (command palette, theme switcher, shortcuts reference, notification center).
 * No backend access; storage failures degrade silently.
 */
(function () {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

  const KEY_GLYPHS = {
    mod: isMac ? '⌘' : 'Ctrl',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift',
    enter: '↵',
    escape: 'Esc',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  };

  const KEY_WORDS = {
    mod: isMac ? 'Cmd' : 'Ctrl',
    alt: isMac ? 'Option' : 'Alt',
    shift: 'Shift',
    enter: 'Enter',
    escape: 'Esc',
    arrowup: 'Up',
    arrowdown: 'Down',
    arrowleft: 'Left',
    arrowright: 'Right',
  };

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function splitKeys(combo) {
    return String(combo).toLowerCase().split('+').filter(Boolean);
  }

  function keyGlyphs(combo) {
    return splitKeys(combo).map((k) => KEY_GLYPHS[k] || k.toUpperCase());
  }

  function keyWords(combo) {
    return splitKeys(combo)
      .map((k) => KEY_WORDS[k] || (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1)))
      .join('+');
  }

  function kbdHtml(combo) {
    return keyGlyphs(combo)
      .map((g) => `<kbd>${esc(g)}</kbd>`)
      .join('');
  }

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // fall through to legacy path
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  /** Keeps Tab focus inside `container`; returns a release function. */
  function trapFocus(container) {
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(container.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }

  function relativeTime(ts, now = Date.now()) {
    const s = Math.max(0, Math.round((now - ts) / 1000));
    if (s < 45) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  }

  window.KudbeeUI = { isMac, esc, load, save, keyGlyphs, keyWords, kbdHtml, copy, trapFocus, relativeTime };
})();
