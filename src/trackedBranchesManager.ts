import * as vscode from 'vscode';
import { executeGitCommand } from './gitUtils';

export class TrackedBranchesManager {
    async getTrackedBranches(): Promise<string[]> {
        const config = vscode.workspace.getConfiguration('gitConflictPredictor');
        let branches = config.get<string[]>('trackedBranches', ['main', 'develop']);
        
        // Filter out branches that don't exist
        const existingBranches: string[] = [];
        
        for (const branch of branches) {
            try {
                await executeGitCommand(`show-ref --verify refs/heads/${branch}`);
                existingBranches.push(branch);
            } catch (error) {
                console.warn(`Branch ${branch} does not exist locally`);
            }
        }
        
        return existingBranches;
    }

    async updateTrackedBranches(branches: string[]): Promise<void> {
        const config = vscode.workspace.getConfiguration('gitConflictPredictor');
        await config.update('trackedBranches', branches, true);
    }

    async configureBranches(): Promise<void> {
        // Get all available branches
        let allBranches: string[] = [];
        
        try {
            const branchOutput = await executeGitCommand('branch -a');
            allBranches = branchOutput
                .split('\n')
                .map(b => b.trim().replace('* ', '').replace('remotes/', ''))
                .filter(b => b && !b.includes('HEAD ->'));
        } catch (error) {
            vscode.window.showErrorMessage('Failed to get branch list');
            return;
        }
        
        // Get current selection
        const currentBranches = await this.getTrackedBranches();
        
        // Show quick pick to select branches
        const selections = await vscode.window.showQuickPick(allBranches, {
            placeHolder: 'Select branches to track for conflicts',
            canPickMany: true,
            ignoreFocusOut: true
        });
        
        if (selections) {
            await this.updateTrackedBranches(selections);
            vscode.window.showInformationMessage(`Tracking ${selections.length} branches for conflicts`);
        }
    }
}