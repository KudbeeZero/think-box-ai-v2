/**
 * Tests for Agent Registry
 * Unit tests for agent tracking and state management
 */

class TestAgentRegistry {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
    }
  }

  assertArrayLength(array, length, message) {
    if (array.length !== length) {
      throw new Error(`Expected array length ${length}, got ${array.length}: ${message}`);
    }
  }

  run(testName, testFn) {
    try {
      testFn();
      this.passed++;
      console.log(`✓ ${testName}`);
    } catch (e) {
      this.failed++;
      console.error(`✗ ${testName}:`, e.message);
    }
  }

  // Tests

  testCreate() {
    const registry = new AgentRegistry();
    this.assert(registry.agents instanceof Map, 'agents should be a Map');
    this.assertArrayLength(registry.getAgents(), 0, 'should start empty');
  }

  testAddAgent() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: {
        agent_id: 'agent-1',
        status: 'running',
        goal: 'Test goal',
      },
    });

    const agents = registry.getAgents();
    this.assertArrayLength(agents, 1, 'should have 1 agent');
    this.assertEqual(agents[0].id, 'agent-1', 'agent id should match');
    this.assertEqual(agents[0].status, 'running', 'agent status should match');
  }

  testUpdateAgent() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', status: 'running', steps_completed: 0 },
    });

    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', status: 'running', steps_completed: 5 },
    });

    const agents = registry.getAgents();
    this.assertArrayLength(agents, 1, 'should still have 1 agent');
    this.assertEqual(agents[0].stepsCompleted, 5, 'steps should be updated');
  }

  testRunningCount() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', status: 'running' },
    });
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-2', status: 'idle' },
    });

    this.assertEqual(registry.getRunningCount(), 1, 'should have 1 running agent');
  }

  testApprovalRequest() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'approval_request',
      data: {
        agent_id: 'agent-1',
        run_id: 'run-1',
        reason: 'User approval needed',
      },
    });

    const agent = registry.getAgent('agent-1');
    this.assert(agent, 'agent should be created');
    this.assertEqual(agent.status, 'awaiting_approval', 'status should be awaiting_approval');
    this.assertArrayLength(agent.approvalPending, 1, 'should have 1 approval request');
    this.assertEqual(agent.approvalPending[0].reason, 'User approval needed', 'approval reason should match');
  }

  testResolveApproval() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'approval_request',
      data: { agent_id: 'agent-1', reason: 'Test approval' },
    });

    const agent = registry.getAgent('agent-1');
    const approvalId = agent.approvalPending[0].id;

    registry.resolveApproval('agent-1', approvalId, true);

    const updated = registry.getAgent('agent-1');
    this.assertArrayLength(updated.approvalPending, 0, 'approval should be removed');
    this.assertEqual(updated.status, 'running', 'status should return to running');
  }

  testEventEmission() {
    const registry = new AgentRegistry();
    let eventFired = false;
    let eventData = null;

    registry.on('agents:changed', (data) => {
      eventFired = true;
      eventData = data;
    });

    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', status: 'running' },
    });

    this.assert(eventFired, 'agents:changed event should fire');
    this.assert(eventData.agents.length === 1, 'event data should have 1 agent');
  }

  testSpecialistResult() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', steps_completed: 0, tokens_used: 0 },
    });

    registry.handleWebSocketMessage({
      type: 'specialist_result',
      data: { agent_id: 'agent-1', tokens_used: 50 },
    });

    const agent = registry.getAgent('agent-1');
    this.assertEqual(agent.stepsCompleted, 1, 'steps should increment');
    this.assertEqual(agent.tokensUsed, 50, 'tokens should be added');
  }

  testThinkTokenCube() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', tokens_used: 0 },
    });

    registry.handleWebSocketMessage({
      type: 'think_token_cube',
      data: { agent_id: 'agent-1', tokens: 100 },
    });

    const agent = registry.getAgent('agent-1');
    this.assertEqual(agent.tokensUsed, 100, 'tokens should be set from think_token_cube');
  }

  testCompleteAgent() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', status: 'running' },
    });

    registry.completeAgent('agent-1');

    const agent = registry.getAgent('agent-1');
    this.assertEqual(agent.status, 'completed', 'status should be completed');
  }

  testClear() {
    const registry = new AgentRegistry();
    registry.handleWebSocketMessage({
      type: 'run_update',
      data: { agent_id: 'agent-1', status: 'running' },
    });

    registry.clear();
    this.assertArrayLength(registry.getAgents(), 0, 'should be empty after clear');
  }

  runAll() {
    console.log('=== Agent Registry Tests ===\n');

    this.run('testCreate', () => this.testCreate());
    this.run('testAddAgent', () => this.testAddAgent());
    this.run('testUpdateAgent', () => this.testUpdateAgent());
    this.run('testRunningCount', () => this.testRunningCount());
    this.run('testApprovalRequest', () => this.testApprovalRequest());
    this.run('testResolveApproval', () => this.testResolveApproval());
    this.run('testEventEmission', () => this.testEventEmission());
    this.run('testSpecialistResult', () => this.testSpecialistResult());
    this.run('testThinkTokenCube', () => this.testThinkTokenCube());
    this.run('testCompleteAgent', () => this.testCompleteAgent());
    this.run('testClear', () => this.testClear());

    console.log(`\n=== Results ===`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total: ${this.passed + this.failed}`);

    return this.failed === 0;
  }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestAgentRegistry;
}
