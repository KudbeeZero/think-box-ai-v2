# Agent Tracking & Governance System

Real-time live agent tracking, governance window management, and approval workflow for Think Box AI agents.

## Overview

The agent tracking system provides:

1. **Agent Registry** — In-memory tracking of running agents with real-time state updates
2. **Governance Window** — Floating panels showing agent details, think tokens, and approval requests
3. **Taskbar Agents Panel** — Live badge and dropdown list of running agents in the taskbar
4. **Approval Workflow** — Approve/reject agent actions directly from the governance window
5. **WebSocket Integration** — Connects to backend WebSocket to receive agent state changes

## Architecture

### Core Modules

```
agent-registry.js      — Agent state management and event dispatch
governance-window.js   — Floating window UI and approval UI
taskbar-agents.js      — Taskbar integration and agent list
agent-app.js           — WebSocket connection and event coordination
```

### Data Flow

```
WebSocket Message
       ↓
  agent-app.js (connection handler)
       ↓
  agent-registry.js (state update + emit event)
       ↓
  ┌─────────────────────────────┬──────────────────────────────┐
  ↓                             ↓                              ↓
governance-window.js    taskbar-agents.js          document event dispatch
  (update UI)           (update badge/list)         (approval:resolve)
```

## Usage

### Basic Setup

The agent tracking system automatically initializes when included on a page:

```html
<script src="agent-registry.js"></script>
<script src="governance-window.js"></script>
<script src="taskbar-agents.js"></script>
<script src="agent-app.js"></script>
```

### WebSocket Message Format

The system responds to the following WebSocket message types:

#### 1. `run_update` — Agent status update

```javascript
{
  type: 'run_update',
  data: {
    agent_id: 'agent-1',
    run_id: 'run-uuid',
    status: 'running',      // 'running' | 'idle' | 'awaiting_approval' | 'completed' | 'failed'
    goal: 'Research goal',
    steps_completed: 5,
    tokens_used: 150,
    think_box_id: 'box-1'
  }
}
```

#### 2. `approval_request` — Request agent approval

```javascript
{
  type: 'approval_request',
  data: {
    agent_id: 'agent-1',
    run_id: 'run-uuid',
    reason: 'Safety check required',
    context: { /* optional context */ }
  }
}
```

#### 3. `specialist_result` — Specialist completed a task

```javascript
{
  type: 'specialist_result',
  data: {
    agent_id: 'agent-1',
    tokens_used: 50
  }
}
```

#### 4. `think_token_cube` — Update think tokens

```javascript
{
  type: 'think_token_cube',
  data: {
    agent_id: 'agent-1',
    tokens: 200
  }
}
```

### JavaScript API

#### Agent Registry

```javascript
// Get singleton instance
const registry = window.AgentRegistry;

// Get all agents
const agents = registry.getAgents();

// Get running agent count
const count = registry.getRunningCount();

// Get specific agent
const agent = registry.getAgent('agent-1');

// Listen to events
registry.on('agents:changed', (data) => {
  console.log('Agents updated:', data.agents);
});

registry.on('agent:created', (agent) => {
  console.log('New agent:', agent);
});

registry.on('agent:approval_requested', (data) => {
  console.log('Approval needed:', data.agent, data.approval);
});

// Manually update agent
registry.updateAgent('agent-1', { status: 'completed' });

// Mark agent as completed
registry.completeAgent('agent-1');
```

#### Governance Window

```javascript
// Get singleton instance
const govWindow = window.GovernanceWindowInstance;

// Open window for agent
govWindow.openWindow('agent-1', agent);

// Close window
govWindow.closeWindow('agent-1');

// Close all windows
govWindow.closeAllWindows();

// Get open windows
const windows = govWindow.getOpenWindows();
```

#### Taskbar Agents Panel

```javascript
// Get singleton instance
const taskbar = window.TaskbarAgentsInstance;

// Toggle dropdown
taskbar.toggleDropdown();

// Open agent from dropdown
taskbar.openAgent('agent-1', event);
```

#### Agent App

```javascript
// Get singleton instance
const app = window.AgentApp;

// Get current state
const state = app.getState();
console.log(state.agents, state.runningCount, state.windows);

// Send WebSocket message
app.send({
  type: 'approval:response',
  data: { agent_id: 'agent-1', approval_id: 'app-1', approved: true }
});
```

## Events

### Custom Events

The system uses custom events for cross-module communication:

#### `agents:changed`
Fired when any agent in the registry changes.

```javascript
document.addEventListener('agents:changed', (e) => {
  console.log('Agents changed:', e.detail);
});
```

#### `agent:created`
Fired when a new agent is created.

```javascript
document.addEventListener('agent:created', (e) => {
  console.log('Agent created:', e.detail);
});
```

#### `agent:updated`
Fired when an agent is updated.

```javascript
document.addEventListener('agent:updated', (e) => {
  console.log('Agent updated:', e.detail);
});
```

#### `approval:resolve`
Fired when user clicks Approve/Reject button.

```javascript
document.addEventListener('approval:resolve', (e) => {
  const { agentId, approvalId, approved } = e.detail;
  console.log(`Approval ${approved ? 'approved' : 'rejected'}`);
});
```

#### `approval:resolved`
Fired after approval is resolved and state is updated.

```javascript
document.addEventListener('approval:resolved', (e) => {
  console.log('Approval resolved:', e.detail);
});
```

## UI Components

### Governance Window

Shows:
- Agent ID and goal
- Current status (Running, Awaiting Approval, Completed, etc.)
- Steps completed and tokens used
- Think Box ID (if available)
- Approval requests (if pending)
  - Reason for approval
  - Approve/Reject buttons
- Last updated time

Draggable header for repositioning.

### Taskbar Agents Panel

Shows:
- Badge with running agent count
- Warning color if approvals pending
- Dropdown list of agents with:
  - Agent ID (truncated)
  - Status badge
  - Goal (truncated to 2 lines)
  - Stats (steps, tokens, approval count)

### Approval UI

When an agent is awaiting approval:
- Yellow warning box appears in governance window
- Shows approval reason and context
- Two buttons: "Approve" and "Reject"
- Clicking updates agent status and removes approval

## Testing

### Test Suite

Run tests at `/control-plane/tests/`

```html
<a href="tests/">Test Suite</a>
```

Tests cover:
- Agent creation and updates
- Approval request/resolution
- Window management
- Event emission
- Status formatting

### Demo Mode

Interactive demo at `/control-plane/demo-agent-tracking.html`

Features:
- Mock WebSocket messages
- Manual agent creation
- Approval workflow testing
- Live status board
- Agent list visualization
- Console output

## Integration with Backend

### WebSocket Connection

The `agent-app.js` automatically connects to the WebSocket endpoint (`/ws`) and handles message routing.

### Approval Response

When user approves/rejects, the system sends:

```javascript
{
  type: 'approval:response',
  data: {
    agent_id: 'agent-1',
    approval_id: 'approval-uuid',
    approved: true  // or false
  }
}
```

### Error Handling

- WebSocket disconnections are handled with exponential backoff retry
- Max 5 reconnection attempts
- Failed messages are logged but don't break the UI

## Styling & Theming

All components use CSS variables from the design system:

```css
--color-bg-card         /* Window background */
--color-bg-elevated     /* Elevated surfaces */
--color-border          /* Border color */
--color-text-primary    /* Primary text */
--color-text-secondary  /* Secondary text */
--color-text-tertiary   /* Tertiary text */
--color-success         /* Green for running */
--color-warning         /* Yellow for approval */
--color-info            /* Blue for completed */
--color-danger          /* Red for failed */
--font-base             /* Default font */
--font-mono             /* Monospace font */
```

Responsive design supports mobile devices (max-width: 768px).

## Example: Full Workflow

```javascript
// 1. Send agent status update
ws.send(JSON.stringify({
  type: 'run_update',
  data: {
    agent_id: 'agent-1',
    status: 'running',
    goal: 'Research task',
    steps_completed: 0,
    tokens_used: 0
  }
}));

// Registry creates agent and emits agents:changed
// Taskbar updates badge and list
// User can click agent to open governance window

// 2. Agent needs approval
ws.send(JSON.stringify({
  type: 'approval_request',
  data: {
    agent_id: 'agent-1',
    reason: 'Action requires approval'
  }
}));

// Registry updates agent status to 'awaiting_approval'
// Taskbar badge turns yellow
// Governance window shows approval UI

// 3. User clicks Approve
// Governance window dispatches 'approval:resolve' event
// agent-app.js sends approval:response to backend
// Registry updates agent status back to 'running'
// Governance window removes approval UI

// 4. Agent completes
ws.send(JSON.stringify({
  type: 'run_update',
  data: {
    agent_id: 'agent-1',
    status: 'completed'
  }
}));

// Registry marks agent as completed
// Taskbar updates icon/status
// Governance window shows completed state
```

## Troubleshooting

### Agents not appearing
- Check WebSocket connection in browser console
- Verify WebSocket URL matches your environment
- Ensure `agent-app.js` is loaded last

### Approval window not showing
- Verify `approval_request` message format
- Check agent ID matches in message and registry
- Look for JS errors in browser console

### Windows not draggable
- Ensure `.gov-window-header` isn't obscured
- Check z-index conflicts with other overlays
- Verify mouse events aren't being prevented

### Disconnections
- Check network tab in DevTools
- Verify WebSocket endpoint is accessible
- Check for CORS issues
- Inspect backend logs

## Files

```
public/control-plane/
├── agent-registry.js           # Core agent state management
├── governance-window.js        # Floating window UI
├── taskbar-agents.js           # Taskbar integration
├── agent-app.js                # WebSocket + coordination
├── demo-agent-tracking.html    # Interactive demo
├── AGENT_TRACKING.md           # This file
└── tests/
    ├── index.html              # Test runner
    ├── test-agent-registry.js  # Registry tests
    └── test-governance-window.js # Window tests
```

## Performance Considerations

- Agent registry uses Map for O(1) lookups
- Events use listener pattern for loose coupling
- Windows are lazily created on demand
- No polling; all updates are event-driven
- WebSocket maintains single connection for all updates

## Security

- No sensitive data stored in frontend
- Approval decisions sent via WebSocket (backend validates)
- Agent IDs are public; sensitive context in backend
- XSS protection: HTML escaped in governance window
- No direct DOM manipulation outside controlled contexts

## Future Enhancements

- Agent filtering/search in taskbar
- Batch approval for multiple agents
- Historical agent tracking
- Performance metrics dashboard
- Agent grouping by goal/category
- Keyboard shortcuts for window management
