import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration('sysml');
    const javaCommand = config.get<string>('languageServer.java', 'java');
    const configuredJar = config.get<string>('languageServer.jar', '');
    const serverJar = configuredJar || findBundledServerJar(context);

    if (!serverJar || !fs.existsSync(serverJar)) {
        vscode.window.showWarningMessage(
            'SysML language server jar not found. Set sysml.languageServer.jar to the absolute path of org.omg.sysml.interactive-*-all.jar.'
        );
        return;
    }

    const serverOptions: ServerOptions = {
        command: javaCommand,
        args: ['-cp', serverJar, 'org.omg.sysml.interactive.SysMLLanguageServerLauncher'],
        options: {
            cwd: context.extensionPath
        }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'sysml' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.sysml')
        }
    };

    client = new LanguageClient('sysml', 'SysML Language Server', serverOptions, clientOptions);
    context.subscriptions.push(client);
    await client.start();
}

function findBundledServerJar(context: vscode.ExtensionContext): string | undefined {
    const serverDirectory = context.asAbsolutePath('server');
    if (!fs.existsSync(serverDirectory)) {
        return undefined;
    }

    const unversionedJar = path.join(serverDirectory, 'org.omg.sysml.interactive-all.jar');
    if (fs.existsSync(unversionedJar)) {
        return unversionedJar;
    }

    const candidates = fs.readdirSync(serverDirectory)
        .filter(file => /^org\.omg\.sysml\.interactive-.*-all\.jar$/.test(file));
    if (candidates.length > 1) {
        vscode.window.showWarningMessage(
            'Multiple bundled SysML language server jars were found. Set sysml.languageServer.jar to the absolute path of the generated org.omg.sysml.interactive-*-all.jar to use, or rename the desired bundled jar to org.omg.sysml.interactive-all.jar.'
        );
        return undefined;
    }
    return candidates.length === 1 ? path.join(serverDirectory, candidates[0]) : undefined;
}

export async function deactivate(): Promise<void> {
    if (client) {
        await client.stop();
        client = undefined;
    }
}
