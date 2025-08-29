import * as vscode from 'vscode';
import * as diff from 'diff';
import { executeGitCommand } from './gitUtils';

export interface ConflictRegion {
    startLine: number;
    endLine: number;
    branch: string;
    theirContent: string;
}

export class DiffAnalyzer {
    private cache: Map<string, { content: string; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private async branchExists(branch: string): Promise<boolean> {
        try {
            await executeGitCommand(`show-ref --verify refs/heads/${branch} || git show-ref --verify refs/remotes/${branch}`);
            return true;
        } catch (error) {
            return false;
        }
    }


    async analyzeConflicts(filePath: string, trackedBranches: string[]): Promise<ConflictRegion[]> {
        const conflicts: ConflictRegion[] = [];
        
        try {
            // Get current branch
            const currentBranch = await executeGitCommand('rev-parse --abbrev-ref HEAD');
            
            // Get current file content (including unsaved changes)
            const currentContent = await this.getCurrentFileContent(filePath);
            
            for (const branch of trackedBranches) {
                if (branch === currentBranch.trim()) continue;
                
                try {
                    const branchConflicts = await this.analyzeBranchConflicts(
                        filePath, 
                        branch, 
                        currentContent
                    );
                    conflicts.push(...branchConflicts);
                } catch (error) {
                    console.error(`Error analyzing conflicts with branch ${branch}:`, error);
                }
            }
        } catch (error) {
            console.error('Error in conflict analysis:', error);
        }
        
        return conflicts;
    }

    private async analyzeBranchConflicts(
        filePath: string, 
        branch: string, 
        currentContent: string
    ): Promise<ConflictRegion[]> {
        const conflicts: ConflictRegion[] = [];
        
        try {
            // Check if branch exists (local or remote)
            const branchExists = await this.branchExists(branch);
            if (!branchExists) {
                return [];
            }
            
            // Get file content in target branch
            const theirContent = await this.getBranchFileContent(filePath, branch);
            if (!theirContent) return [];
            
            // Get base content (common ancestor)
            const baseContent = await this.getBaseFileContent(filePath, branch);
            
            // Compute diffs
            const ourChanges = this.computeDiff(baseContent, currentContent);
            const theirChanges = this.computeDiff(baseContent, theirContent);
            
            // Find overlapping changes
            const overlappingChanges = this.findOverlappingChanges(ourChanges, theirChanges);
            
            // Convert to conflict regions
            for (const change of overlappingChanges) {
                conflicts.push({
                    startLine: change.startLine,
                    endLine: change.endLine,
                    branch: branch,
                    theirContent: theirContent.split('\n').slice(
                        change.startLine, 
                        change.endLine + 1
                    ).join('\n')
                });
            }
        } catch (error) {
            console.error(`Error analyzing conflicts with branch ${branch}:`, error);
        }
        
        return conflicts;
    }

    private async getCurrentFileContent(filePath: string): Promise<string> {
        const document = vscode.workspace.textDocuments.find(doc => 
            doc.fileName === filePath
        );
        
        if (document) {
            return document.getText();
        }
        
        // If file is not open, read from filesystem
        const fs = require('fs').promises;
        return await fs.readFile(filePath, 'utf-8');
    }

    private async getBranchFileContent(filePath: string, branch: string): Promise<string | null> {
        const cacheKey = `${branch}:${filePath}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.content;
        }
        
        try {
            // Get relative path from repo root
            const repoRoot = await executeGitCommand('rev-parse --show-toplevel');
            const relativePath = filePath.replace(repoRoot.trim() + '/', '');
            
            const content = await executeGitCommand(`show ${branch}:${relativePath}`);
            
            // Cache the result
            this.cache.set(cacheKey, {
                content: content,
                timestamp: Date.now()
            });
            
            return content;
        } catch (error) {
            // File might not exist in this branch
            return null;
        }
    }

    private async getBaseFileContent(filePath: string, branch: string): Promise<string> {
        try {
            // Find common ancestor
            const currentBranch = await executeGitCommand('rev-parse --abbrev-ref HEAD');
            const mergeBase = await executeGitCommand(`merge-base ${currentBranch.trim()} ${branch}`);
            
            // Get relative path from repo root
            const repoRoot = await executeGitCommand('rev-parse --show-toplevel');
            const relativePath = filePath.replace(repoRoot.trim() + '/', '');
            
            return await executeGitCommand(`show ${mergeBase.trim()}:${relativePath}`);
        } catch (error) {
            // If we can't find common ancestor, return empty content
            return '';
        }
    }

    private computeDiff(oldStr: string, newStr: string): Array<{startLine: number, endLine: number}> {
        const changes: Array<{startLine: number, endLine: number}> = [];
        const diffResult = diff.diffLines(oldStr, newStr);
        
        let currentLine = 0;
        
        for (const part of diffResult) {
            if (part.added) {
                const lineCount = part.count || 1;
                changes.push({
                    startLine: currentLine,
                    endLine: currentLine + lineCount - 1
                });
            }
            
            if (!part.removed) {
                currentLine += part.count || 0;
            }
        }
        
        return changes;
    }

    private findOverlappingChanges(
        changes1: Array<{startLine: number, endLine: number}>,
        changes2: Array<{startLine: number, endLine: number}>
    ): Array<{startLine: number, endLine: number}> {
        const overlapping: Array<{startLine: number, endLine: number}> = [];
        
        for (const change1 of changes1) {
            for (const change2 of changes2) {
                if (this.changesOverlap(change1, change2)) {
                    overlapping.push({
                        startLine: Math.min(change1.startLine, change2.startLine),
                        endLine: Math.max(change1.endLine, change2.endLine)
                    });
                }
            }
        }
        
        return overlapping;
    }

    private changesOverlap(
        change1: {startLine: number, endLine: number},
        change2: {startLine: number, endLine: number}
    ): boolean {
        return change1.startLine <= change2.endLine && change1.endLine >= change2.startLine;
    }

    clearCache(): void {
        this.cache.clear();
    }
}