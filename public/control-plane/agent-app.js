/**
 * Agent App Integration — Connects agent tracking to WebSocket and approval workflow
 * Initializes agent registry, governance window, taskbar, and handles event dispatch
 */

class AgentApp {
  constructor() {
    this.registry = window.AgentRegistry;
    this.governanceWindow = window.GovernanceWindowInstance;
    this.taskbarAgents = window.TaskbarAgentsInstance;
    this.ws = null;
    this.wsUrl = this.getWebSocketURL();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.setupEventListeners();
  }

  /**
   * Get the WebSocket URL based on current location
   * @private
   */
  getWebSocketURL() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  /**
   * Initialize the agent app
   * @public
   */
  async init() {
    console.log('[AgentApp] Initializing...');
    this.connect();
  }

  /**
   * Connect to WebSocket
   * @private
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    console.log('[AgentApp] Connecting to WebSocket:', this.wsUrl);

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.addEventListener('open', () => {
        console.log('[AgentApp] WebSocket connected');
        this.reconnectAttempts = 0;

        // Send initialization message
        this.ws.send(JSON.stringify({
          type: 'init',
          data: { client: 'agent-tracker' },
        }));
      });

      this.ws.addEventListener('message', (event) => {
        this.handleWebSocketMessage(event);
      });

      this.ws.addEventListener('error', (error) => {
        console.error('[AgentApp] WebSocket error:', error);
      });

      this.ws.addEventListener('close', () => {
        console.log('[AgentApp] WebSocket closed, attempting reconnect...');
        this.attemptReconnect();
      });
    } catch (error) {
      console.error('[AgentApp] Failed to connect:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   * @private
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[AgentApp] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[AgentApp] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  /**
   * Handle incoming WebSocket messages
   * @private
   */
  handleWebSocketMessage(event) {
    try {
      const message = JSON.parse(event.data);

      // Pass to registry to update agent state
      this.registry.handleWebSocketMessage(message);

      // Handle approval resolution events
      if (message.type === 'approval:resolve') {
        this.handleApprovalResolve(message);
      }
    } catch (error) {
      console.error('[AgentApp] Failed to parse WebSocket message:', error, event.data);
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    // Listen for approval resolution events from governance window
    document.addEventListener('approval:resolve', (e) => {
      this.handleApprovalResolve(e.detail);
    });

    // Listen for approval:resolved (after resolution)
    document.addEventListener('approval:resolved', (e) => {
      const { agentId, approvalId, approved } = e.detail;
      console.log(`[AgentApp] Approval ${approved ? 'approved' : 'rejected'} for agent ${agentId.substring(0, 12)}`);
    });
  }

  /**
   * Handle approval resolution
   * @private
   */
  handleApprovalResolve(data) {
    const { agentId, approvalId, approved } = data;

    console.log(`[AgentApp] Approval ${approved ? 'approved' : 'rejected'}: ${agentId.substring(0, 12)}`);

    // Send message to backend via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'approval:response',
        data: {
          agent_id: agentId,
          approval_id: approvalId,
          approved: approved,
        },
      }));
    }

    // Dispatch resolved event
    const resolvedEvent = new CustomEvent('approval:resolved', {
      detail: { agentId, approvalId, approved },
    });
    document.dispatchEvent(resolvedEvent);
  }

  /**
   * Send a message via WebSocket
   * @public
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[AgentApp] WebSocket not connected');
    }
  }

  /**
   * Get the current registry state
   * @public
   */
  getState() {
    return {
      agents: this.registry.getAgents(),
      runningCount: this.registry.getRunningCount(),
      windows: this.governanceWindow.getOpenWindows(),
    };
  }

  /**
   * Disconnect from WebSocket
   * @public
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AgentApp = new AgentApp();
    window.AgentApp.init();
  });
} else {
  window.AgentApp = new AgentApp();
  window.AgentApp.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.AgentApp) {
    window.AgentApp.disconnect();
  }
});
