/**
 * Actions Button — Run saved workflows and quick actions
 * Integrates with workflow builder and terminal
 */

class ActionsButton {
  constructor() {
    this.setupButton();
    this.setupWorkflowListener();
  }

  setupButton() {
    const btn = document.getElementById('actions-button');
    if (!btn) return;

    // Enable the button
    btn.disabled = false;
    btn.addEventListener('click', () => this.showActionsMenu());
  }

  setupWorkflowListener() {
    document.addEventListener('workflow-saved', (e) => {
      const { workflow } = e.detail;
      console.log('[ActionsButton] Workflow saved:', workflow.name);
      // Update button state if needed
    });
  }

  showActionsMenu() {
    const workflows = this.getWorkflows();

    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'actions-menu';
    menu.innerHTML = `
      <div class="actions-menu-header">Quick Actions</div>
      <div class="actions-menu-divider"></div>

      <div class="actions-menu-section">
        <div class="actions-menu-title">Saved Workflows</div>
        ${workflows.length > 0 ? `
          <div class="actions-menu-items">
            ${workflows.map(w => `
              <div class="actions-menu-item" onclick="window.ActionsButtonInstance?.runWorkflow('${w.id}')">
                <span class="action-icon">⚙️</span>
                <span class="action-name">${w.name}</span>
                <span class="action-meta">${w.steps.length} steps</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="actions-menu-empty">No workflows saved</div>
        `}
      </div>

      <div class="actions-menu-divider"></div>

      <div class="actions-menu-section">
        <div class="actions-menu-item" onclick="window.ActionsButtonInstance?.openWorkflowBuilder()">
          <span class="action-icon">✏️</span>
          <span class="action-name">Create Workflow</span>
        </div>
        <div class="actions-menu-item" onclick="window.ActionsButtonInstance?.openWorkflowManager()">
          <span class="action-icon">📋</span>
          <span class="action-name">Manage Workflows</span>
        </div>
      </div>
    `;

    menu.addEventListener('click', (e) => {
      if (!e.target.closest('.actions-menu-item')) {
        e.stopPropagation();
      }
    });

    // Position menu relative to button
    const btn = document.getElementById('actions-button');
    const rect = btn.getBoundingClientRect();
    menu.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 8}px;
      right: ${window.innerWidth - rect.right}px;
      z-index: 1000;
    `;

    document.body.appendChild(menu);

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);

    return menu;
  }

  runWorkflow(workflowId) {
    const builder = window.WorkflowBuilderInstance;
    if (!builder) {
      console.error('Workflow builder not initialized');
      return;
    }

    const workflow = builder.getWorkflow(workflowId);
    if (!workflow) {
      this.showMessage('Workflow not found', 'error');
      return;
    }

    const input = document.getElementById('goal-input');
    if (!input) {
      this.showMessage('Terminal input not found', 'error');
      return;
    }

    // Build workflow command
    const workflowCommand = builder.getWorkflowsAsString();

    // Set input and trigger run
    input.value = workflowCommand;

    // Dispatch run goal
    if (typeof runGoal === 'function') {
      this.showMessage(`Running workflow: ${workflow.name}`, 'success');
      runGoal();
    } else {
      // Fallback: find and click run button
      const runBtn = document.getElementById('run-goal') || document.getElementById('submit-goal');
      if (runBtn) {
        this.showMessage(`Running workflow: ${workflow.name}`, 'success');
        runBtn.click();
      }
    }

    // Close any open menu
    document.querySelectorAll('.actions-menu').forEach(m => m.remove());
  }

  openWorkflowBuilder() {
    // Scroll to workflow builder panel if it exists
    const builderPanel = document.getElementById('workflow-builder-panel');
    if (builderPanel) {
      builderPanel.scrollIntoView({ behavior: 'smooth' });
      this.showMessage('Workflow builder opened', 'info');
    } else {
      this.showMessage('Workflow builder not found on this page', 'error');
    }

    // Close any open menu
    document.querySelectorAll('.actions-menu').forEach(m => m.remove());
  }

  openWorkflowManager() {
    const builder = window.WorkflowBuilderInstance;
    if (!builder) {
      this.showMessage('Workflow builder not initialized', 'error');
      return;
    }

    builder.showLoadDialog();

    // Close any open menu
    document.querySelectorAll('.actions-menu').forEach(m => m.remove());
  }

  getWorkflows() {
    const builder = window.WorkflowBuilderInstance;
    if (!builder) return [];
    return builder.getAllWorkflows();
  }

  showMessage(message, type = 'info') {
    const builder = window.WorkflowBuilderInstance;
    if (builder) {
      builder.showMessage(message, type);
    } else if (typeof showToast === 'function') {
      showToast(message, type);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ActionsButtonInstance = new ActionsButton();
  });
} else {
  window.ActionsButtonInstance = new ActionsButton();
}
