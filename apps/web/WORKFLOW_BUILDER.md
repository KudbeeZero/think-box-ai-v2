# Workflow Builder & Actions Button

Real-time workflow creation, storage, and execution for kudbEE Agent OS.

## Overview

The workflow builder enables users to:
- Create multi-step workflows with tools and arguments
- Save workflows to browser localStorage
- Load and execute saved workflows
- Manage workflows (rename, delete, export)
- Run workflows directly from the Actions button

## Architecture

### Core Components

#### 1. WorkflowBuilder (`public/js/workflow-builder.js`)
Main class managing workflow state and localStorage operations.

**Key Methods:**
- `addStep(tool, args)` — Add a workflow step
- `removeStep(stepId)` — Remove a step
- `updateStep(stepId, updates)` — Update step properties
- `saveWorkflow()` — Save workflow to localStorage
- `loadWorkflow(id)` — Load workflow from storage
- `getAllWorkflows()` — Get list of all workflows
- `deleteWorkflow(id)` — Delete workflow
- `getWorkflowsAsString()` — Convert workflow to terminal command

#### 2. ActionsButton (`public/js/actions-button.js`)
Manages the Actions button and dropdown menu.

**Key Methods:**
- `showActionsMenu()` — Display dropdown with saved workflows
- `runWorkflow(workflowId)` — Execute a workflow
- `openWorkflowBuilder()` — Scroll to builder panel
- `openWorkflowManager()` — Show saved workflows dialog

#### 3. Integration with app.js
Handles WebSocket communication and terminal output.

**Event Listeners:**
- `workflow-saved` — Triggered when workflow is saved
- Custom run_goal dispatch when workflow is executed

## Workflow Structure

### Workflow Object
```javascript
{
  id: "workflow-1696524000000",          // Unique ID
  name: "My Workflow",                    // Display name
  description: "Description",             // Optional description
  steps: [                                // Array of steps
    {
      id: "step-1696524001000",
      tool: "shell_exec",                 // Tool name
      args: "echo 'hello'",               // Arguments (JSON or text)
      enabled: true                       // Whether step runs
    }
  ],
  tags: [],                               // Optional tags
  createdAt: "2024-01-01T12:00:00Z",     // Creation timestamp
  updatedAt: "2024-01-01T12:30:00Z"      // Last update timestamp
}
```

## Storage

### localStorage Keys
```
kudbee:workflows              → List of all workflow metadata
kudbee:workflows:<id>         → Individual workflow data
```

### Example Storage Entry
```javascript
// List of workflows
{
  "id": "workflow-1",
  "name": "Workflow Name",
  "steps": 5,
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:30:00Z"
}

// Individual workflow
{
  "id": "workflow-1",
  "name": "Workflow Name",
  "description": "...",
  "steps": [...],
  "tags": [],
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Usage

### Create a Workflow

1. **Via UI:**
   - Enter workflow name and description
   - Click "+ Add Step" to add steps
   - Fill in tool name and arguments
   - Click "Save" button

2. **Programmatically:**
```javascript
const builder = window.WorkflowBuilderInstance;

// Create workflow
const workflow = builder.currentWorkflow;
workflow.name = "My Workflow";

// Add steps
builder.addStep("shell_exec", "ls -la");
builder.addStep("file_read", "README.md");

// Save
builder.saveWorkflow();
```

### Run a Workflow

1. **Via Actions Button:**
   - Click "⚡ Actions" in header
   - Select workflow from dropdown
   - Workflow executes automatically

2. **Programmatically:**
```javascript
const actions = window.ActionsButtonInstance;
actions.runWorkflow('workflow-id-here');
```

### Load and Modify

```javascript
const builder = window.WorkflowBuilderInstance;

// Load existing workflow
builder.loadWorkflow('workflow-id-here');

// Modify
builder.currentWorkflow.name = "Updated Name";
builder.currentWorkflow.steps[0].args = "new args";

// Save changes
builder.saveWorkflow();
```

### Export Workflow

```javascript
const builder = window.WorkflowBuilderInstance;
builder.exportWorkflow(); // Downloads as JSON
```

### Import Workflow

```html
<input type="file" id="import-workflow" accept=".json">
<script>
  document.getElementById('import-workflow').addEventListener('change', (e) => {
    const builder = window.WorkflowBuilderInstance;
    builder.importWorkflow(e.target.files[0]);
  });
</script>
```

## Events

### workflow-saved
Emitted when a workflow is saved.

```javascript
document.addEventListener('workflow-saved', (e) => {
  const { workflow } = e.detail;
  console.log(`Saved: ${workflow.name}`);
  // Workflow saved to storage
});
```

### Integration with Terminal

When a workflow is executed:
1. Workflow is converted to a command string
2. Command is set in `#goal-input`
3. Run button is clicked
4. WebSocket message is sent to backend
5. Terminal shows workflow name and execution
6. Results stream to terminal

## UI Components

### Workflow Builder Panel
Located in left sidebar, contains:
- Name input
- Description textarea
- Step manager (add/remove/edit)
- Action buttons (Save, Load, Clear)

### Actions Button
Located in header right section:
- Enabled/disabled based on connection
- Shows dropdown on click
- Lists saved workflows
- Provides quick actions

### Actions Menu
Dropdown showing:
- List of saved workflows (scrollable)
- Quick actions:
  - Create Workflow
  - Manage Workflows

### Load Dialog
Modal showing:
- All saved workflows
- Last update date
- Step count
- Load/Delete buttons

## Testing

### Manual Testing

1. **Create Workflow:**
   - Visit `/apps/web/public/index.html`
   - Scroll to Workflow Builder panel
   - Enter name: "Test Workflow"
   - Add step: tool="shell_exec", args="echo test"
   - Click Save
   - Verify success message

2. **Run Workflow:**
   - Click "⚡ Actions" button
   - Select saved workflow
   - Verify workflow command appears in terminal
   - Verify run is triggered

3. **Load Workflow:**
   - Click Actions → "Manage Workflows"
   - Select a workflow
   - Verify workflow is loaded into builder

### Automated Testing

Visit `/apps/web/public/test-workflow.html` for comprehensive test suite:

```bash
# Tests include:
- Workflow creation
- Step management (add/update/remove)
- Save/load from storage
- Event emission
- Workflow string generation
- UI element verification
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save workflow | Click "💾 Save" button |
| Load workflow | Click "📂 Load" button |
| Clear workflow | Click "🗑️ Clear" button |
| Add step | Click "+" button |
| Delete step | Click "✕" button |
| Enable/disable step | Toggle checkbox |

## Workflow Execution Flow

```
User selects workflow
    ↓
ActionsButton.runWorkflow()
    ↓
Get workflow from storage
    ↓
Convert to command string
    ↓
Set goal-input value
    ↓
runGoal() triggered
    ↓
WebSocket message sent: { type: 'run_goal', goal: '...' }
    ↓
Backend processes
    ↓
Results stream to terminal
```

## Error Handling

### Save Errors
- Missing name → Shows error, prompts for name
- localStorage full → Shows error message
- Corrupted data → Recovery via manual entry

### Load Errors
- Missing ID → Shows "Workflow not found"
- Corrupted JSON → Shows error, prompts to delete

### Run Errors
- No workflow selected → Shows message
- No backend connection → Shows connection error
- Invalid tool → Backend returns error

## Performance

- **Storage:** Up to ~5MB localStorage (browser limit)
- **Workflows:** Typically 100-500 workflows per ~5MB
- **Load time:** <100ms for typical workflow
- **UI responsiveness:** Instant (no network I/O)

## Limitations

- **No cloud sync:** Workflows stored locally only
- **No version control:** Only current version stored
- **No collaboration:** Single-user, single-browser
- **No scheduling:** Manual trigger only
- **No background execution:** Requires active browser tab

## Future Enhancements

1. **Cloud Storage**
   - Save workflows to backend
   - Sync across devices
   - Version history

2. **Scheduling**
   - Cron-like scheduling
   - Time-based triggers
   - Recurring workflows

3. **Collaboration**
   - Share workflows with team
   - Permission control
   - Change tracking

4. **Advanced Features**
   - Workflow variables/parameters
   - Conditional steps (if/else)
   - Parallel execution
   - Error handling steps
   - Notification on completion

5. **UI Improvements**
   - Drag-and-drop steps
   - Visual workflow designer
   - Step templates
   - Syntax highlighting for args

## API Reference

### WorkflowBuilder

```javascript
class WorkflowBuilder {
  // Workflow management
  createEmptyWorkflow(): Workflow
  addStep(tool: string, args: string): string
  removeStep(stepId: string): void
  updateStep(stepId: string, updates: object): void
  clearWorkflow(): void

  // Storage
  saveWorkflow(): void
  loadWorkflow(id: string): boolean
  getAllWorkflows(): Workflow[]
  getWorkflow(id: string): Workflow | null
  deleteWorkflow(id: string): boolean

  // Export/Import
  exportWorkflow(): void
  importWorkflow(file: File): void

  // Utilities
  getWorkflowsAsString(): string
  showLoadDialog(): void
  showMessage(message: string, type: string): void
  renderUI(): void
}
```

### ActionsButton

```javascript
class ActionsButton {
  // UI
  showActionsMenu(): HTMLElement
  openWorkflowBuilder(): void
  openWorkflowManager(): void

  // Execution
  runWorkflow(workflowId: string): void

  // Utilities
  getWorkflows(): Workflow[]
  showMessage(message: string, type: string): void
}
```

## Troubleshooting

### Workflow not saving
- Check browser localStorage quota
- Verify workflow name is not empty
- Check browser console for errors

### Can't load workflow
- Verify workflow ID is correct
- Check if localStorage was cleared
- Try exporting/importing workflow

### Actions button disabled
- Verify backend is connected
- Check WebSocket connection status
- Reload page if connection issues

### Workflow not running
- Verify backend is running
- Check goal-input field value
- Verify steps have valid tool names

## Files

```
apps/web/
├── public/
│   ├── js/
│   │   ├── app.js                  (updated with workflow handlers)
│   │   ├── workflow-builder.js     (core builder class)
│   │   └── actions-button.js       (actions menu & execution)
│   ├── css/
│   │   └── main.css                (updated with workflow styles)
│   ├── index.html                  (updated with panels & button)
│   ├── test-workflow.html          (test suite)
│   └── WORKFLOW_BUILDER.md         (this file)
```

## Contributing

When adding features to the workflow system:

1. **Update tests** — Add tests to `test-workflow.html`
2. **Update docs** — Update `WORKFLOW_BUILDER.md`
3. **Follow style** — Match existing code style
4. **Handle errors** — Show user-friendly messages
5. **Test thoroughly** — Test in all browsers

## License

Part of kudbEE Agent OS — See LICENSE file in root.
