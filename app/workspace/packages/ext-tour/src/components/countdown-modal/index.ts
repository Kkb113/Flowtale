import { createShadowDOM } from "../../utils";
import {
  COUNTDOWN_SHADOW_HOST_CON_ID,
  COUNTDOWN_NUM_ID,
  COUNTDOWN_SECOND_LINE_ID,
  COUNTDOWN_SKIP_ID,
  COUNTDOWN_INNERHTML,
} from "./utils";

export class CountDownModal {
  private hostConEl: HTMLElement | null = null;

  private shadowRoot: ShadowRoot | null = null;

  private cdInterval: NodeJS.Timeout;

  private cdNumEl: HTMLElement | null = null;

  private cdSecondLine: HTMLElement | null = null;

  private cdSkipBtn: HTMLElement | null = null;

  onCountDownComplete;

  constructor(onCountDownComplete: () => void) {
    const { hostCon, shadowRoot } = createShadowDOM(COUNTDOWN_SHADOW_HOST_CON_ID, COUNTDOWN_INNERHTML);

    this.onCountDownComplete = onCountDownComplete;
    this.hostConEl = hostCon;
    this.shadowRoot = shadowRoot;

    this.cdNumEl = this.shadowRoot.getElementById(COUNTDOWN_NUM_ID);
    this.cdSecondLine = this.shadowRoot.getElementById(COUNTDOWN_SECOND_LINE_ID);

    this.cdSkipBtn = this.shadowRoot.getElementById(COUNTDOWN_SKIP_ID);
    this.cdSkipBtn!.addEventListener("click", () => this.cleanup());

    document.body.appendChild(hostCon);
    this.cdInterval = this.start();
  }

  start(): NodeJS.Timeout {
    let count = 5;

    const countdownInterval = setInterval(() => {
      count--;
      if (count < 0 || !this.hostConEl) { this.cleanup(); return; }

      if (count === 3) {
        this.cdSecondLine?.classList.remove("hide");
      }

      this.updateCountdownNum(count);
    }, 1000);

    return countdownInterval;
  }

  updateCountdownNum(count: number) {
    /**
     * Such checks are made as the original webpage can have DOM changes which can delete these elements
     * In this case our content script should not fail.
     */
    if (!this.cdNumEl) { this.cleanup(); return; }
    this.cdNumEl!.textContent = count.toString();
  }

  cleanup() {
    clearInterval(this.cdInterval);
    this.hostConEl?.remove();
    this.onCountDownComplete();
  }
}
