package org.omg.sysml.interactive;

import java.util.Arrays;
import java.util.List;

import org.eclipse.xtext.diagnostics.Severity;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public final class SysMLWorkspaceSemanticValidator {

    private SysMLWorkspaceSemanticValidator() {
    }

    public static void main(String[] args) {
        boolean json = false;
        List<String> paths = Arrays.stream(args)
                .filter(arg -> {
                    boolean isJson = "--json".equals(arg);
                    if (isJson) {
                        return false;
                    }
                    return true;
                })
                .toList();

        json = Arrays.asList(args).contains("--json");

        if (paths.isEmpty()) {
            System.err.println("Usage: SysMLWorkspaceSemanticValidator [--json] WORKSPACE_OR_PROJECT_PATH...");
            System.exit(2);
        }

        try {
            List<SysMLWorkspaceDiagnostic> diagnostics = SysMLWorkspaceSemanticService.create()
                    .validateWorkspaces(paths.toArray(String[]::new));
            if (json) {
                Gson gson = new GsonBuilder().disableHtmlEscaping().create();
                System.out.println(gson.toJson(diagnostics));
            } else {
                diagnostics.forEach(SysMLWorkspaceSemanticValidator::printDiagnostic);
            }
            System.exit(hasErrors(diagnostics) ? 1 : 0);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(2);
        }
    }

    private static boolean hasErrors(List<SysMLWorkspaceDiagnostic> diagnostics) {
        return diagnostics.stream().anyMatch(diagnostic -> Severity.ERROR.name().equals(diagnostic.getSeverity()));
    }

    private static void printDiagnostic(SysMLWorkspaceDiagnostic diagnostic) {
        String location = diagnostic.getUri();
        if (diagnostic.getLine() != null) {
            location += ":" + diagnostic.getLine();
            if (diagnostic.getColumn() != null) {
                location += ":" + diagnostic.getColumn();
            }
        }
        System.out.println(location + ": " + diagnostic.getSeverity() + ": " + diagnostic.getMessage());
    }
}
