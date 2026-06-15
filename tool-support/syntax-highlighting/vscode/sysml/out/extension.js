"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const node_1 = require("vscode-languageclient/node");
let client;
async function activate(context) {
    const config = vscode.workspace.getConfiguration('sysml');
    const javaCommand = config.get('languageServer.java', 'java');
    const configuredJar = config.get('languageServer.jar', '');
    const serverJar = configuredJar || findBundledServerJar(context);
    if (!serverJar || !fs.existsSync(serverJar)) {
        vscode.window.showWarningMessage('SysML language server jar not found. Set sysml.languageServer.jar to the absolute path of org.omg.sysml.interactive-*-all.jar.');
        return;
    }
    const serverOptions = {
        command: javaCommand,
        args: ['-cp', serverJar, 'org.omg.sysml.interactive.SysMLLanguageServerLauncher'],
        options: {
            cwd: context.extensionPath
        }
    };
    const clientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'sysml' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.sysml')
        }
    };
    client = new node_1.LanguageClient('sysml', 'SysML Language Server', serverOptions, clientOptions);
    context.subscriptions.push(client);
    await client.start();
}
exports.activate = activate;
function findBundledServerJar(context) {
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
        vscode.window.showWarningMessage('Multiple bundled SysML language server jars were found. Set sysml.languageServer.jar to the absolute path of the generated org.omg.sysml.interactive-*-all.jar to use, or rename the desired bundled jar to org.omg.sysml.interactive-all.jar.');
        return undefined;
    }
    return candidates.length === 1 ? path.join(serverDirectory, candidates[0]) : undefined;
}
async function deactivate() {
    if (client) {
        await client.stop();
        client = undefined;
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map