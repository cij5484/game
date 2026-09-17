import { readSafeArea } from "../battlefield/layout";
import { display } from "../data/display";
import type { BuildIcon } from "./buildSummary";

export class PauseView {
  private readonly button = document.createElement("button");
  private readonly dialog = document.createElement("dialog");
  private readonly details = document.createElement("dl");
  private paused = false;
  private readonly keydown: (event: KeyboardEvent) => void;
  private readonly change: (paused: boolean) => void;

  constructor(change: (paused: boolean) => void) {
    this.change = change;
    this.button.className = "pause-button";
    this.button.type = "button";
    this.button.setAttribute("aria-label", display.pause);
    this.button.title = display.pause;
    const icon = document.createElement("span");
    icon.className = "pause-icon";
    icon.setAttribute("aria-hidden", "true");
    this.button.append(icon);
    this.button.addEventListener("click", () => this.toggle());
    this.dialog.className = "level-up pause-dialog";
    this.dialog.setAttribute("aria-label", display.pause);
    const title = document.createElement("h2");
    title.textContent = display.pause;
    const note = document.createElement("p");
    note.textContent = display.pauseDetail;
    const resume = document.createElement("button");
    resume.type = "button";
    resume.textContent = display.resume;
    resume.addEventListener("click", () => this.toggle());
    this.details.className = "pause-build";
    this.dialog.append(title, note, resume, this.details);
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.toggle();
    });
    this.keydown = (event) => {
      if (
        event.code === "Escape" &&
        !event.repeat &&
        !this.dialog.open &&
        !this.button.disabled
      ) {
        event.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener("keydown", this.keydown);
    document.body.append(this.button, this.dialog);
  }

  private toggle(): void {
    if (this.button.disabled) return;
    this.paused = !this.paused;
    this.change(this.paused);
    if (this.paused) this.dialog.showModal();
    else this.dialog.close();
  }

  setBlocked(blocked: boolean): void {
    this.button.disabled = blocked;
  }

  setBuildDetails(entries: readonly BuildIcon[]): void {
    this.details.replaceChildren();
    for (const entry of entries) {
      const title = document.createElement("dt");
      title.textContent = `${entry.symbol} ${entry.title}${entry.level ? ` · ${entry.level}` : ""}`;
      const detail = document.createElement("dd");
      detail.textContent = entry.detail;
      this.details.append(title, detail);
    }
  }

  resize(_width: number, _height: number): void {
    const safe = readSafeArea();
    this.button.style.right = `${safe.right + 8}px`;
    this.button.style.top = `${safe.top + 8}px`;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.keydown);
    this.button.remove();
    this.dialog.remove();
  }
}
