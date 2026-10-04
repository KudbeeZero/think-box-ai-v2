/**
 * Governance Window — Floating panel for agent monitoring and approval workflow
 * Shows agent details, think tokens, approval requests, and provides approval UI
 */

class GovernanceWindow {
  constructor() {
    this.windows = new Map();
    this.registry = window.AgentRegistry;
    this.setupStyles();
    this.setupEventListeners();
  }

  /**
   * Inject CSS styles for governance window
   * @private
   */
  setupStyles() {
    if (document.getElementById('governance-window-styles')) return;

    const style = document.createElement('style');
    style.id = 'governance-window-styles';
    style.textContent = `
      .gov-window {
        position: fixed;
        width: 380px;
        max-height: 600px;
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        z-index: 1000;
        font-family: var(--font-base);
        font-size: var(--text-sm);
      }

      .gov-window-header {
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .gov-window-title {
        font-size: var(--text-base);
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
      }

      .gov-window-agent-id {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        margin-top: var(--space-2);
      }

      .gov-window-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--color-text-secondary);
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gov-window-close:hover {
        color: var(--color-text-primary);
      }

      .gov-window-content {
        flex: 1;
        overflow-y: auto;
        padding: var(--space-4);
      }

      .gov-section {
        margin-bottom: var(--space-6);
      }

      .gov-section-title {
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-tertiary);
        margin-bottom: var(--space-2);
        font-family: var(--font-mono);
      }

      .gov-field {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--space-3);
      }

      .gov-field-label {
        color: var(--color-text-secondary);
      }

      .gov-field-value {
        color: var(--color-text-primary);
        font-weight: 500;
      }

      .gov-status-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: var(--text-xs);
        font-weight: 600;
      }

      .gov-status-running {
        background: var(--color-success);
        color: white;
      }

      .gov-status-awaiting {
        background: var(--color-warning);
        color: white;
      }

      .gov-status-completed {
        background: var(--color-info);
        color: white;
      }

      .gov-status-failed {
        background: var(--color-danger);
        color: white;
      }

      .gov-status-idle {
        background: var(--color-border);
        color: var(--color-text-secondary);
      }

      .gov-think-box {
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: var(--space-3);
        margin-bottom: var(--space-4);
      }

      .gov-think-box-token {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        word-break: break-all;
        margin-bottom: var(--space-2);
      }

      .gov-think-box-token:last-child {
        margin-bottom: 0;
      }

      .gov-approval {
        background: var(--color-warning);
        background: rgba(255, 194, 15, 0.1);
        border: 1px solid var(--color-warning);
        border-radius: 6px;
        padding: var(--space-3);
        margin-bottom: var(--space-4);
      }

      .gov-approval-icon {
        font-size: 18px;
        margin-right: var(--space-2);
        display: inline-block;
      }

      .gov-approval-title {
        font-weight: 600;
        margin-bottom: var(--space-2);
        color: var(--color-text-primary);
      }

      .gov-approval-reason {
        color: var(--color-text-secondary);
        margin-bottom: var(--space-3);
        line-height: 1.4;
      }

      .gov-approval-actions {
        display: flex;
        gap: var(--space-2);
      }

      .gov-button {
        flex: 1;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--color-bg-elevated);
        color: var(--color-text-primary);
        cursor: pointer;
        font-size: var(--text-sm);
        font-weight: 500;
        transition: all 0.2s;
      }

      .gov-button:hover {
        background: var(--color-bg-card);
        border-color: var(--color-text-tertiary);
      }

      .gov-button-approve {
        background: var(--color-success);
        color: white;
        border-color: var(--color-success);
      }

      .gov-button-approve:hover {
        background: var(--color-success);
        opacity: 0.9;
      }

      .gov-button-reject {
        background: var(--color-danger);
        color: white;
        border-color: var(--color-danger);
      }

      .gov-button-reject:hover {
        background: var(--color-danger);
        opacity: 0.9;
      }

      .gov-empty-state {
        text-align: center;
        color: var(--color-text-tertiary);
        padding: var(--space-4);
      }

      .gov-window-footer {
        padding: var(--space-3) var(--space-4);
        border-top: 1px solid var(--color-border);
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
      }

      @media (max-width: 768px) {
        .gov-window {
          width: calc(100% - 20px);
          max-height: 80vh;
          left: 10px !important;
          right: 10px !important;
          bottom: 10px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners for agent updates
   * @private
   */
  setupEventListeners() {
    this.registry.on('agent:updated', (agent) => {
      if (this.windows.has(agent.id)) {
        this.updateWindowContent(agent.id, agent);
      }
    });

    this.registry.on('agent:approval_requested', (data) => {
      if (this.windows.has(data.agent.id)) {
        this.updateWindowContent(data.agent.id, data.agent);
      }
    });

    this.registry.on('agent:completed', (agent) => {
      if (this.windows.has(agent.id)) {
        this.updateWindowContent(agent.id, agent);
      }
    });

    // Custom event from app for approval resolution
    document.addEventListener('approval:resolved', (e) => {
      const { agentId, approvalId, approved } = e.detail;
      this.registry.resolveApproval(agentId, approvalId, approved);
    });
  }

  /**
   * Open or focus a governance window for an agent
   * @param {string} agentId
   * @param {Object} agent
   */
  openWindow(agentId, agent) {
    if (!agent) {
      agent = this.registry.getAgent(agentId);
    }

    if (!agent) return;

    if (this.windows.has(agentId)) {
      // Focus existing window
      const existingWindow = this.windows.get(agentId);
      existingWindow.element.style.zIndex = this.getNextZIndex();
      return existingWindow;
    }

    // Create new window
    const windowId = `gov-window-${agentId}`;
    const element = document.createElement('div');
    element.id = windowId;
    element.className = 'gov-window';
    element.style.right = '20px';
    element.style.bottom = `${20 + (this.windows.size * 30)}px`;

    document.body.appendChild(element);

    const window = {
      id: windowId,
      agentId,
      element,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    };

    this.windows.set(agentId, window);
    this.updateWindowContent(agentId, agent);
    this.makeDraggable(window);

    element.style.zIndex = this.getNextZIndex();

    return window;
  }

  /**
   * Close a governance window
   * @param {string} agentId
   */
  closeWindow(agentId) {
    if (this.windows.has(agentId)) {
      const window = this.windows.get(agentId);
      window.element.remove();
      this.windows.delete(agentId);
    }
  }

  /**
   * Update window content for an agent
   * @private
   */
  updateWindowContent(agentId, agent) {
    const window = this.windows.get(agentId);
    if (!window) return;

    const statusClass = this.getStatusClass(agent.status);
    const approvalHTML = agent.approvalPending.length > 0
      ? this.renderApprovals(agentId, agent.approvalPending)
      : '';

    window.element.innerHTML = `
      <div class="gov-window-header">
        <div>
          <h3 class="gov-window-title">Agent ${agent.id.substring(0, 8)}</h3>
          <div class="gov-window-agent-id">${agent.id}</div>
        </div>
        <button class="gov-window-close" onclick="window.GovernanceWindowInstance?.closeWindow('${agentId}')">×</button>
      </div>
      <div class="gov-window-content">
        <div class="gov-section">
          <div class="gov-field">
            <span class="gov-field-label">Status</span>
            <span class="gov-field-value">
              <span class="gov-status-badge ${statusClass}">${this.formatStatus(agent.status)}</span>
            </span>
          </div>
          <div class="gov-field">
            <span class="gov-field-label">Goal</span>
            <span class="gov-field-value" title="${agent.goal}">${this.truncate(agent.goal, 40)}</span>
          </div>
          <div class="gov-field">
            <span class="gov-field-label">Steps</span>
            <span class="gov-field-value">${agent.stepsCompleted || 0}</span>
          </div>
          <div class="gov-field">
            <span class="gov-field-label">Tokens Used</span>
            <span class="gov-field-value">${agent.tokensUsed || 0}</span>
          </div>
          ${agent.runId ? `
            <div class="gov-field">
              <span class="gov-field-label">Run ID</span>
              <span class="gov-field-value" style="font-family: var(--font-mono); font-size: var(--text-xs);">${agent.runId.substring(0, 12)}</span>
            </div>
          ` : ''}
        </div>

        ${agent.thinkBoxId ? `
          <div class="gov-section">
            <div class="gov-section-title">Think Box</div>
            <div class="gov-think-box">
              <div class="gov-think-box-token">${agent.thinkBoxId}</div>
            </div>
          </div>
        ` : ''}

        ${approvalHTML}
      </div>
      <div class="gov-window-footer">
        Updated ${this.formatTime(agent.updatedAt)}
      </div>
    `;
  }

  /**
   * Render approval requests
   * @private
   */
  renderApprovals(agentId, approvals) {
    return approvals.map(approval => `
      <div class="gov-section">
        <div class="gov-approval">
          <div class="gov-approval-title">
            <span class="gov-approval-icon">⚠️</span>
            Approval Required
          </div>
          <div class="gov-approval-reason">${approval.reason}</div>
          <div class="gov-approval-actions">
            <button class="gov-button gov-button-approve" onclick="window.GovernanceWindowInstance?.handleApproval('${agentId}', '${approval.id}', true)">
              Approve
            </button>
            <button class="gov-button gov-button-reject" onclick="window.GovernanceWindowInstance?.handleApproval('${agentId}', '${approval.id}', false)">
              Reject
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Handle approval button click
   * @param {string} agentId
   * @param {string} approvalId
   * @param {boolean} approved
   */
  handleApproval(agentId, approvalId, approved) {
    // Dispatch custom event that app.js listens for
    const event = new CustomEvent('approval:resolve', {
      detail: { agentId, approvalId, approved },
    });
    document.dispatchEvent(event);

    // Update local state
    this.registry.resolveApproval(agentId, approvalId, approved);

    // Update UI
    const agent = this.registry.getAgent(agentId);
    if (agent) {
      this.updateWindowContent(agentId, agent);
    }
  }

  /**
   * Make a window draggable
   * @private
   */
  makeDraggable(window) {
    const header = window.element.querySelector('.gov-window-header');

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.gov-window-close')) return;

      window.isDragging = true;
      const rect = window.element.getBoundingClientRect();
      window.dragOffset.x = e.clientX - rect.left;
      window.dragOffset.y = e.clientY - rect.top;
      window.element.style.zIndex = this.getNextZIndex();
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!window.isDragging) return;

      window.element.style.left = `${e.clientX - window.dragOffset.x}px`;
      window.element.style.right = 'auto';
      window.element.style.top = `${e.clientY - window.dragOffset.y}px`;
      window.element.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      window.isDragging = false;
    });
  }

  /**
   * Get next z-index
   * @private
   */
  getNextZIndex() {
    let maxZ = 1000;
    this.windows.forEach(w => {
      const z = parseInt(w.element.style.zIndex) || 1000;
      if (z >= maxZ) maxZ = z + 1;
    });
    return maxZ;
  }

  /**
   * Get CSS class for agent status
   * @private
   */
  getStatusClass(status) {
    const statusMap = {
      'running': 'gov-status-running',
      'awaiting_approval': 'gov-status-awaiting',
      'completed': 'gov-status-completed',
      'failed': 'gov-status-failed',
      'idle': 'gov-status-idle',
    };
    return statusMap[status] || 'gov-status-idle';
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
   * Truncate text
   * @private
   */
  truncate(text, length) {
    return text.length > length ? text.substring(0, length) + '…' : text;
  }

  /**
   * Format time for display
   * @private
   */
  formatTime(date) {
    if (!date) return 'never';
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  /**
   * Get all open windows
   * @returns {Array}
   */
  getOpenWindows() {
    return Array.from(this.windows.values());
  }

  /**
   * Close all windows
   */
  closeAllWindows() {
    this.windows.forEach((w, agentId) => {
      this.closeWindow(agentId);
    });
  }
}

// Export singleton instance
window.GovernanceWindowInstance = window.GovernanceWindowInstance || new GovernanceWindow();
