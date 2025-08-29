import * as vscode from 'vscode';
import { ConflictPredictor } from './conflictPredictor';
import { BackgroundFetcher } from './backgroundFetcher';
import { StatusBar } from './statusBar';
import { TrackedBranchesManager } from './trackedBranchesManager';
import { HoverProvider } from './hoverProvider';
import { BranchTrackerProvider } from './branchTrackerProvider';
import { executeGitCommand } from './gitUtils';

let conflictPredictor: ConflictPredictor;
let backgroundFetcher: BackgroundFetcher;
let statusBar: StatusBar;
let hoverProvider: HoverProvider;
let branchTrackerProvider: BranchTrackerProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Git Conflict Predictor extension is now active!');

    const trackedBranchesManager = new TrackedBranchesManager();
    statusBar = new StatusBar();
    conflictPredictor = new ConflictPredictor(statusBar, trackedBranchesManager);
    backgroundFetcher = new BackgroundFetcher();
    hoverProvider = new HoverProvider(conflictPredictor);
    branchTrackerProvider = new BranchTrackerProvider(trackedBranchesManager);

    // Register commands
    const toggleCommand = vscode.commands.registerCommand('gitConflictPredictor.toggle', () => {
        conflictPredictor.toggle();
    });

    const showConflictsCommand = vscode.commands.registerCommand('gitConflictPredictor.showConflicts', () => {
        conflictPredictor.showConflictsPanel();
    });

    const configureBranchesCommand = vscode.commands.registerCommand('gitConflictPredictor.configureBranches', () => {
        trackedBranchesManager.configureBranches();
    });

    // Register toggle branch command
    const toggleBranchCommand = vscode.commands.registerCommand('gitConflictPredictor.toggleBranch', 
        (branch: string, isCurrentlyTracked: boolean, isRemote: boolean) => {
            branchTrackerProvider.toggleBranch(branch, isCurrentlyTracked, isRemote);
        }
    );

    // Register download remote branch command (заменяет старую fetchRemoteCommand)
    const downloadRemoteCommand = vscode.commands.registerCommand('gitConflictPredictor.downloadRemoteBranch', 
        async (branch: string) => {
            await branchTrackerProvider.downloadRemoteBranch(branch);
        }
    );

    // Register view
    const view = vscode.window.createTreeView('branchTracker', {
        treeDataProvider: branchTrackerProvider
    });

    // Register hover provider if enabled
    const config = vscode.workspace.getConfiguration('gitConflictPredictor');
    if (config.get<boolean>('enableHoverTips', true)) {
        const hoverDisposable = vscode.languages.registerHoverProvider('*', hoverProvider);
        context.subscriptions.push(hoverDisposable);
    }

    // Start background processes
    backgroundFetcher.start();
    conflictPredictor.activate();

    // Add to context subscriptions
    context.subscriptions.push(
        toggleCommand,
        showConflictsCommand,
        configureBranchesCommand,
        toggleBranchCommand,
        downloadRemoteCommand, // Используем новую команду вместо fetchRemoteCommand
        statusBar,
        conflictPredictor,
        backgroundFetcher,
        view,
        branchTrackerProvider
    );
}

export function deactivate() {
    backgroundFetcher.stop();
    conflictPredictor.deactivate();
}