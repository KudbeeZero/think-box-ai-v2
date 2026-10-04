/**
 * Run Sharing Service
 * Internal service for managing run exports and shareable links
 * Memory-only storage; shares expire on page reload
 */

interface RunExport {
  html: string;
  markdown: string;
  json: string;
}

interface ShareLink {
  shareId: string;
  runId: string;
  url: string;
  createdAt: string;
  expiresAt?: string;
  accessCount: number;
}

class RunSharingService {
  private shares: Map<string, ShareLink> = new Map();
  private shareCounter: number = 0;

  /**
   * Export a run in multiple formats
   */
  exportRun(runId: string): RunExport {
    try {
      // Get run data from localStorage
      const runData = this.getRunData(runId);
      if (!runData) {
        throw new Error(`Run not found: ${runId}`);
      }

      const html = this.generateHtmlExport(runData);
      const markdown = this.generateMarkdownExport(runData);
      const json = this.generateJsonExport(runData);

      return { html, markdown, json };
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Failed to export run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a shareable link for a run
   */
  createShare(
    runId: string,
    options?: { expiresIn?: number }
  ): { shareId: string; url: string; expiresAt?: string } {
    try {
      // Verify run exists
      const runData = this.getRunData(runId);
      if (!runData) {
        throw new Error(`Run not found: ${runId}`);
      }

      const shareId = `share-${Date.now()}-${++this.shareCounter}`;
      const now = new Date();
      let expiresAt: string | undefined;

      if (options?.expiresIn) {
        const expiry = new Date(now.getTime() + options.expiresIn);
        expiresAt = expiry.toISOString();
      }

      const shareLink: ShareLink = {
        shareId,
        runId,
        url: `${window.location.origin}${window.location.pathname}?share=${shareId}`,
        createdAt: now.toISOString(),
        expiresAt,
        accessCount: 0,
      };

      this.shares.set(shareId, shareLink);

      // Persist to localStorage for this session
      this.persistShares();

      return {
        shareId,
        url: shareLink.url,
        expiresAt,
      };
    } catch (error) {
      console.error('Share creation failed:', error);
      throw new Error(`Failed to create share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a share link
   */
  deleteShare(shareId: string): boolean {
    try {
      const deleted = this.shares.delete(shareId);
      if (deleted) {
        this.persistShares();
      }
      return deleted;
    } catch (error) {
      console.error('Share deletion failed:', error);
      throw new Error(`Failed to delete share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all shares for a run
   */
  getSharesForRun(runId: string): ShareLink[] {
    try {
      const runShares: ShareLink[] = [];

      this.shares.forEach((share) => {
        // Skip expired shares
        if (share.expiresAt) {
          const expiry = new Date(share.expiresAt);
          if (new Date() > expiry) {
            this.shares.delete(share.shareId);
            return;
          }
        }

        if (share.runId === runId) {
          runShares.push(share);
        }
      });

      this.persistShares();
      return runShares;
    } catch (error) {
      console.error('Failed to get shares:', error);
      return [];
    }
  }

  /**
   * Track a share access
   */
  accessShare(shareId: string): boolean {
    const share = this.shares.get(shareId);
    if (!share) return false;

    // Check expiration
    if (share.expiresAt) {
      const expiry = new Date(share.expiresAt);
      if (new Date() > expiry) {
        this.shares.delete(shareId);
        return false;
      }
    }

    share.accessCount++;
    this.persistShares();
    return true;
  }

  /**
   * Get shared run data
   */
  getSharedRun(shareId: string): any {
    const share = this.shares.get(shareId);
    if (!share) return null;

    // Check expiration
    if (share.expiresAt) {
      const expiry = new Date(share.expiresAt);
      if (new Date() > expiry) {
        this.shares.delete(shareId);
        return null;
      }
    }

    this.accessShare(shareId);
    return this.getRunData(share.runId);
  }

  // Private helpers

  private getRunData(runId: string): any {
    try {
      const data = localStorage.getItem(`kudbee:run:${runId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get run data:', error);
      return null;
    }
  }

  private generateHtmlExport(runData: any): string {
    const timestamp = new Date().toLocaleString();
    const tasksHtml = (runData.tasks || [])
      .map(
        (task: any) => `
      <div style="margin: 16px 0; padding: 12px; border-left: 3px solid #7c3aed; background: #f5f3ff;">
        <div style="font-weight: 600; color: #333;">${this.escapeHtml(task.description || 'Task')}</div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">Status: ${task.status || 'pending'}</div>
      </div>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Run Export - ${timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    h1 { color: #333; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
    .task { margin: 16px 0; padding: 12px; border-left: 3px solid #7c3aed; background: white; }
  </style>
</head>
<body>
  <h1>Run Export</h1>
  <div class="meta">Exported: ${timestamp}</div>
  <div class="meta">Run ID: ${runData.id || 'unknown'}</div>
  <h2>Tasks</h2>
  ${tasksHtml || '<p>No tasks recorded</p>'}
</body>
</html>
    `.trim();
  }

  private generateMarkdownExport(runData: any): string {
    const timestamp = new Date().toLocaleString();
    const tasksMarkdown = (runData.tasks || [])
      .map((task: any) => `- **${this.escapeMarkdown(task.description || 'Task')}** (${task.status || 'pending'})`)
      .join('\n');

    return `# Run Export

**Exported:** ${timestamp}
**Run ID:** ${runData.id || 'unknown'}

## Tasks

${tasksMarkdown || 'No tasks recorded'}
    `.trim();
  }

  private generateJsonExport(runData: any): string {
    return JSON.stringify(
      {
        id: runData.id,
        timestamp: new Date().toISOString(),
        tasks: runData.tasks || [],
        thoughts: runData.thoughts || [],
        metadata: runData.metadata || {},
      },
      null,
      2
    );
  }

  private persistShares(): void {
    try {
      const sharesArray = Array.from(this.shares.values());
      sessionStorage.setItem('kudbee:shares', JSON.stringify(sharesArray));
    } catch (error) {
      console.warn('Failed to persist shares:', error);
    }
  }

  private loadShares(): void {
    try {
      const stored = sessionStorage.getItem('kudbee:shares');
      if (stored) {
        const shares = JSON.parse(stored);
        shares.forEach((share: ShareLink) => {
          this.shares.set(share.shareId, share);
        });
      }
    } catch (error) {
      console.warn('Failed to load shares:', error);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
  }
}

// Singleton instance
const runSharingService = new RunSharingService();

export default runSharingService;
