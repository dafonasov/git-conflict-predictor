import * as vscode from 'vscode';
import { TrackedBranchesManager } from './trackedBranchesManager';
import { executeGitCommand } from './gitUtils';

class BranchItem extends vscode.TreeItem {
    constructor(
        public readonly branch: string,
        public readonly isTracked: boolean,
        public readonly isRemote: boolean,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly hasDownloadAction: boolean = false
    ) {
        super(branch, collapsibleState);
        
        if (hasDownloadAction) {
            // Иконка для скачивания удаленной ветки
            this.iconPath = new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
            this.description = 'remote (click to download)';
            this.tooltip = `Click to download remote branch ${branch}`;
            this.contextValue = 'remoteBranch';
            this.command = {
                command: 'gitConflictPredictor.downloadRemoteBranch',
                title: 'Download Remote Branch',
                arguments: [branch]
            };
        } else {
            // Разные иконки для локальных и удаленных веток
            if (isRemote) {
                this.iconPath = isTracked 
                    ? new vscode.ThemeIcon('cloud', new vscode.ThemeColor('gitDecoration.addedResourceForeground'))
                    : new vscode.ThemeIcon('cloud', new vscode.ThemeColor('gitDecoration.ignoredResourceForeground'));
                this.description = 'remote';
            } else {
                this.iconPath = isTracked 
                    ? new vscode.ThemeIcon('eye', new vscode.ThemeColor('gitDecoration.addedResourceForeground'))
                    : new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('gitDecoration.ignoredResourceForeground'));
                this.description = 'local';
            }
                
            this.tooltip = isTracked 
                ? `Click to stop tracking ${branch} for conflicts` 
                : `Click to track ${branch} for conflicts`;
                
            this.contextValue = isTracked ? 'trackedBranch' : 'untrackedBranch';
            this.command = {
                command: 'gitConflictPredictor.toggleBranch',
                title: 'Toggle Branch Tracking',
                arguments: [branch, isTracked, isRemote]
            };
        }
    }
}

export class BranchTrackerProvider implements vscode.TreeDataProvider<BranchItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<BranchItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private configListener: vscode.Disposable;

    constructor(private trackedBranchesManager: TrackedBranchesManager) {
        // Listen for configuration changes
        this.configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('gitConflictPredictor.trackedBranches')) {
                this.refresh();
            }
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: BranchItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<BranchItem[]> {
        const allBranches = await this.getAllBranches();
        const trackedBranches = await this.trackedBranchesManager.getTrackedBranches();
        
        // Create header items
        const localHeader = new BranchItem(
            'Local Branches (click to toggle tracking)',
            false,
            false,
            vscode.TreeItemCollapsibleState.None
        );
        localHeader.iconPath = new vscode.ThemeIcon('git-branch');
        localHeader.command = undefined;
        localHeader.description = '';
        
        const remoteHeader = new BranchItem(
            'Remote Branches (click to download)',
            false,
            false,
            vscode.TreeItemCollapsibleState.None
        );
        remoteHeader.iconPath = new vscode.ThemeIcon('cloud');
        remoteHeader.command = undefined;
        remoteHeader.description = '';
        
        // Разделяем ветки на локальные и удаленные
        const localBranches = allBranches.filter(b => !b.isRemote);
        const remoteBranches = allBranches.filter(b => b.isRemote);
        
        // Сортируем каждую группу
        localBranches.sort((a, b) => a.name.localeCompare(b.name));
        remoteBranches.sort((a, b) => a.name.localeCompare(b.name));
        
        // Создаем элементы для локальных веток
        const localItems = localBranches.map(branchInfo => 
            new BranchItem(
                branchInfo.name, 
                trackedBranches.includes(branchInfo.name),
                branchInfo.isRemote,
                vscode.TreeItemCollapsibleState.None
            )
        );
        
        // Создаем элементы для удаленных веток (с действием скачивания)
        const remoteItems = remoteBranches.map(branchInfo => 
            new BranchItem(
                branchInfo.name, 
                false, // Удаленные ветки не могут быть отслеживаемыми
                branchInfo.isRemote,
                vscode.TreeItemCollapsibleState.None,
                true // Показать действие скачивания
            )
        );
        
        return [
            localHeader, 
            ...localItems,
            remoteHeader,
            ...remoteItems
        ];
    }

    private async getAllBranches(): Promise<{name: string, isRemote: boolean}[]> {
        try {
            const branchOutput = await executeGitCommand('branch -a');
            const branches: {name: string, isRemote: boolean}[] = [];
            const seenNames = new Set<string>();

            branchOutput.split('\n').forEach(line => {
                const trimmed = line.trim().replace('* ', '');
                if (!trimmed || trimmed.includes('HEAD ->')) return;

                if (trimmed.startsWith('remotes/')) {
                    const remoteBranch = trimmed.substring(8); // Remove 'remotes/'
                    
                    // Skip HEAD references and branches without remote prefix
                    if (remoteBranch.includes('HEAD') || !remoteBranch.includes('/')) return;
                    
                    // Extract branch name without remote prefix (e.g., 'origin/feature' -> 'feature')
                    const branchName = remoteBranch.substring(remoteBranch.indexOf('/') + 1);
                    
                    // Add only if not already exists as local or same remote branch
                    if (!seenNames.has(branchName) && !seenNames.has(remoteBranch)) {
                        branches.push({name: remoteBranch, isRemote: true});
                        seenNames.add(remoteBranch);
                        seenNames.add(branchName); // Track short name to avoid duplicates
                    }
                } else {
                    // Local branch
                    if (!seenNames.has(trimmed)) {
                        branches.push({name: trimmed, isRemote: false});
                        seenNames.add(trimmed);
                    }
                }
            });

            return branches;
        } catch (error) {
            console.error('Error getting branches:', error);
            return [];
        }
    }

    async toggleBranch(branch: string, isCurrentlyTracked: boolean, isRemote: boolean): Promise<void> {
        // Только локальные ветки можно отслеживать
        if (isRemote) {
            vscode.window.showWarningMessage('Cannot track remote branches directly. Please download the branch first.');
            return;
        }

        const trackedBranches = await this.trackedBranchesManager.getTrackedBranches();
        let newBranches: string[];
        
        if (isCurrentlyTracked) {
            newBranches = trackedBranches.filter(b => b !== branch);
        } else {
            newBranches = [...trackedBranches, branch];
        }
        
        await this.trackedBranchesManager.updateTrackedBranches(newBranches);
        this.refresh();
    }

    async downloadRemoteBranch(branch: string): Promise<void> {
        try {
            const [remoteName, branchName] = branch.split('/');
            if (!remoteName || !branchName) {
                throw new Error('Invalid remote branch format');
            }

            // Скачиваем удаленную ветку
            await executeGitCommand(`fetch ${remoteName} ${branchName}`);
            
            // Создаем локальную ветку для отслеживания удаленной
            await executeGitCommand(`checkout -b ${branchName} ${remoteName}/${branchName}`);
            
            vscode.window.showInformationMessage(`Downloaded and checked out branch: ${branchName}`);
            
            // Обновляем список веток
            this.refresh();
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to download remote branch ${branch}: ${error}`);
        }
    }

    dispose(): void {
        this.configListener.dispose();
        this._onDidChangeTreeData.dispose();
    }
}