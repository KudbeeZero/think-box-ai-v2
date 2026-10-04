/**
 * Agent Registry — In-memory tracking of running agents
 * Listens to WebSocket messages and maintains real-time agent state
 */

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Register an event listener for registry changes
   * @param {string} eventType - 'agents:changed', 'agent:created', 'agent:updated', etc.
   * @param {Function} callback - Handler function
   */
  on(eventType, callback) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(callback);
  }

  /**
   * Dispatch an event to all listeners
   * @private
   */
  emit(eventType, data) {
    if (this.eventHandlers.has(eventType)) {
      this.eventHandlers.get(eventType).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in agent registry listener for ${eventType}:`, e);
        }
      });
    }
    // Always emit agents:changed when any agent changes
    if (eventType !== 'agents:changed') {
      this.emit('agents:changed', { agents: Array.from(this.agents.values()) });
    }
  }

  /**
   * Process a WebSocket message and update agent state
   * @param {Object} message - WebSocket message
   */
  handleWebSocketMessage(message) {
    const type = message.type;

    if (type === 'think_cube:run' || type === 'run_update') {
      this.handleRunUpdate(message);
    } else if (type === 'approval_request') {
      this.handleApprovalRequest(message);
    } else if (type === 'specialist_result') {
      this.handleSpecialistResult(message);
    } else if (type === 'think_token_cube') {
      this.handleThinkTokenCube(message);
    }
  }

  /**
   * Handle run updates (agent start, progress, completion)
   * @private
   */
  handleRunUpdate(message) {
    const data = message.data || {};
    const agentId = data.agent_id || data.run_id || `agent-${Date.now()}`;

    if (!this.agents.has(agentId)) {
      this.agents.set(agentId, {
        id: agentId,
        status: 'idle',
        runId: data.run_id,
        goal: data.goal || 'Unknown goal',
        stepsCompleted: 0,
        tokensUsed: 0,
        thinkBoxId: data.think_box_id,
        approvalPending: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.emit('agent:created', this.agents.get(agentId));
    }

    const agent = this.agents.get(agentId);
    if (data.status) agent.status = data.status;
    if (data.steps_completed !== undefined) agent.stepsCompleted = data.steps_completed;
    if (data.tokens_used !== undefined) agent.tokensUsed = data.tokens_used;
    if (data.goal) agent.goal = data.goal;
    agent.updatedAt = new Date();

    this.emit('agent:updated', agent);
  }

  /**
   * Handle approval requests
   * @private
   */
  handleApprovalRequest(message) {
    const data = message.data || {};
    const agentId = data.agent_id || data.run_id;

    if (!agentId) return;

    if (!this.agents.has(agentId)) {
      this.agents.set(agentId, {
        id: agentId,
        status: 'idle',
        runId: data.run_id,
        goal: 'Unknown goal',
        stepsCompleted: 0,
        tokensUsed: 0,
        thinkBoxId: data.think_box_id,
        approvalPending: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const agent = this.agents.get(agentId);
    const approval = {
      id: `approval-${Date.now()}`,
      reason: data.reason || 'Approval required',
      context: data.context || {},
      timestamp: new Date(),
    };

    agent.approvalPending.push(approval);
    agent.status = 'awaiting_approval';
    agent.updatedAt = new Date();

    this.emit('agent:approval_requested', { agent, approval });
  }

  /**
   * Handle specialist results
   * @private
   */
  handleSpecialistResult(message) {
    const data = message.data || {};
    const agentId = data.agent_id || data.run_id;

    if (!agentId) return;

    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId);
      agent.stepsCompleted = (agent.stepsCompleted || 0) + 1;
      if (data.tokens_used) agent.tokensUsed = (agent.tokensUsed || 0) + data.tokens_used;
      agent.updatedAt = new Date();
      this.emit('agent:updated', agent);
    }
  }

  /**
   * Handle think token cube updates
   * @private
   */
  handleThinkTokenCube(message) {
    const data = message.data || {};
    const agentId = data.agent_id || data.run_id;

    if (!agentId) return;

    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId);
      if (data.tokens) agent.tokensUsed = data.tokens;
      agent.updatedAt = new Date();
      this.emit('agent:updated', agent);
    }
  }

  /**
   * Get all active agents
   * @returns {Array} Array of agent objects
   */
  getAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get running agents count
   * @returns {number}
   */
  getRunningCount() {
    return Array.from(this.agents.values()).filter(a =>
      a.status === 'running' || a.status === 'awaiting_approval'
    ).length;
  }

  /**
   * Get agent by ID
   * @param {string} agentId
   * @returns {Object|undefined}
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Update agent status manually
   * @param {string} agentId
   * @param {Object} updates
   */
  updateAgent(agentId, updates) {
    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId);
      Object.assign(agent, updates, { updatedAt: new Date() });
      this.emit('agent:updated', agent);
    }
  }

  /**
   * Resolve an approval request
   * @param {string} agentId
   * @param {string} approvalId
   * @param {boolean} approved
   */
  resolveApproval(agentId, approvalId, approved) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const index = agent.approvalPending.findIndex(a => a.id === approvalId);
    if (index >= 0) {
      const approval = agent.approvalPending.splice(index, 1)[0];

      if (agent.approvalPending.length === 0) {
        agent.status = 'running';
      }

      this.emit('agent:approval_resolved', { agent, approval, approved });
    }
  }

  /**
   * Mark an agent as completed
   * @param {string} agentId
   */
  completeAgent(agentId) {
    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId);
      agent.status = 'completed';
      agent.updatedAt = new Date();
      this.emit('agent:completed', agent);
    }
  }

  /**
   * Clear all agents (for testing/reset)
   */
  clear() {
    this.agents.clear();
    this.emit('agents:changed', { agents: [] });
  }
}

// Export singleton instance
window.AgentRegistry = window.AgentRegistry || new AgentRegistry();
