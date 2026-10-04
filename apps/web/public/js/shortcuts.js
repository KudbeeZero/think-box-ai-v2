/**
 * Shortcut registry — single source of truth for keyboard shortcuts.
 * Feeds the global key handler, the command palette hints and the
 * shortcuts reference modal. Actions call existing DOM controls / instances only.
 *
 * Combo syntax: "mod+k", "alt+shift+w", "mod+?", "/". `mod` = Cmd or Ctrl.
 * Shortcuts without mod/alt never fire while typing in a field.
 */
class ShortcutRegistry {
  constructor() {
    this.items = [];
    document.addEventListener('keydown', (e) => this.handle(e));
  }

  register(def) {
    this.items = this.items.filter((i) => i.id !== def.id);
    this.items.push({ category: 'General', ...def });
    return this;
  }

  get(id) {
    return this.items.find((i) => i.id === id) || null;
  }

  list() {
    return this.items.slice();
  }

  static parse(combo) {
    const parts = String(combo).toLowerCase().split('+');
    const key = parts.pop() || '+';
    return { key, mod: parts.includes('mod'), alt: parts.includes('alt'), shift: parts.includes('shift') };
  }

  static keyMatches(e, key) {
    if (key.length === 1 && /[a-z]/.test(key)) {
      // e.code keeps Alt combos working on macOS, where Option rewrites e.key
      return e.code === 'Key' + key.toUpperCase() || (e.key || '').toLowerCase() === key;
    }
    const named = { enter: 'Enter', escape: 'Escape', arrowup: 'ArrowUp', arrowdown: 'ArrowDown' };
    // Some layouts report Shift+/ as "/" instead of "?"
    if (key === '?' && e.key === '/' && e.shiftKey) return true;
    return (named[key] || key) === e.key;
  }

  static matches(e, combo) {
    const want = ShortcutRegistry.parse(combo);
    const hasMod = e.metaKey || e.ctrlKey;
    if (want.mod !== hasMod || want.alt !== e.altKey) return false;
    // "?" and similar symbols need Shift to type; don't require it explicitly
    const symbol = want.key.length === 1 && !/[a-z0-9]/.test(want.key);
    if (!symbol && want.shift !== e.shiftKey) return false;
    return ShortcutRegistry.keyMatches(e, want.key);
  }

  static isTyping(target) {
    if (!target || !target.tagName) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;
  }

  handle(e) {
    if (e.defaultPrevented || e.isComposing) return;
    const modalOpen = !!document.querySelector('[data-kb-modal]');
    const typing = ShortcutRegistry.isTyping(e.target);
    for (const item of this.items) {
      if (!item.action || !ShortcutRegistry.matches(e, item.keys)) continue;
      const { mod, alt } = ShortcutRegistry.parse(item.keys);
      if (typing && !mod && !alt) continue;
      if (modalOpen && !item.allowInModal) continue;
      // An action returns false when it had nothing to do, so the key keeps its default behavior
      if (item.action(e) !== false) e.preventDefault();
      return;
    }
  }
}

(function registerAppShortcuts() {
  const click = (id) => {
    const el = document.getElementById(id);
    if (el && !el.disabled) el.click();
  };
  const focusGoal = () => {
    const input = document.getElementById('goal-input');
    if (input) {
      input.disabled ? input.scrollIntoView({ block: 'nearest' }) : input.focus();
    }
  };

  const registry = new ShortcutRegistry();

  registry
    .register({ id: 'palette.toggle', keys: 'mod+k', category: 'General', description: 'Open command palette', allowInModal: true, action: () => window.CommandPaletteInstance?.toggle() })
    .register({ id: 'shortcuts.toggle', keys: 'mod+?', category: 'General', description: 'Show keyboard shortcuts', allowInModal: true, action: () => window.ShortcutsReferenceInstance?.toggle() })
    .register({ id: 'notifications.toggle', keys: 'alt+n', category: 'General', description: 'Toggle notifications', action: () => window.NotificationCenterInstance?.toggle() })
    .register({ id: 'theme.cycle', keys: 'alt+t', category: 'General', description: 'Cycle theme (light / dark / system)', action: () => window.ThemeSwitcherInstance?.cycle() })
    .register({ id: 'dialog.close', keys: 'escape', category: 'General', description: 'Close dialog or panel', allowInModal: true, action: () => {
      // Backstop for when focus left the dialog (overlays also handle Escape themselves)
      const open = [window.CommandPaletteInstance, window.ShortcutsReferenceInstance, window.NotificationCenterInstance].find((m) => m && m.isOpen());
      if (!open) return false;
      open.close();
    } })

    .register({ id: 'goal.focus', keys: '/', category: 'Navigation', description: 'Focus goal input', action: focusGoal })
    .register({ id: 'models.refresh', keys: 'alt+m', category: 'Navigation', description: 'Refresh model list', action: () => click('refresh-models') })

    .register({ id: 'run.start', keys: 'mod+enter', category: 'Run', description: 'Run goal', action: () => click('run-goal') })
    .register({ id: 'run.stop', keys: 'mod+.', category: 'Run', description: 'Stop current run', action: () => click('stop-goal') })
    .register({ id: 'terminal.clear', keys: 'alt+l', category: 'Run', description: 'Clear terminal', action: () => click('clear-chat') })

    .register({ id: 'workflow.builder', keys: 'alt+w', category: 'Workflow', description: 'Go to workflow builder', action: () => {
      document.getElementById('workflow-builder-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('workflow-name')?.focus();
    } })
    .register({ id: 'workflow.load', keys: 'alt+shift+w', category: 'Workflow', description: 'Load saved workflow', action: () => click('workflow-load') })

    .register({ id: 'profile.switch', keys: 'alt+p', category: 'Profile', description: 'Open profile switcher', action: () => click('profile-button') })

    .register({ id: 'palette.nav', keys: 'arrowup+arrowdown', category: 'Command palette', description: 'Move selection' })
    .register({ id: 'palette.select', keys: 'enter', category: 'Command palette', description: 'Run selected item' });

  window.Shortcuts = registry;
  window.ShortcutRegistry = ShortcutRegistry;
})();
