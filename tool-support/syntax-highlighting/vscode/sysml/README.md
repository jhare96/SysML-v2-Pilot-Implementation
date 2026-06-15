# SysML VS Code Support

This extension contributes SysML syntax highlighting and starts the headless SysML language server for `.sysml` files.
It also acts as a VS Code adapter for the headless workspace semantic validator so the full SysML/KerML semantic and type checks from the pilot implementation are published as workspace diagnostics.

## Language server

Build the all-in-one server jar from the repository and point VS Code at it:

```bash
mvn -pl org.omg.sysml.interactive -am package
```

Then set `sysml.languageServer.jar` to the generated `org.omg.sysml.interactive-*-all.jar` path. The extension launches it with:

```bash
java -cp <jar> org.omg.sysml.interactive.SysMLLanguageServerLauncher
```

Alternatively, package `server/org.omg.sysml.interactive-all.jar` or exactly one jar matching `server/org.omg.sysml.interactive-*-all.jar` inside the extension. The server process starts from the extension directory; workspace folders are provided through the Language Server Protocol by VS Code.

## Workspace semantic validation

When `sysml.workspaceValidation.enabled` is true, the extension runs:

```bash
java -cp <jar> org.omg.sysml.interactive.SysMLWorkspaceSemanticValidator --json <workspace-folder>
```

The validator is headless and IDE-agnostic: it recursively loads `.sysml` and `.kerml` files, honors `.workspace.json` project lists, runs `CheckMode.ALL`, and returns diagnostics that the VS Code adapter publishes for the whole workspace.
