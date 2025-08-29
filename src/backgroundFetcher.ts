import * as vscode from 'vscode';
import { executeGitCommand } from './gitUtils';

export class BackgroundFetcher implements vscode.Disposable {
    private intervalId?: NodeJS.Timeout;

    start(): void {
        const config = vscode.workspace.getConfiguration('gitConflictPredictor');
        const interval = config.get<number>('fetchInterval', 300) * 1000;
        
        this.intervalId = setInterval(() => {
            this.fetchFromRemotes();
        }, interval);
    }

    private async fetchFromRemotes(): Promise<void> {
        try {
            await executeGitCommand('fetch --all --prune --quiet');
            console.log('Background fetch completed');
        } catch (error) {
            console.error('Background fetch failed:', error);
        }
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    dispose(): void {
        this.stop();
    }
}