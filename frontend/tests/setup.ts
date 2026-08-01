import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react's automatic cleanup-between-tests relies on detecting a
// global afterEach; since this project doesn't run Vitest in `globals: true` mode
// (for consistency with the backend's explicit-import test style), register it here
// instead - otherwise renders from earlier tests in the same file pile up in the DOM.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement these, but Radix UI (Select, Popover, Dialog, Checkbox -
// used throughout this app's components) calls them during open/close/scroll
// interactions. Without these stubs, any test that interacts with a Radix component
// throws "not a function" rather than a real assertion failure.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
