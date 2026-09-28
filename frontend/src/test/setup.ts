import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom implements none of these; the viewer and the upload preview rely on them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollTo ??= function scrollTo() {};
// Vitest's own createObjectURL cannot read jsdom File objects, so replace it.
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};
