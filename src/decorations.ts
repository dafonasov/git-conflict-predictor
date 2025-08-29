import * as vscode from 'vscode';

export class Decorations {
    private conflictDecoration: vscode.TextEditorDecorationType;

    constructor() {
        this.conflictDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.createWarningIcon(),
            gutterIconSize: 'contained',
            backgroundColor: new vscode.ThemeColor('editorWarning.background'),
            overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            borderColor: new vscode.ThemeColor('editorWarning.border'),
            borderWidth: '1px',
            cursor: 'pointer'
        });
    }

    private createWarningIcon(): vscode.Uri {
        const svg = `
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7" fill="orange" stroke="darkorange" stroke-width="1"/>
                <text x="8" y="11" text-anchor="middle" fill="black" font-size="10" font-weight="bold">!</text>
            </svg>
        `;
        return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    }

    getConflictDecoration(): vscode.TextEditorDecorationType {
        return this.conflictDecoration;
    }

    dispose(): void {
        this.conflictDecoration.dispose();
    }
}