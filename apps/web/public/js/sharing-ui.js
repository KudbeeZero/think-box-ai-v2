/**
 * Sharing UI Component
 * Provides UI for exporting and sharing runs
 */

class SharingUI {
  constructor() {
    this.currentRunId = null;
    this.init();
  }

  init() {
    // UI will be injected dynamically when a run is active
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('run-started', (e) => {
      this.currentRunId = e.detail?.runId;
      this.showSharingPanel();
    });

    document.addEventListener('run-completed', (e) => {
      this.currentRunId = e.detail?.runId;
      this.updateSharingPanel();
    });
  }

  showSharingPanel() {
    if (!this.currentRunId) return;

    // Create panel if it doesn't exist
    if (!document.getElementById('sharing-panel')) {
      this.createPanel();
    }

    // Show panel
    const panel = document.getElementById('sharing-panel');
    if (panel) {
      panel.classList.remove('hidden');
    }
  }

  updateSharingPanel() {
    if (!this.currentRunId) return;

    // Refresh share list
    this.refreshShareList();
  }

  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'sharing-panel';
    panel.className = 'sharing-panel';
    panel.innerHTML = `
      <div class="sharing-header">
        <h3>📤 Share Run</h3>
        <button class="close-btn" onclick="window.SharingUIInstance.closePanel()">✕</button>
      </div>

      <div class="sharing-content">
        <!-- Export Section -->
        <div class="sharing-section">
          <div class="section-title">Export Run</div>
          <div class="export-buttons">
            <button class="export-btn" data-format="html" onclick="window.SharingUIInstance.exportRun('html')">
              📄 HTML
            </button>
            <button class="export-btn" data-format="markdown" onclick="window.SharingUIInstance.exportRun('markdown')">
              📝 Markdown
            </button>
            <button class="export-btn" data-format="json" onclick="window.SharingUIInstance.exportRun('json')">
              { } JSON
            </button>
          </div>
        </div>

        <!-- Share Section -->
        <div class="sharing-section">
          <div class="section-title">Create Share Link</div>
          <div class="share-options">
            <label>
              <input type="checkbox" id="share-expiry-toggle" onchange="window.SharingUIInstance.toggleExpiry()">
              Expire in
            </label>
            <select id="share-expiry-select" disabled onchange="window.SharingUIInstance.updateExpiryOption()">
              <option value="3600000">1 hour</option>
              <option value="86400000">1 day</option>
              <option value="604800000">1 week</option>
            </select>
          </div>
          <button class="share-btn" onclick="window.SharingUIInstance.createShareLink()">
            🔗 Create Share Link
          </button>
          <div id="share-status" class="share-status"></div>
        </div>

        <!-- Active Shares Section -->
        <div class="sharing-section">
          <div class="section-title">Active Shares</div>
          <div id="shares-list" class="shares-list">
            <p class="empty-state">No active shares</p>
          </div>
        </div>
      </div>
    `;

    // Add to document
    const targetContainer = document.querySelector('.sidebar-right') || document.querySelector('main');
    if (targetContainer) {
      targetContainer.appendChild(panel);
    }
  }

  async exportRun(format) {
    if (!this.currentRunId) {
      this.showMessage('No active run to export', 'error');
      return;
    }

    try {
      // Get sharing service
      const service = window.runSharingService;
      if (!service) {
        throw new Error('Sharing service not available');
      }

      const exports = service.exportRun(this.currentRunId);
      const content = exports[format] || exports.html;
      const filename = `run-${this.currentRunId}-${Date.now()}.${this.getFileExtension(format)}`;

      this.downloadFile(content, filename, this.getMimeType(format));
      this.showMessage(`✓ Exported as ${format}`, 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showMessage(`Failed to export: ${error.message}`, 'error');
    }
  }

  async createShareLink() {
    if (!this.currentRunId) {
      this.showMessage('No active run to share', 'error');
      return;
    }

    try {
      const service = window.runSharingService;
      if (!service) {
        throw new Error('Sharing service not available');
      }

      const expiryToggle = document.getElementById('share-expiry-toggle');
      const expirySelect = document.getElementById('share-expiry-select');

      const options = {};
      if (expiryToggle?.checked) {
        options.expiresIn = parseInt(expirySelect?.value || '3600000');
      }

      const result = service.createShare(this.currentRunId, options);

      // Show success message with link
      const statusDiv = document.getElementById('share-status');
      statusDiv.innerHTML = `
        <div class="share-result">
          <div class="share-link">
            <input type="text" value="${result.url}" readonly class="link-input">
            <button onclick="navigator.clipboard.writeText('${result.url}'); alert('Copied!')">Copy</button>
          </div>
          ${result.expiresAt ? `<div class="expiry-info">Expires: ${new Date(result.expiresAt).toLocaleString()}</div>` : ''}
        </div>
      `;

      this.refreshShareList();
      this.showMessage('✓ Share link created', 'success');
    } catch (error) {
      console.error('Share creation failed:', error);
      this.showMessage(`Failed to create share: ${error.message}`, 'error');
    }
  }

  async deleteShare(shareId) {
    if (!confirm('Delete this share link?')) return;

    try {
      const service = window.runSharingService;
      if (!service) {
        throw new Error('Sharing service not available');
      }

      const deleted = service.deleteShare(shareId);
      if (deleted) {
        this.refreshShareList();
        this.showMessage('✓ Share link deleted', 'success');
      }
    } catch (error) {
      console.error('Share deletion failed:', error);
      this.showMessage(`Failed to delete share: ${error.message}`, 'error');
    }
  }

  refreshShareList() {
    if (!this.currentRunId) return;

    try {
      const service = window.runSharingService;
      if (!service) {
        throw new Error('Sharing service not available');
      }

      const shares = service.getSharesForRun(this.currentRunId);
      const list = document.getElementById('shares-list');

      if (!list) return;

      if (shares.length === 0) {
        list.innerHTML = '<p class="empty-state">No active shares</p>';
        return;
      }

      list.innerHTML = shares.map(share => `
        <div class="share-item">
          <div class="share-info">
            <div class="share-url">
              <code>${share.url.substring(share.url.lastIndexOf('=') + 1)}</code>
            </div>
            <div class="share-meta">
              Created: ${new Date(share.createdAt).toLocaleString()} •
              Accessed: ${share.accessCount}x
              ${share.expiresAt ? `• Expires: ${new Date(share.expiresAt).toLocaleString()}` : ''}
            </div>
          </div>
          <button class="delete-btn" onclick="window.SharingUIInstance.deleteShare('${share.shareId}')">
            🗑️
          </button>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to refresh share list:', error);
      const list = document.getElementById('shares-list');
      if (list) {
        list.innerHTML = '<p class="empty-state error">Failed to load shares</p>';
      }
    }
  }

  toggleExpiry() {
    const toggle = document.getElementById('share-expiry-toggle');
    const select = document.getElementById('share-expiry-select');
    if (select) {
      select.disabled = !toggle?.checked;
    }
  }

  updateExpiryOption() {
    // Called when expiry option changes
    // No action needed; value is read when creating share
  }

  closePanel() {
    const panel = document.getElementById('sharing-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  showMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Could also show as toast notification
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getFileExtension(format) {
    const extensions = {
      html: 'html',
      markdown: 'md',
      json: 'json',
    };
    return extensions[format] || 'txt';
  }

  getMimeType(format) {
    const mimeTypes = {
      html: 'text/html; charset=utf-8',
      markdown: 'text/markdown; charset=utf-8',
      json: 'application/json; charset=utf-8',
    };
    return mimeTypes[format] || 'text/plain; charset=utf-8';
  }
}

// Singleton instance
window.SharingUIInstance = new SharingUI();
