package org.omg.sysml.interactive;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.xtext.util.CancelIndicator;
import org.eclipse.xtext.validation.CheckMode;
import org.eclipse.xtext.validation.IResourceValidator;
import org.eclipse.xtext.validation.Issue;
import org.omg.kerml.xtext.KerMLStandaloneSetup;
import org.omg.sysml.io.SysMLUtil;
import org.omg.sysml.xtext.SysMLStandaloneSetup;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.inject.Inject;
import com.google.inject.Injector;

public class SysMLWorkspaceSemanticService extends SysMLUtil {

    @Inject
    private IResourceValidator validator;

    @Inject
    public SysMLWorkspaceSemanticService() {
        super(new StrictShadowingResourceDescriptionData());
        setVerbose(false);
        addExtension(SysMLInteractive.KERML_EXTENSION);
        addExtension(SysMLInteractive.SYSML_EXTENSION);
    }

    public static SysMLWorkspaceSemanticService create() {
        new KerMLStandaloneSetup().createInjectorAndDoEMFRegistration();
        Injector injector = new SysMLStandaloneSetup().createInjectorAndDoEMFRegistration();
        return injector.getInstance(SysMLWorkspaceSemanticService.class);
    }

    public List<SysMLWorkspaceDiagnostic> validateWorkspaces(String... paths) throws IOException {
        for (String path : paths) {
            readWorkspacePath(path);
        }

        List<SysMLWorkspaceDiagnostic> diagnostics = new ArrayList<>();
        List<Resource> resources = new ArrayList<>(getInputResources());
        for (Resource resource : resources) {
            diagnostics.addAll(validateResource(resource));
        }
        return diagnostics;
    }

    protected void readWorkspacePath(String path) throws IOException {
        File workspaceRoot = new File(path);
        List<File> projectRoots = getWorkspaceProjectRoots(workspaceRoot);
        if (projectRoots.isEmpty()) {
            readAll(workspaceRoot, true);
        } else {
            for (File projectRoot : projectRoots) {
                readAll(projectRoot, true);
            }
        }
    }

    protected List<File> getWorkspaceProjectRoots(File workspaceRoot) throws IOException {
        File workspaceFile = new File(workspaceRoot, ".workspace.json");
        if (!workspaceFile.isFile()) {
            return Collections.emptyList();
        }

        Set<File> projectRoots = new LinkedHashSet<>();
        try (FileReader reader = new FileReader(workspaceFile)) {
            JsonObject workspace = JsonParser.parseReader(reader).getAsJsonObject();
            JsonArray projects = workspace.getAsJsonArray("projects");
            if (projects == null) {
                return Collections.emptyList();
            }
            for (JsonElement projectElement : projects) {
                JsonObject project = projectElement.getAsJsonObject();
                JsonElement pathElement = project.get("path");
                if (pathElement != null) {
                    projectRoots.add(new File(workspaceRoot, pathElement.getAsString()));
                }
            }
        }
        return new ArrayList<>(projectRoots);
    }

    protected List<SysMLWorkspaceDiagnostic> validateResource(Resource resource) {
        List<SysMLWorkspaceDiagnostic> diagnostics = new ArrayList<>();
        for (Issue issue : validator.validate(resource, CheckMode.ALL, CancelIndicator.NullImpl)) {
            diagnostics.add(toDiagnostic(issue, resource));
        }
        return diagnostics;
    }

    protected SysMLWorkspaceDiagnostic toDiagnostic(Issue issue, Resource resource) {
        String uri = issue.getUriToProblem() == null ? resource.getURI().toString() : issue.getUriToProblem().trimFragment().toString();
        return new SysMLWorkspaceDiagnostic(
                uri,
                issue.getSeverity() == null ? "INFO" : issue.getSeverity().name(),
                issue.getMessage(),
                issue.getLineNumber(),
                issue.getColumn(),
                issue.getOffset(),
                issue.getLength(),
                issue.getCode());
    }
}
