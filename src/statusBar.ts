import * as vscode from 'vscode';

export class StatusBar implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.updateCount(0);
        this.statusBarItem.show();
    }

    updateCount(count: number): void {
        this.statusBarItem.text = `$(git-merge) ${count} Potential Conflicts`;
        this.statusBarItem.tooltip = 'Click to toggle conflict prediction';
        this.statusBarItem.command = 'gitConflictPredictor.toggle';
    }

    toggle(active: boolean): void {
        this.statusBarItem.backgroundColor = active 
            ? undefined 
            : new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}