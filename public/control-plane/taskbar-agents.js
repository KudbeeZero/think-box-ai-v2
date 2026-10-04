/**
 * Taskbar Agents Panel — Live list of running agents in the taskbar
 * Shows badge with running count and dropdown of active/recent agents
 */

class TaskbarAgents {
  constructor() {
    this.registry = window.AgentRegistry;
    this.governanceWindow = window.GovernanceWindowInstance;
    this.container = null;
    this.badgeElement = null;
    this.dropdownElement = null;
    this.isDropdownOpen = false;
    this.setupStyles();
    this.setupTaskbarPanel();
    this.setupEventListeners();
  }

  /**
   * Inject CSS styles for taskbar panel
   * @private
   */
  setupStyles() {
    if (document.getElementById('taskbar-agents-styles')) return;

    const style = document.createElement('style');
    style.id = 'taskbar-agents-styles';
    style.textContent = `
      .taskbar-agents {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .taskbar-agents-button {
        position: relative;
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        transition: all 0.2s;
        color: var(--color-text-primary);
        font-weight: 500;
      }

      .taskbar-agents-button:hover {
        background: var(--color-bg-elevated);
        border-color: var(--color-text-tertiary);
      }

      .taskbar-agents-badge {
        background: var(--color-success);
        color: white;
        border-radius: 12px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--text-xs);
        font-weight: 600;
      }

      .taskbar-agents-badge.warning {
        background: var(--color-warning);
      }

      .taskbar-agents-badge.empty {
        background: var(--color-border);
        color: var(--color-text-tertiary);
      }

      .taskbar-agents-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: var(--space-2);
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        min-width: 280px;
        max-width: 400px;
        max-height: 400px;
        overflow-y: auto;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        z-index: 999;
        display: none;
      }

      .taskbar-agents-dropdown.open {
        display: block;
      }

      .taskbar-agents-dropdown-header {
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--color-border);
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-tertiary);
      }

      .taskbar-agents-list {
        padding: var(--space-2);
      }

      .taskbar-agent-item {
        padding: var(--space-3);
        margin-bottom: var(--space-2);
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .taskbar-agent-item:last-child {
        margin-bottom: 0;
      }

      .taskbar-agent-item:hover {
        background: var(--color-bg-card);
        border-color: var(--color-text-tertiary);
      }

      .taskbar-agent-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-2);
      }

      .taskbar-agent-item-id {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
      }

      .taskbar-agent-item-status {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: var(--text-xs);
        font-weight: 600;
      }

      .taskbar-agent-item-status.running {
        background: var(--color-success);
        color: white;
      }

      .taskbar-agent-item-status.awaiting {
        background: var(--color-warning);
        color: white;
      }

      .taskbar-agent-item-status.completed {
        background: var(--color-info);
        color: white;
      }

      .taskbar-agent-item-status.failed {
        background: var(--color-danger);
        color: white;
      }

      .taskbar-agent-item-status.idle {
        background: var(--color-border);
        color: var(--color-text-secondary);
      }

      .taskbar-agent-item-goal {
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        margin-bottom: var(--space-2);
        line-height: 1.3;
        max-height: 3em;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .taskbar-agent-item-stats {
        display: flex;
        justify-content: space-between;
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        padding-top: var(--space-2);
        border-top: 1px solid var(--color-border);
      }

      .taskbar-agents-empty {
        padding: var(--space-4);
        text-align: center;
        color: var(--color-text-tertiary);
        font-size: var(--text-sm);
      }

      @media (max-width: 768px) {
        .taskbar-agents-dropdown {
          min-width: 240px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup the taskbar panel
   * @private
   */
  setupTaskbarPanel() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'taskbar-agents';
    this.container.id = 'taskbar-agents-panel';

    // Create button
    const button = document.createElement('button');
    button.className = 'taskbar-agents-button';
    button.innerHTML = `
      <span>Agents</span>
      <div class="taskbar-agents-badge empty">0</div>
    `;
    button.addEventListener('click', () => this.toggleDropdown());

    this.badgeElement = button.querySelector('.taskbar-agents-badge');

    // Create dropdown
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'taskbar-agents-dropdown';
    this.dropdownElement.innerHTML = `
      <div class="taskbar-agents-dropdown-header">Active Agents</div>
      <div class="taskbar-agents-list" id="taskbar-agents-list">
        <div class="taskbar-agents-empty">No agents running</div>
      </div>
    `;

    this.container.appendChild(button);
    this.container.appendChild(this.dropdownElement);

    // Try to insert into taskbar if it exists
    const taskbar = document.querySelector('[data-taskbar]') ||
                   document.querySelector('.taskbar') ||
                   document.querySelector('[class*="taskbar"]');

    if (taskbar) {
      taskbar.appendChild(this.container);
    } else {
      // Fallback: insert into control plane if visible
      if (document.getElementById('main')) {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 998;
        `;
        placeholder.appendChild(this.container);
        document.body.appendChild(placeholder);
      }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target) && this.isDropdownOpen) {
        this.closeDropdown();
      }
    });
  }

  /**
   * Setup event listeners for agent updates
   * @private
   */
  setupEventListeners() {
    this.registry.on('agents:changed', (data) => {
      this.updatePanel(data.agents);
    });

    this.registry.on('agent:approval_requested', (data) => {
      // Highlight with warning if approval needed
      this.updateBadgeColor(true);
    });
  }

  /**
   * Update the taskbar panel with agent list
   * @private
   */
  updatePanel(agents) {
    const runningCount = agents.filter(a =>
      a.status === 'running' || a.status === 'awaiting_approval'
    ).length;

    // Update badge
    this.updateBadge(runningCount, agents);

    // Update dropdown list
    this.updateDropdownList(agents);
  }

  /**
   * Update badge with running count
   * @private
   */
  updateBadge(count, agents) {
    if (!this.badgeElement) return;

    this.badgeElement.textContent = count;
    this.badgeElement.className = 'taskbar-agents-badge';

    if (count === 0) {
      this.badgeElement.classList.add('empty');
    } else {
      // Check if any agents are awaiting approval
      const awaitingApproval = agents.some(a => a.status === 'awaiting_approval');
      if (awaitingApproval) {
        this.badgeElement.classList.add('warning');
      }
    }
  }

  /**
   * Update badge color based on state
   * @private
   */
  updateBadgeColor(hasApproval) {
    if (!this.badgeElement) return;

    if (hasApproval) {
      this.badgeElement.classList.add('warning');
    }
  }

  /**
   * Update dropdown list with agents
   * @private
   */
  updateDropdownList(agents) {
    const list = this.dropdownElement.querySelector('#taskbar-agents-list');
    if (!list) return;

    if (agents.length === 0) {
      list.innerHTML = '<div class="taskbar-agents-empty">No agents running</div>';
      return;
    }

    // Sort agents: awaiting approval first, then running, then others
    const sorted = agents.sort((a, b) => {
      const priorityMap = { 'awaiting_approval': 0, 'running': 1, 'completed': 2, 'failed': 3, 'idle': 4 };
      const aPriority = priorityMap[a.status] || 5;
      const bPriority = priorityMap[b.status] || 5;
      return aPriority - bPriority;
    });

    list.innerHTML = sorted.map(agent => `
      <div class="taskbar-agent-item" onclick="window.TaskbarAgentsInstance?.openAgent('${agent.id}', event)">
        <div class="taskbar-agent-item-header">
          <div class="taskbar-agent-item-id">${agent.id.substring(0, 12)}</div>
          <span class="taskbar-agent-item-status ${this.getStatusClass(agent.status)}">
            ${this.formatStatus(agent.status)}
          </span>
        </div>
        <div class="taskbar-agent-item-goal">${this.escapeHtml(agent.goal)}</div>
        <div class="taskbar-agent-item-stats">
          <span>Steps: ${agent.stepsCompleted || 0}</span>
          <span>Tokens: ${agent.tokensUsed || 0}</span>
          ${agent.approvalPending && agent.approvalPending.length > 0 ? `<span style="color: var(--color-warning);">⚠️ ${agent.approvalPending.length} approval(s)</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Toggle dropdown visibility
   * @public
   */
  toggleDropdown() {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open dropdown
   * @private
   */
  openDropdown() {
    this.dropdownElement.classList.add('open');
    this.isDropdownOpen = true;
  }

  /**
   * Close dropdown
   * @private
   */
  closeDropdown() {
    this.dropdownElement.classList.remove('open');
    this.isDropdownOpen = false;
  }

  /**
   * Open governance window for an agent
   * @param {string} agentId
   * @param {Event} event
   */
  openAgent(agentId, event) {
    event.stopPropagation();
    const agent = this.registry.getAgent(agentId);
    if (agent) {
      this.governanceWindow.openWindow(agentId, agent);
    }
    this.closeDropdown();
  }

  /**
   * Get status class for badge styling
   * @private
   */
  getStatusClass(status) {
    const statusMap = {
      'running': 'running',
      'awaiting_approval': 'awaiting',
      'completed': 'completed',
      'failed': 'failed',
      'idle': 'idle',
    };
    return statusMap[status] || 'idle';
  }

  /**
   * Format status for display
   * @private
   */
  formatStatus(status) {
    return status
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Export singleton instance
window.TaskbarAgentsInstance = window.TaskbarAgentsInstance || new TaskbarAgents();
