import * as vscode from 'vscode';
import { StatusBar } from './statusBar';
import { TrackedBranchesManager } from './trackedBranchesManager';
import { Decorations } from './decorations';
import { DiffAnalyzer, ConflictRegion } from './diffAnalyzer';

export class ConflictPredictor implements vscode.Disposable {
    private isActive: boolean = true;
    private decorations: Decorations;
    private diffAnalyzer: DiffAnalyzer;
    private statusBarItem: vscode.StatusBarItem;
    private conflictRegions: ConflictRegion[] = [];
    private diagnosticCollection: vscode.DiagnosticCollection;
    private debounceTimer: NodeJS.Timeout | undefined;
    private currentEditor: vscode.TextEditor | undefined;

    constructor(
        private statusBar: StatusBar,
        private trackedBranchesManager: TrackedBranchesManager
    ) {
        this.decorations = new Decorations();
        this.diffAnalyzer = new DiffAnalyzer();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('gitConflictPredictor');
    }

    async checkForConflicts(): Promise<void> {
        if (!this.isActive) return;

        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        this.currentEditor = editor;

        try {
            const trackedBranches = await this.trackedBranchesManager.getTrackedBranches();
            this.conflictRegions = await this.diffAnalyzer.analyzeConflicts(
                editor.document.fileName, 
                trackedBranches
            );
            
            this.updateUI();
        } catch (error) {
            console.error('Conflict prediction error:', error);
        }
    }

    private updateUI(): void {
        const editor = this.currentEditor;
        if (editor) {
            const ranges = this.conflictRegions.map(conflict => 
                new vscode.Range(conflict.startLine, 0, conflict.endLine, 0)
            );
            
            const decoration = this.decorations.getConflictDecoration();
            editor.setDecorations(decoration, ranges);
            
            // Update diagnostics
            this.updateDiagnostics(editor.document);
        }
        
        this.statusBar.updateCount(this.conflictRegions.length);
        this.updateStatusBar();
    }

    private updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        
        for (const conflict of this.conflictRegions) {
            const range = new vscode.Range(
                conflict.startLine, 0,
                conflict.endLine, 0
            );
            
            const diagnostic = new vscode.Diagnostic(
                range,
                `Potential conflict with branch '${conflict.branch}'`,
                vscode.DiagnosticSeverity.Warning
            );
            
            diagnostic.source = 'Git Conflict Predictor';
            diagnostic.code = `conflict:${conflict.branch}`;
            
            diagnostics.push(diagnostic);
        }
        
        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private updateStatusBar(): void {
        if (this.conflictRegions.length > 0) {
            const branches = [...new Set(this.conflictRegions.map(c => c.branch))].join(', ');
            this.statusBarItem.text = `$(warning) Conflicts with: ${branches}`;
            this.statusBarItem.command = 'gitConflictPredictor.showConflicts';
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    toggle(): void {
        this.isActive = !this.isActive;
        this.statusBar.toggle(this.isActive);
        
        if (this.isActive) {
            this.checkForConflicts();
        } else {
            this.clearUI();
        }
    }

    private clearUI(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this.decorations.getConflictDecoration(), []);
        }
        this.statusBarItem.hide();
        this.diagnosticCollection.clear();
    }

    activate(): void {
        vscode.workspace.onDidSaveTextDocument(() => this.checkForConflicts());
        vscode.window.onDidChangeActiveTextEditor(() => this.checkForConflicts());
        
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document === vscode.window.activeTextEditor?.document) {
                this.debounceCheck();
            }
        });
        
        // Initial check
        setTimeout(() => this.checkForConflicts(), 1000);
    }

    private debounceCheck(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        const config = vscode.workspace.getConfiguration('gitConflictPredictor');
        const delay = config.get<number>('debounceDelay', 1500);
        
        this.debounceTimer = setTimeout(() => {
            this.checkForConflicts();
        }, delay);
    }

    deactivate(): void {
        this.decorations.dispose();
        this.statusBarItem.dispose();
        this.diagnosticCollection.dispose();
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }

    dispose(): void {
        this.deactivate();
    }

    getConflictsForLine(line: number): ConflictRegion[] {
        return this.conflictRegions.filter(conflict => 
            line >= conflict.startLine && line <= conflict.endLine
        );
    }

    showConflictsPanel(): void {
        if (this.conflictRegions.length === 0) {
            vscode.window.showInformationMessage('No potential conflicts found.');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'gitConflicts',
            'Potential Git Conflicts',
            vscode.ViewColumn.Beside,
            {}
        );

        let html = `<h2>Potential Git Conflicts</h2>`;
        html += `<p>Found ${this.conflictRegions.length} potential conflict(s)</p>`;
        html += `<ul>`;
        
        for (const conflict of this.conflictRegions) {
            html += `<li>
                <strong>Branch:</strong> ${conflict.branch}<br>
                <strong>Lines:</strong> ${conflict.startLine + 1}-${conflict.endLine + 1}<br>
                <strong>Their content:</strong><br>
                <pre>${conflict.theirContent}</pre>
            </li>`;
        }
        
        html += `</ul>`;
        panel.webview.html = html;
    }
}