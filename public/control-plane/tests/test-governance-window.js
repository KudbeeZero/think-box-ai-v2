/**
 * Tests for Governance Window
 * Unit tests for window management and approval UI
 */

class TestGovernanceWindow {
  constructor() {
    this.passed = 0;
    this.failed = 0;
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
    const gov = new GovernanceWindow();
    this.assert(gov.windows instanceof Map, 'windows should be a Map');
    this.assertEqual(gov.windows.size, 0, 'should start with no windows');
  }

  testOpenWindow() {
    const registry = new AgentRegistry();
    const gov = new GovernanceWindow();

    const agent = {
      id: 'agent-1',
      status: 'running',
      goal: 'Test goal',
      stepsCompleted: 0,
      tokensUsed: 0,
      thinkBoxId: 'box-1',
      approvalPending: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    registry.agents.set('agent-1', agent);
    const window = gov.openWindow('agent-1', agent);

    this.assert(window, 'window should be created');
    this.assertEqual(window.agentId, 'agent-1', 'window agentId should match');
    this.assert(gov.windows.has('agent-1'), 'window should be registered');
  }

  testCloseWindow() {
    const gov = new GovernanceWindow();
    const agent = {
      id: 'agent-1',
      status: 'running',
      goal: 'Test goal',
      stepsCompleted: 0,
      tokensUsed: 0,
      thinkBoxId: 'box-1',
      approvalPending: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    gov.openWindow('agent-1', agent);
    this.assert(gov.windows.has('agent-1'), 'window should be open');

    gov.closeWindow('agent-1');
    this.assert(!gov.windows.has('agent-1'), 'window should be closed');
  }

  testWindowNotCreatedTwice() {
    const gov = new GovernanceWindow();
    const agent = {
      id: 'agent-1',
      status: 'running',
      goal: 'Test goal',
      stepsCompleted: 0,
      tokensUsed: 0,
      thinkBoxId: 'box-1',
      approvalPending: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const window1 = gov.openWindow('agent-1', agent);
    const window2 = gov.openWindow('agent-1', agent);

    this.assertEqual(window1.id, window2.id, 'should return existing window');
    this.assertEqual(gov.windows.size, 1, 'should only have 1 window');
  }

  testUpdateWindowContent() {
    const gov = new GovernanceWindow();
    const agent = {
      id: 'agent-1',
      status: 'running',
      goal: 'Test goal',
      stepsCompleted: 0,
      tokensUsed: 0,
      thinkBoxId: 'box-1',
      approvalPending: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    gov.openWindow('agent-1', agent);

    agent.stepsCompleted = 5;
    agent.tokensUsed = 100;
    gov.updateWindowContent('agent-1', agent);

    const element = gov.windows.get('agent-1').element;
    const content = element.innerHTML;
    this.assert(content.includes('5'), 'window should show updated steps');
    this.assert(content.includes('100'), 'window should show updated tokens');
  }

  testStatusClass() {
    const gov = new GovernanceWindow();

    this.assertEqual(gov.getStatusClass('running'), 'gov-status-running', 'should return running class');
    this.assertEqual(gov.getStatusClass('awaiting_approval'), 'gov-status-awaiting', 'should return awaiting class');
    this.assertEqual(gov.getStatusClass('completed'), 'gov-status-completed', 'should return completed class');
    this.assertEqual(gov.getStatusClass('failed'), 'gov-status-failed', 'should return failed class');
  }

  testFormatStatus() {
    const gov = new GovernanceWindow();

    this.assertEqual(gov.formatStatus('running'), 'Running', 'should format running');
    this.assertEqual(gov.formatStatus('awaiting_approval'), 'Awaiting Approval', 'should format awaiting_approval');
  }

  testTruncate() {
    const gov = new GovernanceWindow();

    const long = 'This is a very long text that should be truncated';
    const short = 'Short';

    this.assertEqual(gov.truncate(long, 10), 'This is a …', 'should truncate long text');
    this.assertEqual(gov.truncate(short, 10), 'Short', 'should not truncate short text');
  }

  testRenderApprovals() {
    const gov = new GovernanceWindow();

    const approvals = [
      {
        id: 'approval-1',
        reason: 'Test approval',
        timestamp: new Date(),
      },
    ];

    const html = gov.renderApprovals('agent-1', approvals);
    this.assert(html.includes('Approval Required'), 'should include approval title');
    this.assert(html.includes('Test approval'), 'should include approval reason');
    this.assert(html.includes('Approve'), 'should include approve button');
    this.assert(html.includes('Reject'), 'should include reject button');
  }

  testCloseAllWindows() {
    const gov = new GovernanceWindow();
    const agent = {
      id: 'agent-1',
      status: 'running',
      goal: 'Test goal',
      stepsCompleted: 0,
      tokensUsed: 0,
      thinkBoxId: 'box-1',
      approvalPending: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    gov.openWindow('agent-1', agent);
    gov.openWindow('agent-2', { ...agent, id: 'agent-2' });

    this.assertEqual(gov.windows.size, 2, 'should have 2 windows');

    gov.closeAllWindows();
    this.assertEqual(gov.windows.size, 0, 'should close all windows');
  }

  testGetOpenWindows() {
    const gov = new GovernanceWindow();
    const agent = {
      id: 'agent-1',
      status: 'running',
      goal: 'Test goal',
      stepsCompleted: 0,
      tokensUsed: 0,
      thinkBoxId: 'box-1',
      approvalPending: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    gov.openWindow('agent-1', agent);

    const windows = gov.getOpenWindows();
    this.assertEqual(windows.length, 1, 'should return 1 open window');
    this.assertEqual(windows[0].agentId, 'agent-1', 'window should have correct agentId');
  }

  runAll() {
    console.log('=== Governance Window Tests ===\n');

    this.run('testCreate', () => this.testCreate());
    this.run('testOpenWindow', () => this.testOpenWindow());
    this.run('testCloseWindow', () => this.testCloseWindow());
    this.run('testWindowNotCreatedTwice', () => this.testWindowNotCreatedTwice());
    this.run('testUpdateWindowContent', () => this.testUpdateWindowContent());
    this.run('testStatusClass', () => this.testStatusClass());
    this.run('testFormatStatus', () => this.testFormatStatus());
    this.run('testTruncate', () => this.testTruncate());
    this.run('testRenderApprovals', () => this.testRenderApprovals());
    this.run('testCloseAllWindows', () => this.testCloseAllWindows());
    this.run('testGetOpenWindows', () => this.testGetOpenWindows());

    console.log(`\n=== Results ===`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total: ${this.passed + this.failed}`);

    return this.failed === 0;
  }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestGovernanceWindow;
}
