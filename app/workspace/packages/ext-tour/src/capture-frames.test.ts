import { captureFrameIds } from "./capture-frames";

const root = { frameId: 0, parentFrameId: -1, url: "https://product.test/" };
const external = { frameId: 1, parentFrameId: 0, url: "https://widget.test/" };
it("captures a nested frame that returns to the top origin across a foreign parent", () => {
  expect(captureFrameIds([root, external, { frameId: 2, parentFrameId: 1, url: root.url }])).toEqual([0, 1, 2]);
});
it("lets a recorder include descendants of its own origin without duplicate injection", () => {
  expect(captureFrameIds([root, external, { frameId: 2, parentFrameId: 1, url: external.url }])).toEqual([0, 1]);
});
it("resolves inherited blank-frame origins and blob origins while keeping opaque content separate", () => {
  expect(captureFrameIds([root,
    { frameId: 1, parentFrameId: 0, url: "about:blank" },
    { frameId: 2, parentFrameId: 1, url: external.url },
    { frameId: 3, parentFrameId: 0, url: "blob:https://product.test/123" },
    { frameId: 4, parentFrameId: 0, url: "data:text/html,opaque" }])).toEqual([0, 2, 4]);
});
