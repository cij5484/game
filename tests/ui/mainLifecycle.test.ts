import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  hub: vi.fn(),
  create: vi.fn(),
  bridge: vi.fn(() => () => {}),
  initialize: vi.fn(),
}));
vi.mock("../../src/game/ui/MetaHub", () => ({ mountMetaHub: mocks.hub }));
vi.mock("../../src/game/createGame", () => ({ createGame: mocks.create }));
vi.mock("../../src/game/dev/runtimeBridge", () => ({
  initializeBalance: mocks.initialize,
  startBalanceBridge: mocks.bridge,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("starts in Hub, cleans combat before returning, and retains one developer bridge", async () => {
  const parent = { removeAttribute: vi.fn(), setAttribute: vi.fn() };
  vi.stubGlobal("document", { getElementById: () => parent });
  vi.stubGlobal("location", { pathname: "/" });
  vi.stubEnv("DEV", true);
  const stopHub = vi.fn();
  mocks.hub.mockReturnValue(stopHub);
  const scene = {
    sys: { settings: { key: "combat" } },
    developerStatus: { speed: 4, level: 8, performance: { fps: 60 } },
  };
  const game = {
    scene: { getScenes: vi.fn(() => [scene]), stop: vi.fn() },
    destroy: vi.fn(),
  };
  mocks.create.mockReturnValue(game);
  await import("../../src/main");
  await vi.waitFor(() => expect(mocks.bridge).toHaveBeenCalledOnce());
  expect(mocks.create).not.toHaveBeenCalled();
  const readStatus = (
    mocks.bridge.mock.calls[0] as unknown as [string, undefined, () => unknown]
  )[2];
  expect(readStatus()).toEqual({ speed: 1, level: 1 });
  await mocks.hub.mock.calls[0]![1]();
  expect(stopHub).toHaveBeenCalledOnce();
  expect(readStatus()).toEqual(scene.developerStatus);
  const onMain = mocks.create.mock.calls[0]![1];
  onMain("출격 저장 오류");
  expect(game.scene.stop).toHaveBeenCalledWith("combat");
  expect(game.destroy).toHaveBeenCalledWith(true);
  expect(game.scene.stop.mock.invocationCallOrder[0]).toBeLessThan(
    game.destroy.mock.invocationCallOrder[0]!,
  );
  expect(mocks.hub).toHaveBeenLastCalledWith(
    parent,
    expect.any(Function),
    "출격 저장 오류",
  );
  expect(readStatus()).toEqual({ speed: 1, level: 1 });
  await mocks.hub.mock.calls[1]![1]();
  expect(mocks.create).toHaveBeenCalledTimes(2);
  expect(mocks.bridge).toHaveBeenCalledOnce();
});
