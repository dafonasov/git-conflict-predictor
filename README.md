# Git Conflict Predictor & Navigator

A Visual Studio Code extension that proactively warns you about potential merge conflicts while you code.

## Features

- 🔍 **Proactive Conflict Detection**: Identifies potential merge conflicts before they happen
- 📊 **Visual Indicators**: Shows conflict markers in the gutter and overview ruler
- 🎯 **Branch Tracking**: Configure which branches to track for conflicts (both local and remote)
- 💡 **Smart Hover Tips**: Hover over conflict markers to see details about the conflicting changes
- ⚡ **Background Syncing**: Automatically fetches updates from remote repositories
- 📝 **Debounced Analysis**: Avoids performance issues by delaying analysis during typing
- 👁️ **Visual Branch Management**: Interactive panel to toggle branch tracking with visual indicators

## Installation

1. Open Visual Studio Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Git Conflict Predictor"
4. Click Install

## Usage

1. Open a Git repository in VS Code
2. The extension will automatically start analyzing potential conflicts
3. View tracked branches in the "Tracked Branches" panel in the Activity Bar
4. Click on any branch to toggle tracking for conflict detection
5. Hover over conflict markers to see details about potential conflicts

## Configuration

The extension can be configured through VS Code settings:

- `gitConflictPredictor.trackedBranches`: Branches to track for conflicts (default: ["main", "develop"])
- `gitConflictPredictor.fetchInterval`: How often to fetch from remotes in seconds (default: 300)
- `gitConflictPredictor.enableHoverTips`: Enable hover tips showing conflict details (default: true)
- `gitConflictPredictor.debounceDelay`: Delay before checking for conflicts after typing in ms (default: 1500)

## Commands

- `Git Conflict Predictor: Toggle Conflict Prediction`: Enable/disable conflict prediction
- `Git Conflict Predictor: Show All Conflicts`: Open a panel showing all detected conflicts
- `Git Conflict Predictor: Configure Tracked Branches`: Select which branches to track
- `Git Conflict Predictor: Toggle Branch Tracking`: Toggle tracking for a specific branch

## Activity Bar Panel

The extension adds a "Tracked Branches" panel to the Activity Bar that shows:
- All available local and remote branches
- Visual indicators showing which branches are being tracked
- Ability to toggle tracking by clicking on any branch
- Different icons for local (👁️) and remote (☁️) branches

## How It Works

The extension analyzes the differences between your current changes and the specified target branches. It:

1. Finds the common ancestor (merge base) between your branch and target branches
2. Computes the differences between the base and your changes
3. Computes the differences between the base and the target branch changes
4. Identifies overlapping changes that could cause merge conflicts
5. Visually highlights these potential conflicts in your editor

## Support the Author

If you find this extension helpful and would like to support its development, you can:

- ⭐ Star the project on [GitHub](https://github.com/dafonasov/git-conflict-predictor)
- 🐛 Report bugs and suggest features in the [issue tracker](https://github.com/dafonasov/git-conflict-predictor/issues)
- 💖 Make a donation to support continued development:
  - Bitcoin: `863b3415-db48-43fe-8fd4-40d166c09398`
  - Ethereum: `cbca8d7b-5014-466b-b6d5-288c8fd97b4d`

## Requirements

- Git must be installed and available in your PATH
- You must be working in a Git repository
- The repository must have a remote configured for fetching

## Known Limitations

- Performance may be impacted in very large repositories
- Only tracks textual conflicts, not semantic conflicts
- Requires the target branches to be available locally or remotely

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details