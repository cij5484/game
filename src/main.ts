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
  const { createGame } = await import("./game/createGame");
  const game = createGame(parent!);
  const stop = bridge?.startBalanceBridge("game", undefined, () => {
    const scene = game.scene.getScenes(true)[0] as
      { developerStatus?: { speed: number; level: number } } | undefined;
    return scene?.developerStatus ?? { speed: 1, level: 1 };
  });
  import.meta.hot?.dispose(() => {
    stop?.();
    game.destroy(true);
  });
}
void start();
