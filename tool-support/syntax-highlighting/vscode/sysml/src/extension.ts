import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration('sysml');
    const javaCommand = config.get<string>('languageServer.java', 'java');
    const configuredJar = config.get<string>('languageServer.jar', '');
    const serverJar = configuredJar || context.asAbsolutePath(path.join('server', 'org.omg.sysml.interactive-all.jar'));

    if (!fs.existsSync(serverJar)) {
        vscode.window.showWarningMessage(
            'SysML language server jar not found. Set sysml.languageServer.jar to the org.omg.sysml.interactive-*-all.jar path.'
        );
        return;
    }

    const serverOptions: ServerOptions = {
        command: javaCommand,
        args: ['-cp', serverJar, 'org.omg.sysml.interactive.SysMLLanguageServerLauncher'],
        options: {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'sysml' },
            { scheme: 'file', pattern: '**/*.sysml' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.sysml')
        }
    };

    client = new LanguageClient('sysml', 'SysML Language Server', serverOptions, clientOptions);
    context.subscriptions.push(client);
    await client.start();
}

export async function deactivate(): Promise<void> {
    if (client) {
        await client.stop();
        client = undefined;
    }
}
