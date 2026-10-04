/**
 * Theme Switcher — Light / Dark / System
 * Preference persists to localStorage ('kudbee:theme'). "System" follows
 * prefers-color-scheme live. The resolved theme is written to
 * <html data-theme="light|dark"> and every panel restyles through CSS tokens.
 */
class ThemeSwitcher {
  static STORAGE_KEY = 'kudbee:theme';
  static OPTIONS = [
    { value: 'light', icon: '☀️', label: 'Light' },
    { value: 'dark', icon: '🌙', label: 'Dark' },
    { value: 'system', icon: '🖥️', label: 'System' },
  ];

  constructor() {
    this.media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this.preference = this.readPreference();
    this.apply(this.preference, { animate: false });
    this.mount();
    if (this.media) {
      const onChange = () => this.preference === 'system' && this.apply('system');
      this.media.addEventListener ? this.media.addEventListener('change', onChange) : this.media.addListener(onChange);
    }
    window.addEventListener('storage', (e) => {
      if (e.key === ThemeSwitcher.STORAGE_KEY) this.apply(this.readPreference(), { persist: false });
    });
  }

  readPreference() {
    const stored = window.KudbeeUI.load(ThemeSwitcher.STORAGE_KEY, 'system');
    return ThemeSwitcher.OPTIONS.some((o) => o.value === stored) ? stored : 'system';
  }

  resolve(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return this.media && this.media.matches ? 'dark' : 'light';
  }

  apply(preference, { animate = true, persist = true } = {}) {
    if (!ThemeSwitcher.OPTIONS.some((o) => o.value === preference)) preference = 'system';
    const root = document.documentElement;
    const resolved = this.resolve(preference);

    if (animate) {
      root.classList.add('theme-transition');
      clearTimeout(this.transitionTimer);
      this.transitionTimer = setTimeout(() => root.classList.remove('theme-transition'), 350);
    }

    this.preference = preference;
    root.dataset.theme = resolved;
    root.dataset.themePref = preference;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#12121a' : '#f5f5f7');
    if (persist) window.KudbeeUI.save(ThemeSwitcher.STORAGE_KEY, preference);

    this.syncUI();
    document.dispatchEvent(new CustomEvent('theme:changed', { detail: { preference, resolved } }));
  }

  set(preference) {
    this.apply(preference);
  }

  cycle() {
    const order = ThemeSwitcher.OPTIONS.map((o) => o.value);
    const next = order[(order.indexOf(this.preference) + 1) % order.length];
    this.apply(next);
    window.NotificationCenterInstance?.announce(`Theme: ${this.optionFor(next).label}`);
  }

  optionFor(value) {
    return ThemeSwitcher.OPTIONS.find((o) => o.value === value) || ThemeSwitcher.OPTIONS[2];
  }

  mount() {
    const host = document.querySelector('.header-right');
    if (!host) return;

    const wrap = document.createElement('div');
    wrap.className = 'theme-switcher';
    wrap.innerHTML = `
      <button id="theme-button" class="btn-secondary theme-button" aria-haspopup="menu" aria-expanded="false" aria-label="Theme" title="Theme (Alt+T)">
        <span class="theme-icon" aria-hidden="true"></span><span class="theme-label"></span>
      </button>
      <div id="theme-menu" class="theme-menu glass hidden" role="menu" aria-label="Theme">
        ${ThemeSwitcher.OPTIONS.map(
          (o) => `<button type="button" class="theme-option" role="menuitemradio" data-theme-value="${o.value}">
            <span class="theme-option-icon" aria-hidden="true">${o.icon}</span>
            <span class="theme-option-label">${o.label}</span>
            <span class="theme-option-check" aria-hidden="true">✓</span>
          </button>`
        ).join('')}
      </div>`;

    const anchor = document.getElementById('notification-button') || host.querySelector('.status-indicator');
    anchor ? anchor.after(wrap) : host.prepend(wrap);

    this.button = wrap.querySelector('#theme-button');
    this.menu = wrap.querySelector('#theme-menu');

    this.button.addEventListener('click', () => (this.menu.classList.contains('hidden') ? this.openMenu() : this.closeMenu()));
    this.menu.addEventListener('click', (e) => {
      const opt = e.target.closest('.theme-option');
      if (!opt) return;
      this.apply(opt.dataset.themeValue);
      this.closeMenu();
      this.button.focus();
    });
    this.menu.addEventListener('keydown', (e) => this.onMenuKey(e));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.theme-switcher')) this.closeMenu();
    });
    this.syncUI();
  }

  options() {
    return Array.from(this.menu.querySelectorAll('.theme-option'));
  }

  openMenu() {
    this.menu.classList.remove('hidden');
    this.button.setAttribute('aria-expanded', 'true');
    const current = this.options().find((o) => o.dataset.themeValue === this.preference);
    (current || this.options()[0]).focus();
  }

  closeMenu() {
    if (!this.menu || this.menu.classList.contains('hidden')) return;
    this.menu.classList.add('hidden');
    this.button.setAttribute('aria-expanded', 'false');
  }

  onMenuKey(e) {
    const opts = this.options();
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      opts[(i + 1) % opts.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      opts[(i - 1 + opts.length) % opts.length].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.closeMenu();
      this.button.focus();
    } else if (e.key === 'Tab') {
      this.closeMenu();
    }
  }

  syncUI() {
    if (!this.button) return;
    const current = this.optionFor(this.preference);
    this.button.querySelector('.theme-icon').textContent = current.icon;
    this.button.querySelector('.theme-label').textContent = current.label;
    this.options().forEach((o) => {
      const active = o.dataset.themeValue === this.preference;
      o.setAttribute('aria-checked', String(active));
      o.classList.toggle('active', active);
    });
  }
}

window.ThemeSwitcher = ThemeSwitcher;
window.ThemeSwitcherInstance = new ThemeSwitcher();
