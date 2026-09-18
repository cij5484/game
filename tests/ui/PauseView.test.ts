import { afterEach, expect, it, vi } from "vitest";
import { PauseView } from "../../src/game/ui/PauseView";

vi.mock("../../src/game/battlefield/layout", () => ({
  readSafeArea: () => ({ top: 12, right: 20, bottom: 0, left: 0 }),
}));
afterEach(() => vi.unstubAllGlobals());

it("cycles native DevSpeed input, blocks it and cleans up at shutdown", () => {
  const elements: ElementStub[] = [];
  class ElementStub extends EventTarget {
    className = "";
    disabled = false;
    textContent = "";
    style = { right: "", top: "" };
    setAttribute = vi.fn();
    append = vi.fn();
    remove = vi.fn();
  }
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", {
    body: { append: vi.fn() },
    createElement: () => {
      const element = new ElementStub();
      elements.push(element);
      return element;
    },
  });
  const changeSpeed = vi.fn();
  const view = new PauseView(vi.fn(), vi.fn(), changeSpeed);
  const speed = elements.find((element) =>
    element.className.includes("dev-speed"),
  )!;
  expect(speed.textContent).toBe("X1");
  for (const value of [2, 4, 1]) {
    speed.dispatchEvent(new Event("click"));
    expect(speed.textContent).toBe(`X${value}`);
    expect(changeSpeed).toHaveBeenLastCalledWith(value);
  }
  view.resize(720, 1280);
  expect(speed.style).toMatchObject({ top: "20px", right: "80px" });
  view.setBlocked(true);
  expect(speed.disabled).toBe(true);
  speed.dispatchEvent(new Event("click"));
  expect(changeSpeed).toHaveBeenCalledTimes(3);
  view.setBlocked(false);
  view.destroy();
  expect(speed.remove).toHaveBeenCalledOnce();
  speed.dispatchEvent(new Event("click"));
  expect(changeSpeed).toHaveBeenCalledTimes(3);
});
