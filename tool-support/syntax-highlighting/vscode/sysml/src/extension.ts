import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let diagnostics: vscode.DiagnosticCollection | undefined;
let validationTimer: NodeJS.Timeout | undefined;

interface WorkspaceDiagnostic {
    uri: string;
    severity: string;
    message: string;
    line?: number;
    column?: number;
    offset?: number;
    length?: number;
    code?: string;
}

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

    diagnostics = vscode.languages.createDiagnosticCollection('sysml-workspace');
    context.subscriptions.push(diagnostics);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        if (isSysMLDocument(document)) {
            scheduleWorkspaceValidation(javaCommand, serverJar);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidCreateFiles(event => {
        if (event.files.some(isSysMLUri)) {
            scheduleWorkspaceValidation(javaCommand, serverJar);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidDeleteFiles(event => {
        if (event.files.some(isSysMLUri)) {
            scheduleWorkspaceValidation(javaCommand, serverJar);
        }
    }));
    scheduleWorkspaceValidation(javaCommand, serverJar);
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
    if (validationTimer) {
        clearTimeout(validationTimer);
        validationTimer = undefined;
    }
    diagnostics?.clear();
    if (client) {
        await client.stop();
        client = undefined;
    }
}

function isSysMLDocument(document: vscode.TextDocument): boolean {
    return document.uri.scheme === 'file' && isSysMLUri(document.uri);
}

function isSysMLUri(uri: vscode.Uri): boolean {
    return uri.fsPath.endsWith('.sysml') || uri.fsPath.endsWith('.kerml');
}

function scheduleWorkspaceValidation(javaCommand: string, serverJar: string): void {
    const config = vscode.workspace.getConfiguration('sysml');
    if (!config.get<boolean>('workspaceValidation.enabled', true)) {
        diagnostics?.clear();
        return;
    }

    if (validationTimer) {
        clearTimeout(validationTimer);
    }
    validationTimer = setTimeout(() => {
        validationTimer = undefined;
        void validateWorkspace(javaCommand, serverJar);
    }, 500);
}

async function validateWorkspace(javaCommand: string, serverJar: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    if (workspaceFolders.length === 0 || !diagnostics) {
        diagnostics?.clear();
        return;
    }

    const args = [
        '-cp',
        serverJar,
        'org.omg.sysml.interactive.SysMLWorkspaceSemanticValidator',
        '--json',
        ...workspaceFolders.map(folder => folder.uri.fsPath)
    ];

    try {
        const stdout = await execFileAsync(javaCommand, args);
        publishWorkspaceDiagnostics(JSON.parse(stdout) as WorkspaceDiagnostic[]);
    } catch (error) {
        if (error instanceof Error && 'stdout' in error && typeof error.stdout === 'string') {
            try {
                publishWorkspaceDiagnostics(JSON.parse(error.stdout) as WorkspaceDiagnostic[]);
                return;
            } catch {
                // Fall through to show the original validator failure.
            }
        }
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showWarningMessage(`SysML workspace validation failed: ${message}`);
    }
}

function execFileAsync(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(command, args, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                const execError = error as Error & { stdout?: string; stderr?: string };
                execError.stdout = stdout;
                execError.stderr = stderr;
                reject(execError);
            } else {
                resolve(stdout);
            }
        });
    });
}

function publishWorkspaceDiagnostics(workspaceDiagnostics: WorkspaceDiagnostic[]): void {
    diagnostics?.clear();
    const byUri = new Map<string, vscode.Diagnostic[]>();
    for (const workspaceDiagnostic of workspaceDiagnostics) {
        const uri = vscode.Uri.parse(workspaceDiagnostic.uri);
        const diagnostic = new vscode.Diagnostic(
            toRange(workspaceDiagnostic),
            workspaceDiagnostic.message,
            toSeverity(workspaceDiagnostic.severity)
        );
        diagnostic.code = workspaceDiagnostic.code;
        const existing = byUri.get(uri.toString()) ?? [];
        existing.push(diagnostic);
        byUri.set(uri.toString(), existing);
    }

    for (const [uri, uriDiagnostics] of byUri) {
        diagnostics?.set(vscode.Uri.parse(uri), uriDiagnostics);
    }
}

function toRange(diagnostic: WorkspaceDiagnostic): vscode.Range {
    const line = Math.max((diagnostic.line ?? 1) - 1, 0);
    const column = Math.max((diagnostic.column ?? 1) - 1, 0);
    const length = Math.max(diagnostic.length ?? 1, 1);
    return new vscode.Range(line, column, line, column + length);
}

function toSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'ERROR':
            return vscode.DiagnosticSeverity.Error;
        case 'WARNING':
            return vscode.DiagnosticSeverity.Warning;
        case 'INFO':
            return vscode.DiagnosticSeverity.Information;
        default:
            return vscode.DiagnosticSeverity.Hint;
    }
}
