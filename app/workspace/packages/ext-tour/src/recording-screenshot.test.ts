import { sleep } from "@fable/common/dist/utils";
import { recordingScreenshot } from "./recording-screenshot";

jest.mock("@fable/common/dist/utils", () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));

const visible = { id: 7, windowId: 2, active: true, url: "https://example.test/page" };
const get = jest.fn();
const captureVisibleTab = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  get.mockReset().mockResolvedValue(visible);
  captureVisibleTab.mockReset().mockResolvedValue("data:image/png;base64,AAAA");
  Object.defineProperty(globalThis, "chrome", { configurable: true, value: { tabs: { get, captureVisibleTab } } });
});

it("retries one compositor readback failure and returns the successful screenshot", async () => {
  captureVisibleTab.mockRejectedValueOnce(new Error("Failed to capture tab: image readback failed"));
  await expect(recordingScreenshot(7, 2)).resolves.toBe("data:image/png;base64,AAAA");
  expect(captureVisibleTab).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(1100);
});

it("leaves persistent readback failures unresolved after one retry", async () => {
  captureVisibleTab.mockRejectedValue(new Error("image readback failed"));
  await expect(recordingScreenshot(7, 2)).rejects.toThrow("image readback failed");
  expect(captureVisibleTab).toHaveBeenCalledTimes(2);
});

it("does not retry permission failures", async () => {
  captureVisibleTab.mockRejectedValue(new Error("Permission denied"));
  await expect(recordingScreenshot(7, 2)).rejects.toThrow("Permission denied");
  expect(captureVisibleTab).toHaveBeenCalledTimes(1);
  expect(sleep).not.toHaveBeenCalled();
});

it.each([{ active: false }, { url: "https://example.test/other" }, { pendingUrl: "https://example.test/other" }])("rejects a changed page before retry: %s", async change => {
  get.mockResolvedValueOnce(visible).mockResolvedValueOnce(visible).mockResolvedValue({ ...visible, ...change });
  captureVisibleTab.mockRejectedValueOnce(new Error("image readback failed"));
  await expect(recordingScreenshot(7, 2)).rejects.toThrow("no longer visible");
  expect(captureVisibleTab).toHaveBeenCalledTimes(1);
});

it("rejects an image if the tab changed during capture", async () => {
  get.mockResolvedValueOnce(visible).mockResolvedValueOnce(visible).mockResolvedValue({ ...visible, active: false });
  await expect(recordingScreenshot(7, 2)).rejects.toThrow("no longer visible");
});
