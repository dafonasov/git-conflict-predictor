import * as vscode from 'vscode';
import { ConflictPredictor } from './conflictPredictor';
import { ConflictRegion } from './diffAnalyzer';

export class HoverProvider implements vscode.HoverProvider {
    constructor(private conflictPredictor: ConflictPredictor) {}

    provideHover(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const line = position.line;
        const conflicts = this.conflictPredictor.getConflictsForLine(line);
        
        if (conflicts.length === 0) {
            return null;
        }

        let content = '**Potential Git Conflicts**\n\n';
        
        for (const conflict of conflicts) {
            content += `- **Branch:** ${conflict.branch}\n`;
            content += `- **Lines:** ${conflict.startLine + 1}-${conflict.endLine + 1}\n`;
            
            // Show a preview of their changes
            const preview = conflict.theirContent.length > 100 
                ? conflict.theirContent.substring(0, 100) + '...' 
                : conflict.theirContent;
                
            content += `- **Their changes:** \`${preview.replace(/\n/g, ' ')}\`\n\n`;
        }
        
        const markdown = new vscode.MarkdownString(content);
        markdown.isTrusted = true;
        
        return new vscode.Hover(markdown);
    }
}