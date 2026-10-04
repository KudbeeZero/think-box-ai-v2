// Profile Manager — Persistent profile storage and memory isolation
// Manages named profiles, each with isolated memory and run history

class ProfileManager {
  constructor() {
    this.profiles = new Map();
    this.activeProfileId = null;
    this.loadProfiles();
  }

  // Load all profiles from localStorage
  loadProfiles() {
    try {
      const profileList = JSON.parse(localStorage.getItem('kudbee:profiles') || '[]');
      profileList.forEach(profile => {
        this.profiles.set(profile.id, profile);
      });

      this.activeProfileId = localStorage.getItem('kudbee:activeProfile');

      // If no active profile, create default
      if (!this.activeProfileId || !this.profiles.has(this.activeProfileId)) {
        this.createDefaultProfile();
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      this.createDefaultProfile();
    }
  }

  // Create default "Main" profile
  createDefaultProfile() {
    const defaultProfile = {
      id: this.generateId(),
      name: 'Main',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activeMemoryId: null,
      runIds: []
    };
    this.profiles.set(defaultProfile.id, defaultProfile);
    this.activeProfileId = defaultProfile.id;
    this.saveState();
  }

  // Get active profile
  getActiveProfile() {
    return this.profiles.get(this.activeProfileId);
  }

  // Get all profiles
  getAllProfiles() {
    return Array.from(this.profiles.values());
  }

  // Create new profile
  createProfile(name) {
    const profile = {
      id: this.generateId(),
      name: name || `Profile ${this.profiles.size + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activeMemoryId: null,
      runIds: []
    };
    this.profiles.set(profile.id, profile);
    this.saveState();
    return profile;
  }

  // Switch active profile
  switchProfile(profileId) {
    if (this.profiles.has(profileId)) {
      this.activeProfileId = profileId;
      this.saveState();
      return true;
    }
    return false;
  }

  // Rename profile
  renameProfile(profileId, newName) {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.name = newName;
      profile.updated_at = new Date().toISOString();
      this.saveState();
      return true;
    }
    return false;
  }

  // Delete profile (cannot delete if it's the only one)
  deleteProfile(profileId) {
    if (this.profiles.size <= 1) {
      console.warn('Cannot delete the only profile');
      return false;
    }
    if (this.profiles.has(profileId)) {
      this.profiles.delete(profileId);
      if (this.activeProfileId === profileId) {
        const remaining = this.profiles.values().next().value;
        this.activeProfileId = remaining.id;
      }
      this.saveState();
      return true;
    }
    return false;
  }

  // Add run to active profile
  addRunToActiveProfile(runId) {
    const profile = this.getActiveProfile();
    if (profile && !profile.runIds.includes(runId)) {
      profile.runIds.push(runId);
      profile.updated_at = new Date().toISOString();
      this.saveState();
    }
  }

  // Get runs for active profile
  getActiveProfileRuns() {
    const profile = this.getActiveProfile();
    return profile ? profile.runIds : [];
  }

  // Save memory for active profile
  saveMemoryForActiveProfile(memory) {
    const profile = this.getActiveProfile();
    if (profile) {
      localStorage.setItem(`kudbee:profile:${profile.id}:memory`, JSON.stringify(memory));
      profile.updated_at = new Date().toISOString();
      this.saveState();
    }
  }

  // Load memory for active profile
  loadMemoryForActiveProfile() {
    const profile = this.getActiveProfile();
    if (profile) {
      try {
        const memory = JSON.parse(localStorage.getItem(`kudbee:profile:${profile.id}:memory`) || '{}');
        return memory;
      } catch (err) {
        console.error('Error loading profile memory:', err);
        return {};
      }
    }
    return {};
  }

  // Export profile with memory and runs
  exportProfile(profileId) {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    const memory = localStorage.getItem(`kudbee:profile:${profileId}:memory`);
    const runs = profile.runIds.map(runId => {
      try {
        return JSON.parse(localStorage.getItem(`kudbee:run:${runId}`) || '{}');
      } catch {
        return { id: runId };
      }
    });

    return {
      profile,
      memory: memory ? JSON.parse(memory) : {},
      runs
    };
  }

  // Import profile
  importProfile(exportData) {
    try {
      const newProfile = {
        ...exportData.profile,
        id: this.generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.profiles.set(newProfile.id, newProfile);

      if (exportData.memory && Object.keys(exportData.memory).length > 0) {
        localStorage.setItem(`kudbee:profile:${newProfile.id}:memory`, JSON.stringify(exportData.memory));
      }

      // Import runs
      if (exportData.runs && Array.isArray(exportData.runs)) {
        exportData.runs.forEach(run => {
          if (run.id) {
            localStorage.setItem(`kudbee:run:${run.id}`, JSON.stringify(run));
            newProfile.runIds.push(run.id);
          }
        });
      }

      this.saveState();
      return newProfile;
    } catch (err) {
      console.error('Error importing profile:', err);
      return null;
    }
  }

  // Save state to localStorage
  saveState() {
    const profileList = Array.from(this.profiles.values());
    localStorage.setItem('kudbee:profiles', JSON.stringify(profileList));
    localStorage.setItem('kudbee:activeProfile', this.activeProfileId);

    // Emit event for listeners
    document.dispatchEvent(new CustomEvent('profile:changed', {
      detail: { activeProfile: this.getActiveProfile() }
    }));
  }

  // Generate unique ID
  generateId() {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
window.ProfileManagerInstance = new ProfileManager();
