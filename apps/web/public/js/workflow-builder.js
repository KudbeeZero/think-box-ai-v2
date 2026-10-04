/**
 * Workflow Builder — Create and manage agent workflows
 * Saves workflows to localStorage and dispatches workflow-saved events
 */

class WorkflowBuilder {
  constructor() {
    this.currentWorkflow = this.createEmptyWorkflow();
    this.setupEventListeners();
  }

  createEmptyWorkflow() {
    return {
      id: `workflow-${Date.now()}`,
      name: 'Untitled Workflow',
      description: '',
      steps: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  setupEventListeners() {
    // Save button
    const saveBtn = document.getElementById('workflow-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveWorkflow());
    }

    // Load button
    const loadBtn = document.getElementById('workflow-load');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.showLoadDialog());
    }

    // Clear button
    const clearBtn = document.getElementById('workflow-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearWorkflow());
    }

    // Name input
    const nameInput = document.getElementById('workflow-name');
    if (nameInput) {
      nameInput.addEventListener('change', (e) => {
        this.currentWorkflow.name = e.target.value || 'Untitled Workflow';
      });
    }

    // Description input
    const descInput = document.getElementById('workflow-description');
    if (descInput) {
      descInput.addEventListener('change', (e) => {
        this.currentWorkflow.description = e.target.value;
      });
    }

    // Add step button
    const addStepBtn = document.getElementById('workflow-add-step');
    if (addStepBtn) {
      addStepBtn.addEventListener('click', () => this.addStep());
    }
  }

  addStep(tool = '', args = '') {
    const step = {
      id: `step-${Date.now()}`,
      tool: tool || '',
      args: args || '',
      enabled: true,
    };

    this.currentWorkflow.steps.push(step);
    this.renderSteps();
    return step.id;
  }

  removeStep(stepId) {
    this.currentWorkflow.steps = this.currentWorkflow.steps.filter(s => s.id !== stepId);
    this.renderSteps();
  }

  updateStep(stepId, updates) {
    const step = this.currentWorkflow.steps.find(s => s.id === stepId);
    if (step) {
      Object.assign(step, updates);
      this.renderSteps();
    }
  }

  renderSteps() {
    const container = document.getElementById('workflow-steps');
    if (!container) return;

    if (this.currentWorkflow.steps.length === 0) {
      container.innerHTML = '<div class="empty-state">No steps yet. Add a step to get started.</div>';
      return;
    }

    container.innerHTML = this.currentWorkflow.steps.map(step => `
      <div class="workflow-step" data-step-id="${step.id}">
        <div class="step-header">
          <input type="text" class="step-tool" value="${step.tool}" placeholder="Tool name" data-step-id="${step.id}">
          <label class="step-enabled">
            <input type="checkbox" ${step.enabled ? 'checked' : ''} data-step-id="${step.id}" class="step-toggle-enabled">
            Enabled
          </label>
          <button class="btn-icon btn-danger" onclick="window.WorkflowBuilderInstance?.removeStep('${step.id}')">✕</button>
        </div>
        <div class="step-body">
          <textarea class="step-args" placeholder="Arguments (JSON or text)" data-step-id="${step.id}">${step.args}</textarea>
        </div>
      </div>
    `).join('');

    // Attach event listeners to dynamically created elements
    container.querySelectorAll('.step-tool').forEach(input => {
      input.addEventListener('change', (e) => {
        const stepId = e.target.getAttribute('data-step-id');
        this.updateStep(stepId, { tool: e.target.value });
      });
    });

    container.querySelectorAll('.step-args').forEach(textarea => {
      textarea.addEventListener('change', (e) => {
        const stepId = e.target.getAttribute('data-step-id');
        this.updateStep(stepId, { args: e.target.value });
      });
    });

    container.querySelectorAll('.step-toggle-enabled').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const stepId = e.target.getAttribute('data-step-id');
        this.updateStep(stepId, { enabled: e.target.checked });
      });
    });
  }

  clearWorkflow() {
    if (confirm('Clear current workflow? This cannot be undone.')) {
      this.currentWorkflow = this.createEmptyWorkflow();
      this.renderUI();
      document.getElementById('workflow-name').value = this.currentWorkflow.name;
      document.getElementById('workflow-description').value = this.currentWorkflow.description;
    }
  }

  saveWorkflow() {
    if (!this.currentWorkflow.name.trim()) {
      this.showMessage('Please enter a workflow name', 'error');
      return;
    }

    // Update timestamp
    this.currentWorkflow.updatedAt = new Date().toISOString();

    // Save to localStorage
    const key = `kudbee:workflows:${this.currentWorkflow.id}`;
    const workflows = this.getAllWorkflows();

    // Update or add workflow
    const existingIndex = workflows.findIndex(w => w.id === this.currentWorkflow.id);
    if (existingIndex >= 0) {
      workflows[existingIndex] = this.currentWorkflow;
    } else {
      workflows.push(this.currentWorkflow);
    }

    // Save workflows list
    localStorage.setItem('kudbee:workflows', JSON.stringify(workflows));
    localStorage.setItem(key, JSON.stringify(this.currentWorkflow));

    this.showMessage(`Workflow "${this.currentWorkflow.name}" saved successfully`, 'success');

    // Dispatch custom event
    const event = new CustomEvent('workflow-saved', {
      detail: { workflow: this.currentWorkflow },
    });
    document.dispatchEvent(event);
  }

  getAllWorkflows() {
    try {
      const list = localStorage.getItem('kudbee:workflows');
      return list ? JSON.parse(list) : [];
    } catch (e) {
      console.error('Error loading workflows:', e);
      return [];
    }
  }

  getWorkflow(id) {
    try {
      const key = `kudbee:workflows:${id}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading workflow:', e);
      return null;
    }
  }

  loadWorkflow(id) {
    const workflow = this.getWorkflow(id);
    if (!workflow) {
      this.showMessage('Workflow not found', 'error');
      return false;
    }

    this.currentWorkflow = workflow;
    this.renderUI();
    this.showMessage(`Workflow "${workflow.name}" loaded`, 'success');
    return true;
  }

  deleteWorkflow(id) {
    if (confirm('Delete this workflow? This cannot be undone.')) {
      const workflows = this.getAllWorkflows().filter(w => w.id !== id);
      localStorage.setItem('kudbee:workflows', JSON.stringify(workflows));
      localStorage.removeItem(`kudbee:workflows:${id}`);
      this.showMessage('Workflow deleted', 'success');
      return true;
    }
    return false;
  }

  exportWorkflow() {
    const data = JSON.stringify(this.currentWorkflow, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.currentWorkflow.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importWorkflow(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target.result);
        workflow.id = `workflow-${Date.now()}`;
        workflow.createdAt = new Date().toISOString();
        workflow.updatedAt = new Date().toISOString();

        this.currentWorkflow = workflow;
        this.renderUI();
        this.showMessage(`Workflow "${workflow.name}" imported`, 'success');
      } catch (error) {
        this.showMessage('Invalid workflow file', 'error');
      }
    };
    reader.readAsText(file);
  }

  showLoadDialog() {
    const workflows = this.getAllWorkflows();

    if (workflows.length === 0) {
      this.showMessage('No saved workflows yet', 'info');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'workflow-modal-overlay';
    modal.innerHTML = `
      <div class="workflow-modal">
        <div class="modal-header">
          <h2>Load Workflow</h2>
          <button class="btn-close" onclick="this.closest('.workflow-modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="workflow-list">
            ${workflows.map(w => `
              <div class="workflow-item">
                <div class="workflow-item-header">
                  <h3>${w.name}</h3>
                  <span class="workflow-date">${new Date(w.updatedAt).toLocaleDateString()}</span>
                </div>
                ${w.description ? `<p class="workflow-description">${w.description}</p>` : ''}
                <div class="workflow-meta">
                  <span>${w.steps.length} step${w.steps.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="workflow-actions">
                  <button class="btn-primary" onclick="window.WorkflowBuilderInstance?.loadWorkflow('${w.id}'); this.closest('.workflow-modal-overlay').remove();">Load</button>
                  <button class="btn-secondary" onclick="window.WorkflowBuilderInstance?.deleteWorkflow('${w.id}'); location.reload();">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  renderUI() {
    const nameInput = document.getElementById('workflow-name');
    const descInput = document.getElementById('workflow-description');

    if (nameInput) nameInput.value = this.currentWorkflow.name;
    if (descInput) descInput.value = this.currentWorkflow.description;

    this.renderSteps();
  }

  showMessage(message, type = 'info') {
    // Use existing toast system if available, otherwise create one
    if (typeof showToast === 'function') {
      showToast(message, type);
    } else {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 6px;
        font-size: 14px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }

  getWorkflowsAsString() {
    // Convert workflow to a readable string for sending as a goal
    const steps = this.currentWorkflow.steps
      .filter(s => s.enabled)
      .map(s => `${s.tool}(${s.args})`)
      .join(' -> ');

    return `Workflow: ${this.currentWorkflow.name}\nSteps: ${steps || '(no steps)'}`;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.WorkflowBuilderInstance = new WorkflowBuilder();
    window.WorkflowBuilderInstance.renderUI();
  });
} else {
  window.WorkflowBuilderInstance = new WorkflowBuilder();
  window.WorkflowBuilderInstance.renderUI();
}
