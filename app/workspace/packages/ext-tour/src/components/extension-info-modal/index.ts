import { createShadowDOM } from "../../utils";
import {
  EXT_INFO_SHADOW_HOST_CON_ID,
  EXT_INFO_MODAL_INNERHTML
} from "./utils";

export class ExtensionInfoModal {
  private hostEl: HTMLElement | null = null;

  private countdownInterval: NodeJS.Timeout;

  constructor() {
    const { hostCon } = createShadowDOM(EXT_INFO_SHADOW_HOST_CON_ID, EXT_INFO_MODAL_INNERHTML);

    hostCon.addEventListener("click", () => this.cleanup());
    this.hostEl = hostCon;

    document.body.appendChild(hostCon);
    this.countdownInterval = this.start();
  }

  start(): NodeJS.Timeout {
    return setTimeout(() => {
      this.cleanup();
    }, 5000);
  }

  cleanup() {
    clearInterval(this.countdownInterval);
    this.hostEl?.remove();
  }
}
