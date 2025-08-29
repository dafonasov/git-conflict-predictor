import * as vscode from 'vscode';
import { exec } from 'child_process';

export function executeGitCommand(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!cwd) {
            reject(new Error('No workspace folder open'));
            return;
        }

        exec(`git ${cmd}`, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.toString());
            }
        });
    });
}