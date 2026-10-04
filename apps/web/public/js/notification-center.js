/**
 * Notification Center — header bell + slide-in panel.
 * Categories: system, approvals, runs, errors.
 * Persists to localStorage ('kudbee:notifications') with a 24h TTL.
 * Seeded with mock data on first use; also reacts to existing app events.
 */
class NotificationCenter {
  static STORAGE_KEY = 'kudbee:notifications';
  static SEEDED_KEY = 'kudbee:notifications:seeded';
  static TTL_MS = 24 * 60 * 60 * 1000;
  static MAX_ITEMS = 100;
  static CATEGORIES = [
    { value: 'system', icon: '⚙️', label: 'System' },
    { value: 'approvals', icon: '✅', label: 'Approvals' },
    { value: 'runs', icon: '▶️', label: 'Runs' },
    { value: 'errors', icon: '⚠️', label: 'Errors' },
  ];

  constructor() {
    this.items = [];
    this.filter = 'all';
    this.open = false;
    this.testIndex = 0;
    this.load();
    this.seedIfFirstRun();
    this.mount();
    this.listen();
    this.render();
    this.pruneTimer = setInterval(() => this.prune(true), 60 * 1000);
  }

  // ─── Data ────────────────────────────────────────────────────
  load() {
    const stored = window.KudbeeUI.load(NotificationCenter.STORAGE_KEY, []);
    this.items = Array.isArray(stored) ? stored.filter((n) => n && n.id && n.ts) : [];
    this.prune(false);
  }

  persist() {
    window.KudbeeUI.save(NotificationCenter.STORAGE_KEY, this.items);
  }

  /** Drops notifications older than the TTL. Returns true if anything was removed. */
  prune(rerender = true, now = Date.now()) {
    const before = this.items.length;
    this.items = this.items.filter((n) => now - n.ts < NotificationCenter.TTL_MS);
    const changed = this.items.length !== before;
    if (changed) {
      this.persist();
      if (rerender) this.render();
    }
    return changed;
  }

  seedIfFirstRun() {
    if (window.KudbeeUI.load(NotificationCenter.SEEDED_KEY, false)) return;
    const now = Date.now();
    const min = 60 * 1000;
    const seeds = [
      { category: 'approvals', title: 'Approval requested', body: 'shell_exec wants to run "npm install" — waiting for your approval.', ago: 4 * min },
      { category: 'runs', title: 'Run completed', body: 'Goal "Create a hello world Python script" finished in 38s.', ago: 22 * min },
      { category: 'errors', title: 'Provider timeout', body: 'Model request timed out after 30s. Retrying with backoff.', ago: 95 * min },
      { category: 'system', title: 'Ollama connected', body: 'Local model server is reachable on port 11434.', ago: 3 * 60 * min },
      { category: 'system', title: 'Profile memory synced', body: 'Organizational memory saved for the active profile.', ago: 7 * 60 * min, read: true },
    ];
    this.items = seeds.map((s, i) => ({
      id: `seed-${i}`,
      category: s.category,
      title: s.title,
      body: s.body,
      ts: now - s.ago,
      read: !!s.read,
      source: 'mock',
    }));
    this.persist();
    window.KudbeeUI.save(NotificationCenter.SEEDED_KEY, true);
  }

  add({ category = 'system', title, body = '' } = {}) {
    if (!title) return null;
    const valid = NotificationCenter.CATEGORIES.some((c) => c.value === category);
    const note = {
      id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      category: valid ? category : 'system',
      title: String(title),
      body: String(body),
      ts: Date.now(),
      read: false,
    };
    this.items.unshift(note);
    this.items = this.items.slice(0, NotificationCenter.MAX_ITEMS);
    this.persist();
    this.render();
    this.bump();
    this.announce(`${note.title}. ${note.body}`);
    return note;
  }

  addTest() {
    const samples = [
      { category: 'system', title: 'System check passed', body: 'All services are healthy.' },
      { category: 'approvals', title: 'Approval requested', body: 'file_write wants to modify src/app.py.' },
      { category: 'runs', title: 'Run started', body: 'Executing goal with the selected model.' },
      { category: 'errors', title: 'Tool failed', body: 'web_fetch returned HTTP 503.' },
    ];
    return this.add(samples[this.testIndex++ % samples.length]);
  }

  unreadCount() {
    return this.items.filter((n) => !n.read).length;
  }

  markRead(id, read = true) {
    const n = this.items.find((i) => i.id === id);
    if (!n || n.read === read) return;
    n.read = read;
    this.persist();
    this.render();
  }

  markAllRead() {
    this.items.forEach((n) => (n.read = true));
    this.persist();
    this.render();
  }

  dismiss(id) {
    this.items = this.items.filter((n) => n.id !== id);
    this.persist();
    this.render();
  }

  clearAll() {
    this.items = [];
    this.persist();
    this.render();
  }

  // ─── Events from the rest of the app ─────────────────────────
  listen() {
    document.addEventListener('workflow-saved', (e) => {
      const name = e.detail?.workflow?.name || 'Workflow';
      this.add({ category: 'system', title: 'Workflow saved', body: `"${name}" is ready to run from Actions.` });
    });
    document.addEventListener('profile:switched', (e) => {
      const name = e.detail?.profile?.name;
      if (name) this.add({ category: 'system', title: 'Profile switched', body: `Now using "${name}".` });
    });
    document.addEventListener('run-started', () => this.add({ category: 'runs', title: 'Run started', body: 'Goal execution began.' }));
    document.addEventListener('run-completed', () => this.add({ category: 'runs', title: 'Run completed', body: 'Goal execution finished.' }));
    window.addEventListener('storage', (e) => {
      if (e.key === NotificationCenter.STORAGE_KEY) {
        this.load();
        this.render();
      }
    });
  }

  // ─── UI ──────────────────────────────────────────────────────
  mount() {
    const host = document.querySelector('.header-right');
    if (host) {
      const btn = document.createElement('button');
      btn.id = 'notification-button';
      btn.type = 'button';
      btn.className = 'btn-secondary notification-button';
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Notifications (Alt+N)';
      btn.innerHTML = '<span class="bell" aria-hidden="true">🔔</span><span class="notification-badge" hidden>0</span>';
      const status = host.querySelector('.status-indicator');
      status ? status.after(btn) : host.prepend(btn);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
      this.button = btn;
      this.badge = btn.querySelector('.notification-badge');
    }

    this.live = document.createElement('div');
    this.live.className = 'sr-only';
    this.live.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.live);

    const scrim = document.createElement('div');
    scrim.className = 'nc-scrim';
    scrim.hidden = true;
    scrim.addEventListener('click', () => this.close());

    const panel = document.createElement('aside');
    panel.id = 'notification-panel';
    panel.className = 'nc-panel glass';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notifications');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    panel.innerHTML = `
      <div class="nc-header">
        <h2>Notifications</h2>
        <div class="nc-header-actions">
          <button type="button" class="nc-link" data-action="mark-all">Mark all read</button>
          <button type="button" class="nc-link" data-action="clear-all">Clear all</button>
          <button type="button" class="nc-close" data-action="close" aria-label="Close notifications">✕</button>
        </div>
      </div>
      <div class="nc-tabs" role="tablist" aria-label="Notification categories"></div>
      <div class="nc-list" role="list"></div>
      <div class="nc-footer">Notifications are kept for 24 hours.</div>`;

    document.body.append(scrim, panel);
    this.scrim = scrim;
    this.panel = panel;
    this.tabsEl = panel.querySelector('.nc-tabs');
    this.listEl = panel.querySelector('.nc-list');

    panel.addEventListener('click', (e) => this.onPanelClick(e));
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      } else if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('nc-item')) {
        e.preventDefault();
        const id = e.target.dataset.id;
        this.markRead(id, true);
        this.listEl.querySelector(`.nc-item[data-id="${CSS.escape(id)}"]`)?.focus();
      }
    });
    this.releaseTrap = window.KudbeeUI.trapFocus(panel);
  }

  onPanelClick(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const tab = e.target.closest('[data-filter]');
    const item = e.target.closest('.nc-item');
    if (action === 'close') return this.close();
    if (action === 'mark-all') return this.markAllRead();
    if (action === 'clear-all') return this.clearAll();
    if (tab) {
      this.filter = tab.dataset.filter;
      return this.render();
    }
    if (!item) return;
    const id = item.dataset.id;
    if (action === 'dismiss') return this.dismiss(id);
    if (action === 'toggle-read') return this.markRead(id, item.classList.contains('unread'));
    this.markRead(id, true);
  }

  toggle() {
    this.open ? this.close() : this.openPanel();
  }

  openPanel() {
    if (this.open || !this.panel) return;
    this.prune(false);
    this.open = true;
    this.returnFocus = document.activeElement;
    this.render();
    this.scrim.hidden = false;
    this.panel.inert = false;
    this.panel.setAttribute('aria-hidden', 'false');
    this.button?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      this.panel.classList.add('open');
      this.scrim.classList.add('open');
      this.panel.querySelector('.nc-close')?.focus();
    });
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('open');
    this.scrim.classList.remove('open');
    this.panel.setAttribute('aria-hidden', 'true');
    this.panel.inert = true;
    this.button?.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      if (!this.open) this.scrim.hidden = true;
    }, 300);
    (this.returnFocus && document.contains(this.returnFocus) ? this.returnFocus : this.button)?.focus();
  }

  isOpen() {
    return this.open;
  }

  bump() {
    if (!this.button) return;
    this.button.classList.remove('bump');
    void this.button.offsetWidth;
    this.button.classList.add('bump');
  }

  announce(text) {
    if (!this.live) return;
    this.live.textContent = '';
    setTimeout(() => (this.live.textContent = text), 30);
  }

  visibleItems() {
    return this.items.filter((n) => this.filter === 'all' || n.category === this.filter);
  }

  render() {
    if (!this.panel) return;
    const { esc, relativeTime } = window.KudbeeUI;
    const unread = this.unreadCount();

    if (this.badge) {
      this.badge.hidden = unread === 0;
      this.badge.textContent = unread > 9 ? '9+' : String(unread);
      this.button.setAttribute('aria-label', unread ? `Notifications, ${unread} unread` : 'Notifications');
    }

    const tabs = [{ value: 'all', label: 'All' }, ...NotificationCenter.CATEGORIES];
    this.tabsEl.innerHTML = tabs
      .map((t) => {
        const count = t.value === 'all' ? this.items.length : this.items.filter((n) => n.category === t.value).length;
        const active = this.filter === t.value;
        return `<button type="button" role="tab" class="nc-tab${active ? ' active' : ''}" aria-selected="${active}" data-filter="${t.value}">${esc(t.label)}<span class="nc-tab-count">${count}</span></button>`;
      })
      .join('');

    const visible = this.visibleItems();
    if (!visible.length) {
      this.listEl.innerHTML = `<div class="nc-empty"><div class="nc-empty-icon" aria-hidden="true">🔕</div><div>${this.filter === 'all' ? "You're all caught up" : 'Nothing in this category'}</div></div>`;
    } else {
      const now = Date.now();
      this.listEl.innerHTML = visible
        .map((n) => {
          const cat = NotificationCenter.CATEGORIES.find((c) => c.value === n.category) || NotificationCenter.CATEGORIES[0];
          return `<div class="nc-item cat-${esc(n.category)}${n.read ? '' : ' unread'}" role="listitem" data-id="${esc(n.id)}" tabindex="0">
            <span class="nc-item-icon" aria-hidden="true">${cat.icon}</span>
            <div class="nc-item-main">
              <div class="nc-item-title">${esc(n.title)}${n.read ? '' : '<span class="nc-dot" aria-label="unread"></span>'}</div>
              <div class="nc-item-body">${esc(n.body)}</div>
              <div class="nc-item-meta">${esc(cat.label)} · ${esc(relativeTime(n.ts, now))}</div>
            </div>
            <div class="nc-item-actions">
              <button type="button" data-action="toggle-read" aria-label="${n.read ? 'Mark as unread' : 'Mark as read'}" title="${n.read ? 'Mark as unread' : 'Mark as read'}">${n.read ? '○' : '●'}</button>
              <button type="button" data-action="dismiss" aria-label="Dismiss notification" title="Dismiss">✕</button>
            </div>
          </div>`;
        })
        .join('');
    }

    const hasItems = this.items.length > 0;
    this.panel.querySelector('[data-action="mark-all"]').disabled = unread === 0;
    this.panel.querySelector('[data-action="clear-all"]').disabled = !hasItems;
    if (this.open && (document.activeElement === document.body || !this.panel.contains(document.activeElement))) {
      this.panel.querySelector('.nc-close')?.focus();
    }
  }
}

window.NotificationCenter = NotificationCenter;
window.NotificationCenterInstance = new NotificationCenter();
