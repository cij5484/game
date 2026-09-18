import "./style.css";
const parent = document.getElementById("app");
if (!parent) throw Error("Missing game container: #app");
async function start() {
  let bridge: typeof import("./game/dev/runtimeBridge") | undefined;
  if (import.meta.env.DEV) {
    bridge = await import("./game/dev/runtimeBridge");
    bridge.initializeBalance();
  }
  if (location.pathname.replace(/\/$/, "") === "/dev") {
    parent!.removeAttribute("role");
    parent!.removeAttribute("aria-label");
    if (import.meta.env.DEV) {
      const { mountBalancePanel } = await import("./game/dev/BalancePanel");
      const stop = mountBalancePanel(parent!);
      import.meta.hot?.dispose(stop);
    } else
      parent!.textContent =
        "개발자 밸런스 패널은 개발 환경에서만 사용할 수 있습니다.";
    return;
  }
  const { mountMetaHub } = await import("./game/ui/MetaHub");
  let game: import("phaser").Game | undefined;
  let stopHub: (() => void) | undefined;
  let disposed = false;
  const stopGame = () => {
    const current = game;
    game = undefined;
    if (!current) return;
    for (const scene of current.scene.getScenes(true))
      current.scene.stop(scene.sys.settings.key);
    current.destroy(true);
  };
  const showHub = (error = "") => {
    if (disposed) return;
    stopGame();
    stopHub?.();
    parent!.removeAttribute("role");
    parent!.removeAttribute("aria-label");
    stopHub = mountMetaHub(
      parent!,
      async () => {
        const { createGame } = await import("./game/createGame");
        if (disposed) return;
        stopHub?.();
        stopHub = undefined;
        parent!.setAttribute("role", "img");
        parent!.setAttribute("aria-label", "호드 디펜스 전장");
        try {
          game = createGame(parent!, (error) => showHub(error));
        } catch (error) {
          showHub(error instanceof Error ? error.message : String(error));
        }
      },
      error,
    );
  };
  showHub();
  const stop = bridge?.startBalanceBridge("game", undefined, () => {
    const scene = game?.scene.getScenes(true)[0] as
      | {
          developerStatus?: Omit<
            import("./game/dev/runtimeBridge").GameStatus,
            "connected" | "appliedOverrides"
          >;
        }
      | undefined;
    return scene?.developerStatus ?? { speed: 1, level: 1 };
  });
  import.meta.hot?.dispose(() => {
    disposed = true;
    stop?.();
    stopHub?.();
    stopGame();
  });
}
void start();
