/**
 * Command Palette (Cmd/Ctrl+K)
 * Fuzzy search across goals, workflows, profiles, memory items, commands and settings.
 * Items run existing controls/instances — no new backend behavior.
 */
class CommandPalette {
  static RECENT_KEY = 'kudbee:palette:recent';
  static GOALS_KEY = 'kudbee:recentGoals';
  static MAX_RECENT = 5;
  static MAX_GOALS = 10;
  static PER_GROUP = 5;

  static TYPES = {
    command: { label: 'Commands', badge: 'Command' },
    goal: { label: 'Goals', badge: 'Goal' },
    workflow: { label: 'Workflows', badge: 'Workflow' },
    profile: { label: 'Profiles', badge: 'Profile' },
    memory: { label: 'Memory', badge: 'Memory' },
    setting: { label: 'Settings', badge: 'Setting' },
  };

  constructor() {
    this.isOpenFlag = false;
    this.items = [];
    this.results = [];
    this.activeIndex = 0;
    this.mountTrigger();
    this.trackGoals();
  }

  // ─── Fuzzy matching ──────────────────────────────────────────
  /**
   * Scores `query` against `text`. Returns null if not all query characters
   * appear in order; otherwise { score, indexes } where indexes are the
   * matched character positions (for highlighting).
   */
  static fuzzyScore(query, text) {
    const q = String(query).toLowerCase().replace(/\s+/g, '');
    const t = String(text).toLowerCase();
    if (!q) return { score: 0, indexes: [] };

    const sub = t.indexOf(q);
    if (sub !== -1) {
      const boundary = sub === 0 || /[\s\-_/.:]/.test(t[sub - 1]);
      const indexes = Array.from({ length: q.length }, (_, i) => sub + i);
      return { score: 100 + (sub === 0 ? 40 : boundary ? 25 : 0) + q.length * 2 - sub * 0.5, indexes };
    }

    const indexes = [];
    let score = 0;
    let ti = 0;
    let prev = -2;
    for (const ch of q) {
      const found = t.indexOf(ch, ti);
      if (found === -1) return null;
      if (found === prev + 1) score += 8;
      else score -= Math.min(found - prev - 1, 5);
      if (found === 0 || /[\s\-_/.:]/.test(t[found - 1])) score += 10;
      indexes.push(found);
      prev = found;
      ti = found + 1;
    }
    return { score: score + 20 - (t.length - q.length) * 0.1, indexes };
  }

  static highlight(text, indexes) {
    const { esc } = window.KudbeeUI;
    if (!indexes || !indexes.length) return esc(text);
    const set = new Set(indexes);
    let out = '';
    let open = false;
    Array.from(String(text)).forEach((ch, i) => {
      const on = set.has(i);
      if (on && !open) out += '<mark>';
      if (!on && open) out += '</mark>';
      open = on;
      out += esc(ch);
    });
    return open ? out + '</mark>' : out;
  }

  // ─── Item sources ────────────────────────────────────────────
  gather() {
    return [
      ...this.commandItems(),
      ...this.settingItems(),
      ...this.goalItems(),
      ...this.workflowItems(),
      ...this.profileItems(),
      ...this.memoryItems(),
    ];
  }

  commandItems() {
    const click = (id) => () => {
      const el = document.getElementById(id);
      if (el && !el.disabled) el.click();
    };
    const sc = (id) => id;
    return [
      { id: 'cmd:run', type: 'command', icon: '▶', title: 'Run goal', subtitle: 'Run the goal in the terminal input', shortcut: sc('run.start'), suggested: true, run: () => {
        const input = document.getElementById('goal-input');
        input && input.value.trim() ? click('run-goal')() : input?.focus();
      } },
      { id: 'cmd:stop', type: 'command', icon: '⏹', title: 'Stop current run', shortcut: sc('run.stop'), run: click('stop-goal') },
      { id: 'cmd:focus', type: 'command', icon: '⌨', title: 'Focus goal input', shortcut: sc('goal.focus'), run: () => document.getElementById('goal-input')?.focus() },
      { id: 'cmd:clear', type: 'command', icon: '🧹', title: 'Clear terminal', shortcut: sc('terminal.clear'), run: click('clear-chat') },
      { id: 'cmd:models', type: 'command', icon: '🔄', title: 'Refresh models', shortcut: sc('models.refresh'), run: click('refresh-models') },
      { id: 'cmd:files', type: 'command', icon: '📁', title: 'Refresh files', run: click('refresh-files') },
      { id: 'cmd:wf-builder', type: 'command', icon: '⚙️', title: 'Go to workflow builder', shortcut: sc('workflow.builder'), run: () => window.Shortcuts?.get('workflow.builder')?.action() },
      { id: 'cmd:wf-load', type: 'command', icon: '📂', title: 'Load saved workflow…', shortcut: sc('workflow.load'), run: click('workflow-load') },
      { id: 'cmd:profile-switch', type: 'command', icon: '📋', title: 'Switch profile…', shortcut: sc('profile.switch'), run: click('profile-button') },
      { id: 'cmd:profile-new', type: 'command', icon: '＋', title: 'New profile…', run: () => window.ProfileSwitcherInstance?.showNewProfileDialog?.() },
      { id: 'cmd:shortcuts', type: 'command', icon: '⌘', title: 'Keyboard shortcuts', subtitle: 'See every available shortcut', shortcut: sc('shortcuts.toggle'), suggested: true, run: () => window.ShortcutsReferenceInstance?.open() },
      { id: 'cmd:notifications', type: 'command', icon: '🔔', title: 'Open notifications', shortcut: sc('notifications.toggle'), suggested: true, run: () => window.NotificationCenterInstance?.openPanel() },
      { id: 'cmd:notify-test', type: 'command', icon: '🧪', title: 'Send test notification', subtitle: 'Adds a mock notification', run: () => window.NotificationCenterInstance?.addTest() },
    ];
  }

  settingItems() {
    const theme = window.ThemeSwitcherInstance;
    if (!theme) return [];
    const options = window.ThemeSwitcher.OPTIONS;
    const next = options[(options.findIndex((o) => o.value === theme.preference) + 1) % options.length];
    return options.map((o) => ({
      id: `set:theme:${o.value}`,
      type: 'setting',
      icon: o.icon,
      title: `Theme: ${o.label}`,
      subtitle: theme.preference === o.value ? 'Current theme' : 'Switch appearance',
      suggested: o.value === next.value,
      shortcut: o.value === next.value ? 'theme.cycle' : undefined,
      keywords: 'appearance dark light mode color',
      run: () => theme.set(o.value),
    }));
  }

  goalItems() {
    return window.KudbeeUI.load(CommandPalette.GOALS_KEY, []).map((goal, i) => ({
      id: `goal:${goal}`,
      type: 'goal',
      icon: '🎯',
      title: goal,
      subtitle: i === 0 ? 'Most recent goal — fills the input' : 'Recent goal — fills the input',
      run: () => {
        const input = document.getElementById('goal-input');
        if (!input) return;
        input.value = goal;
        input.focus();
      },
    }));
  }

  workflowItems() {
    const list = window.WorkflowBuilderInstance?.getAllWorkflows?.() || [];
    return list.map((w) => ({
      id: `wf:${w.id}`,
      type: 'workflow',
      icon: '⚙️',
      title: w.name || 'Untitled workflow',
      subtitle: `${(w.steps || []).length} steps — run workflow`,
      run: () => window.ActionsButtonInstance?.runWorkflow(w.id),
    }));
  }

  profileItems() {
    const manager = window.ProfileManagerInstance;
    if (!manager) return [];
    const active = manager.getActiveProfile?.();
    return manager.getAllProfiles().map((p) => ({
      id: `profile:${p.id}`,
      type: 'profile',
      icon: '📋',
      title: p.name,
      subtitle: active && active.id === p.id ? 'Active profile' : 'Switch to this profile',
      run: () => {
        if (active && active.id === p.id) return;
        manager.switchProfile(p.id);
        window.ProfileSwitcherInstance?.render();
        window.ProfileSwitcherInstance?.onProfileSwitched();
      },
    }));
  }

  memoryItems() {
    const memory = window.ProfileManagerInstance?.loadMemoryForActiveProfile?.() || {};
    const out = [];
    [['org', 'Organizational'], ['verified', 'Verified']].forEach(([layer, label]) => {
      Object.entries(memory[layer] || {})
        .slice(0, 50)
        .forEach(([key, value]) => {
          const text = typeof value === 'string' ? value : JSON.stringify(value);
          out.push({
            id: `mem:${layer}:${key}`,
            type: 'memory',
            icon: '🧠',
            title: key,
            subtitle: `${label} — ${String(text).slice(0, 80)}`,
            run: async () => {
              const ok = await window.KudbeeUI.copy(String(text));
              window.NotificationCenterInstance?.add({
                category: ok ? 'system' : 'errors',
                title: ok ? 'Memory value copied' : 'Copy failed',
                body: ok ? `"${key}" copied to clipboard.` : `Could not copy "${key}".`,
              });
            },
          });
        });
    });
    return out;
  }

  /** Records goals submitted from the terminal so they can be recalled later. */
  trackGoals() {
    const record = () => {
      const goal = document.getElementById('goal-input')?.value.trim();
      if (!goal) return;
      const list = window.KudbeeUI.load(CommandPalette.GOALS_KEY, []).filter((g) => g !== goal);
      list.unshift(goal);
      window.KudbeeUI.save(CommandPalette.GOALS_KEY, list.slice(0, CommandPalette.MAX_GOALS));
    };
    // Capture phase: runs before app.js clears the input
    document.addEventListener('click', (e) => e.target.closest?.('#run-goal, #submit-goal') && record(), true);
    document.addEventListener('keydown', (e) => e.key === 'Enter' && e.target.id === 'goal-input' && !e.isComposing && record(), true);
  }

  // ─── Searching ───────────────────────────────────────────────
  search(query) {
    const q = query.trim();
    if (!q) return this.defaultResults();

    const scored = [];
    for (const item of this.items) {
      const t = CommandPalette.fuzzyScore(q, item.title);
      let best = t ? { score: t.score, indexes: t.indexes } : null;
      if (!best) {
        // Secondary text must match literally; subsequence matching there is mostly noise
        const extra = `${item.subtitle || ''} ${item.keywords || ''}`.toLowerCase();
        if (extra.includes(q.toLowerCase())) best = { score: 30, indexes: null };
      }
      if (best) scored.push({ item, ...best });
    }

    const groups = new Map();
    scored
      .sort((a, b) => b.score - a.score)
      .forEach((r) => {
        const g = groups.get(r.item.type) || [];
        if (g.length < CommandPalette.PER_GROUP) g.push(r);
        groups.set(r.item.type, g);
      });

    return Array.from(groups.entries())
      .sort((a, b) => b[1][0].score - a[1][0].score)
      .flatMap(([type, rows]) => rows.map((r, i) => ({ ...r, heading: i === 0 ? CommandPalette.TYPES[type].label : null })));
  }

  defaultResults() {
    const byId = new Map(this.items.map((i) => [i.id, i]));
    const recentIds = window.KudbeeUI.load(CommandPalette.RECENT_KEY, []);
    const recent = recentIds.map((id) => byId.get(id)).filter(Boolean);
    const recentSet = new Set(recent.map((i) => i.id));
    const suggested = this.items.filter((i) => i.suggested && !recentSet.has(i.id));
    return [
      ...recent.map((item, i) => ({ item, indexes: null, score: 0, heading: i === 0 ? 'Recent' : null })),
      ...suggested.map((item, i) => ({ item, indexes: null, score: 0, heading: i === 0 ? 'Suggested' : null })),
    ];
  }

  // ─── UI ──────────────────────────────────────────────────────
  mountTrigger() {
    const host = document.querySelector('.header-right');
    if (!host) return;
    const btn = document.createElement('button');
    btn.id = 'palette-trigger';
    btn.type = 'button';
    btn.className = 'btn-secondary palette-trigger';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.title = 'Search and run commands';
    btn.innerHTML = `<span aria-hidden="true">🔍</span><span class="palette-trigger-label">Search</span><span class="palette-trigger-keys">${window.KudbeeUI.kbdHtml('mod+k')}</span>`;
    btn.addEventListener('click', () => this.open());
    host.prepend(btn);
  }

  build() {
    const overlay = document.createElement('div');
    overlay.className = 'kb-overlay cp-overlay';
    overlay.setAttribute('data-kb-modal', 'palette');
    overlay.innerHTML = `
      <div class="cp glass" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cp-search">
          <span class="cp-search-icon" aria-hidden="true">🔍</span>
          <input class="cp-input" type="text" role="combobox" aria-expanded="true" aria-controls="cp-list" aria-autocomplete="list"
                 autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="Search goals, workflows, profiles, memory, commands…" aria-label="Search commands">
          <kbd>Esc</kbd>
        </div>
        <div class="cp-list" id="cp-list" role="listbox" aria-label="Results"></div>
        <div class="cp-footer" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>`;
    this.overlay = overlay;
    this.input = overlay.querySelector('.cp-input');
    this.listEl = overlay.querySelector('.cp-list');

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) this.close();
    });
    this.input.addEventListener('input', () => {
      this.results = this.search(this.input.value);
      this.activeIndex = 0;
      this.renderResults();
    });
    overlay.addEventListener('keydown', (e) => this.onKey(e));
    this.listEl.addEventListener('mousemove', (e) => {
      const row = e.target.closest('.cp-item');
      if (row && Number(row.dataset.index) !== this.activeIndex) this.setActive(Number(row.dataset.index), false);
    });
    this.listEl.addEventListener('click', (e) => {
      const row = e.target.closest('.cp-item');
      if (row) this.choose(Number(row.dataset.index));
    });
    this.releaseTrap = window.KudbeeUI.trapFocus(overlay);
  }

  isOpen() {
    return this.isOpenFlag;
  }

  toggle() {
    this.isOpenFlag ? this.close() : this.open();
  }

  open() {
    if (this.isOpenFlag) return;
    // Only one modal at a time
    window.ShortcutsReferenceInstance?.close();
    window.NotificationCenterInstance?.close();
    if (!this.overlay) this.build();
    this.items = this.gather();
    this.returnFocus = document.activeElement;
    this.input.value = '';
    this.results = this.search('');
    this.activeIndex = 0;
    this.isOpenFlag = true;
    document.body.appendChild(this.overlay);
    this.renderResults();
    // Focus immediately (the element is in the DOM, just transparent) so typing right after
    // opening is never lost; the class flip only drives the fade/scale transition.
    this.input.focus();
    requestAnimationFrame(() => this.overlay.classList.add('open'));
  }

  close() {
    if (!this.isOpenFlag) return;
    this.isOpenFlag = false;
    this.overlay.classList.remove('open');
    this.overlay.remove();
    const el = this.returnFocus;
    if (el && document.contains(el) && typeof el.focus === 'function') el.focus();
  }

  onKey(e) {
    const n = this.results.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (n) this.setActive((this.activeIndex + 1) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (n) this.setActive((this.activeIndex - 1 + n) % n);
        break;
      case 'Home':
        if (n && e.target !== this.input) this.setActive(0);
        break;
      case 'Enter':
        e.preventDefault();
        if (!e.isComposing) this.choose(this.activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.close();
        break;
    }
  }

  setActive(index, scroll = true) {
    const rows = this.listEl.querySelectorAll('.cp-item');
    rows[this.activeIndex]?.classList.remove('active');
    rows[this.activeIndex]?.setAttribute('aria-selected', 'false');
    this.activeIndex = index;
    const row = rows[index];
    if (!row) return;
    row.classList.add('active');
    row.setAttribute('aria-selected', 'true');
    this.input.setAttribute('aria-activedescendant', row.id);
    if (scroll) row.scrollIntoView({ block: 'nearest' });
  }

  choose(index) {
    const entry = this.results[index];
    if (!entry) return;
    const { item } = entry;
    const recent = window.KudbeeUI.load(CommandPalette.RECENT_KEY, []).filter((id) => id !== item.id);
    recent.unshift(item.id);
    window.KudbeeUI.save(CommandPalette.RECENT_KEY, recent.slice(0, CommandPalette.MAX_RECENT));
    this.close();
    // Defer so focus restoration finishes before the action moves focus
    setTimeout(() => item.run(), 0);
  }

  renderResults() {
    const { esc } = window.KudbeeUI;
    if (!this.results.length) {
      const q = this.input.value.trim();
      this.listEl.innerHTML = `<div class="cp-empty">${q ? `No results for “${esc(q)}”` : 'Start typing to search'}</div>`;
      this.input.removeAttribute('aria-activedescendant');
      return;
    }
    this.listEl.innerHTML = this.results
      .map((r, i) => {
        const { item } = r;
        const title = r.indexes ? CommandPalette.highlight(item.title, r.indexes) : esc(item.title);
        const hint = item.shortcut && window.Shortcuts?.get(item.shortcut);
        const heading = r.heading ? `<div class="cp-heading" role="presentation">${esc(r.heading)}</div>` : '';
        return `${heading}<div class="cp-item${i === this.activeIndex ? ' active' : ''}" id="cp-item-${i}" role="option" aria-selected="${i === this.activeIndex}" data-index="${i}">
          <span class="cp-item-icon" aria-hidden="true">${esc(item.icon || '•')}</span>
          <span class="cp-item-text">
            <span class="cp-item-title">${title}</span>
            ${item.subtitle ? `<span class="cp-item-sub">${esc(item.subtitle)}</span>` : ''}
          </span>
          <span class="cp-item-meta">${hint ? `<span class="cp-keys">${window.KudbeeUI.kbdHtml(hint.keys)}</span>` : `<span class="cp-badge">${esc(CommandPalette.TYPES[item.type].badge)}</span>`}</span>
        </div>`;
      })
      .join('');
    this.input.setAttribute('aria-activedescendant', `cp-item-${this.activeIndex}`);
  }
}

window.CommandPalette = CommandPalette;
window.CommandPaletteInstance = new CommandPalette();
