package org.omg.sysml.interactive;

import com.google.inject.Injector;
import org.eclipse.xtext.ide.server.ServerLauncher;
import org.eclipse.xtext.ide.server.ServerModule;
import org.omg.kerml.xtext.ide.KerMLIdeSetup;
import org.omg.sysml.xtext.ide.SysMLIdeSetup;

public final class SysMLLanguageServerLauncher {

    private SysMLLanguageServerLauncher() {
    }

    public static void main(String[] args) {
        new KerMLIdeSetup().createInjectorAndDoEMFRegistration();
        Injector languageInjector = new SysMLIdeSetup().createInjectorAndDoEMFRegistration();
        Injector serverInjector = languageInjector.createChildInjector(new ServerModule());
        ServerLauncher launcher = serverInjector.getInstance(ServerLauncher.class);
        launcher.start(ServerLauncher.createLaunchArgs(SysMLLanguageServerLauncher.class.getName(), args));
    }
}
