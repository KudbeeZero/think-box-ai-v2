/**
 * Keyboard Shortcuts Reference (Cmd/Ctrl+?)
 * Modal grouped by category with live filter, copy-to-clipboard and a print layout.
 * Reads from the shared ShortcutRegistry so it never drifts from real bindings.
 */
class ShortcutsReference {
  static CATEGORY_ORDER = ['General', 'Navigation', 'Run', 'Workflow', 'Profile', 'Command palette'];

  constructor() {
    this.isOpenFlag = false;
    // Print only the reference while it is open; leave normal page printing alone
    window.addEventListener('beforeprint', () => this.isOpenFlag && document.documentElement.classList.add('print-shortcuts'));
    window.addEventListener('afterprint', () => document.documentElement.classList.remove('print-shortcuts'));
  }

  /** Returns shortcuts matching `query` grouped by category (ordered). */
  static group(items, query = '') {
    const q = query.trim().toLowerCase();
    const groups = new Map();
    items.forEach((item) => {
      const hay = `${item.description} ${item.category} ${window.KudbeeUI.keyWords(item.keys)}`.toLowerCase();
      if (q && !hay.includes(q)) return;
      const list = groups.get(item.category) || [];
      list.push(item);
      groups.set(item.category, list);
    });
    const order = ShortcutsReference.CATEGORY_ORDER;
    return Array.from(groups.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  build() {
    const overlay = document.createElement('div');
    overlay.className = 'kb-overlay sk-overlay';
    overlay.setAttribute('data-kb-modal', 'shortcuts');
    overlay.innerHTML = `
      <div class="sk-modal glass" role="dialog" aria-modal="true" aria-labelledby="sk-title">
        <div class="sk-header">
          <h2 id="sk-title">Keyboard Shortcuts</h2>
          <div class="sk-header-actions">
            <button type="button" class="nc-link" data-action="print">Print</button>
            <button type="button" class="nc-close" data-action="close" aria-label="Close shortcuts">✕</button>
          </div>
        </div>
        <div class="sk-search">
          <input type="search" class="sk-input" placeholder="Filter shortcuts…" aria-label="Filter shortcuts" autocomplete="off" spellcheck="false">
        </div>
        <div class="sk-body" tabindex="-1"></div>
        <div class="sk-status sr-only" aria-live="polite"></div>
      </div>`;
    this.overlay = overlay;
    this.input = overlay.querySelector('.sk-input');
    this.body = overlay.querySelector('.sk-body');
    this.status = overlay.querySelector('.sk-status');

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) this.close();
    });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });
    overlay.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'close') this.close();
      else if (action.dataset.action === 'print') window.print();
      else if (action.dataset.action === 'copy') this.copyShortcut(action);
    });
    this.input.addEventListener('input', () => this.render());
    this.releaseTrap = window.KudbeeUI.trapFocus(overlay);
  }

  async copyShortcut(btn) {
    const text = window.KudbeeUI.keyWords(btn.dataset.keys);
    const ok = await window.KudbeeUI.copy(text);
    const original = btn.dataset.label || 'Copy';
    btn.textContent = ok ? 'Copied' : 'Failed';
    btn.classList.toggle('done', ok);
    this.status.textContent = ok ? `Copied ${text}` : 'Copy failed';
    clearTimeout(btn._timer);
    btn._timer = setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('done');
    }, 1200);
  }

  render() {
    const { esc, kbdHtml, keyWords } = window.KudbeeUI;
    const groups = ShortcutsReference.group(window.Shortcuts.list(), this.input.value);
    if (!groups.length) {
      this.body.innerHTML = `<div class="cp-empty">No shortcuts match “${esc(this.input.value.trim())}”</div>`;
      return;
    }
    this.body.innerHTML = groups
      .map(
        ([category, items]) => `
        <section class="sk-group">
          <h3>${esc(category)}</h3>
          <ul>
            ${items
              .map(
                (i) => `<li class="sk-row">
                  <span class="sk-desc">${esc(i.description)}</span>
                  <span class="sk-keys" aria-label="${esc(keyWords(i.keys))}">${kbdHtml(i.keys)}</span>
                  <button type="button" class="sk-copy" data-action="copy" data-keys="${esc(i.keys)}" data-label="Copy" aria-label="Copy ${esc(keyWords(i.keys))}">Copy</button>
                </li>`
              )
              .join('')}
          </ul>
        </section>`
      )
      .join('');
  }

  isOpen() {
    return this.isOpenFlag;
  }

  toggle() {
    this.isOpenFlag ? this.close() : this.open();
  }

  open() {
    if (this.isOpenFlag) return;
    window.CommandPaletteInstance?.close();
    window.NotificationCenterInstance?.close();
    if (!this.overlay) this.build();
    this.returnFocus = document.activeElement;
    this.input.value = '';
    this.render();
    this.isOpenFlag = true;
    document.body.appendChild(this.overlay);
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
}

window.ShortcutsReference = ShortcutsReference;
window.ShortcutsReferenceInstance = new ShortcutsReference();
