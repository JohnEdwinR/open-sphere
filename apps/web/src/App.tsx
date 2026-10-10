import { useRegisterSW } from "virtual:pwa-register/react";
import { GameScreen } from "./screens/GameScreen";
import { useInstallPrompt } from "./useInstallPrompt";
import { useOnline } from "./useOnline";

export function App() {
  const online = useOnline();
  const install = useInstallPrompt();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <div className="shell">
      {!online && <div className="banner warn">Offline — the game still works</div>}
      {needRefresh && (
        <div className="banner">
          A new version is available.
          <button onClick={() => void updateServiceWorker(true)}>Update</button>
        </div>
      )}
      {!install.installed && (install.canPrompt || install.showIosHint) && (
        <div className="banner">
          {install.canPrompt ? (
            <>
              Install Night Wizard to play fullscreen. <button onClick={() => void install.install()}>Install</button>
            </>
          ) : (
            <>To install: tap Share, then “Add to Home Screen”.</>
          )}
        </div>
      )}
      <main className="content">
        <GameScreen />
      </main>
    </div>
  );
}
