# SysML VS Code Support

This extension contributes SysML syntax highlighting and starts the headless SysML language server for `.sysml` files.

## Language server

Build the all-in-one server jar from the repository and point VS Code at it:

```bash
mvn -pl org.omg.sysml.interactive -am package
```

Then set `sysml.languageServer.jar` to the generated `org.omg.sysml.interactive-*-all.jar` path. The extension launches it with:

```bash
java -cp <jar> org.omg.sysml.interactive.SysMLLanguageServerLauncher
```

Alternatively, package `server/org.omg.sysml.interactive-all.jar` or exactly one jar matching `server/org.omg.sysml.interactive-*-all.jar` inside the extension. If no workspace folder is open, the server starts from the extension directory.
