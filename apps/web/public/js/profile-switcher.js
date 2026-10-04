// Profile Switcher — UI for switching and managing profiles

class ProfileSwitcher {
  constructor() {
    this.setupButton();
    this.setupEventListeners();
    this.render();
  }

  setupButton() {
    const headerCenter = document.querySelector('.header-center');
    if (!headerCenter) return;

    const container = document.createElement('div');
    container.className = 'profile-switcher-container';
    container.id = 'profile-switcher-container';
    container.innerHTML = `
      <div class="profile-switcher">
        <button id="profile-button" class="btn-secondary profile-button" title="Switch profile">
          📋 <span id="profile-name">Main</span>
        </button>
        <div id="profile-dropdown" class="profile-dropdown hidden">
          <div class="profile-list"></div>
          <div class="profile-actions">
            <button class="profile-action-btn" id="profile-new-btn">＋ New Profile</button>
          </div>
        </div>
      </div>
    `;

    headerCenter.appendChild(container);
  }

  setupEventListeners() {
    const btn = document.getElementById('profile-button');
    const dropdown = document.getElementById('profile-dropdown');

    if (btn) {
      btn.addEventListener('click', () => {
        dropdown.classList.toggle('hidden');
        this.render();
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.profile-switcher')) {
        dropdown?.classList.add('hidden');
      }
    });

    document.getElementById('profile-new-btn')?.addEventListener('click', () => {
      this.showNewProfileDialog();
    });

    document.addEventListener('profile:changed', () => {
      this.updateProfileName();
    });
  }

  updateProfileName() {
    const activeProfile = window.ProfileManagerInstance.getActiveProfile();
    const nameEl = document.getElementById('profile-name');
    if (nameEl) {
      nameEl.textContent = activeProfile?.name || 'Unknown';
    }
  }

  render() {
    const list = document.querySelector('.profile-list');
    if (!list) return;

    const profiles = window.ProfileManagerInstance.getAllProfiles();
    const activeProfile = window.ProfileManagerInstance.getActiveProfile();

    list.innerHTML = profiles.map(profile => `
      <div class="profile-item ${profile.id === activeProfile.id ? 'active' : ''}">
        <div class="profile-item-header">
          <button class="profile-select-btn" data-profile-id="${profile.id}">
            ${profile.name} ${profile.id === activeProfile.id ? '✓' : ''}
          </button>
          <div class="profile-item-actions">
            <button class="profile-item-action" data-action="rename" data-profile-id="${profile.id}" title="Rename">✏️</button>
            <button class="profile-item-action" data-action="export" data-profile-id="${profile.id}" title="Export">💾</button>
            ${profiles.length > 1 ? `<button class="profile-item-action" data-action="delete" data-profile-id="${profile.id}" title="Delete">🗑️</button>` : ''}
          </div>
        </div>
        <div class="profile-item-meta">
          ${profile.runIds.length} runs • ${new Date(profile.updated_at).toLocaleDateString()}
        </div>
      </div>
    `).join('');

    this.attachProfileListeners();
  }

  attachProfileListeners() {
    // Switch profile
    document.querySelectorAll('.profile-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const profileId = e.target.dataset.profileId;
        window.ProfileManagerInstance.switchProfile(profileId);
        document.getElementById('profile-dropdown').classList.add('hidden');
        this.onProfileSwitched();
      });
    });

    // Profile actions
    document.querySelectorAll('.profile-item-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.dataset.action;
        const profileId = e.target.dataset.profileId;
        this.handleProfileAction(action, profileId);
      });
    });
  }

  handleProfileAction(action, profileId) {
    switch (action) {
      case 'rename':
        this.showRenameDialog(profileId);
        break;
      case 'delete':
        this.showDeleteDialog(profileId);
        break;
      case 'export':
        this.exportProfile(profileId);
        break;
    }
  }

  showNewProfileDialog() {
    const name = prompt('Enter profile name:');
    if (name && name.trim()) {
      const profile = window.ProfileManagerInstance.createProfile(name.trim());
      window.ProfileManagerInstance.switchProfile(profile.id);
      this.render();
      this.onProfileSwitched();
    }
  }

  showRenameDialog(profileId) {
    const profile = window.ProfileManagerInstance.profiles.get(profileId);
    if (!profile) return;

    const newName = prompt('Enter new name:', profile.name);
    if (newName && newName.trim()) {
      window.ProfileManagerInstance.renameProfile(profileId, newName.trim());
      this.render();
    }
  }

  showDeleteDialog(profileId) {
    const profile = window.ProfileManagerInstance.profiles.get(profileId);
    if (!profile) return;

    if (confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) {
      const wasActive = profile.id === window.ProfileManagerInstance.activeProfileId;
      window.ProfileManagerInstance.deleteProfile(profileId);
      this.render();
      if (wasActive) {
        this.onProfileSwitched();
      }
    }
  }

  exportProfile(profileId) {
    const exportData = window.ProfileManagerInstance.exportProfile(profileId);
    if (!exportData) return;

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-${exportData.profile.name}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importProfile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result);
          const newProfile = window.ProfileManagerInstance.importProfile(importData);
          if (newProfile) {
            window.ProfileManagerInstance.switchProfile(newProfile.id);
            this.render();
            this.onProfileSwitched();
            appendTerminalMessage('system', `✓ Profile imported: ${newProfile.name}`);
          }
        } catch (err) {
          console.error('Error importing profile:', err);
          appendTerminalMessage('error', `Failed to import profile: ${err.message}`);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  onProfileSwitched() {
    this.updateProfileName();

    // Emit event for app.js to reload state
    document.dispatchEvent(new CustomEvent('profile:switched', {
      detail: { profile: window.ProfileManagerInstance.getActiveProfile() }
    }));
  }
}

// Singleton instance
window.ProfileSwitcherInstance = new ProfileSwitcher();
