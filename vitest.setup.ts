import "@testing-library/jest-dom";

// jsdom does not implement pointer/scroll APIs used by Radix UI. Polyfill
// them so pointer-driven interactions (Select, Dialog, etc.) work in tests.
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

// Radix Select (and other floating UI) renders content into a portal by
// default. In jsdom the portal container is not part of the document body,
// so queries against `screen` cannot find the opened options. Render the
// portal into the document body so tests can interact with it.
const portalRoot = document.createElement("div");
portalRoot.setAttribute("id", "radix-portal");
document.body.appendChild(portalRoot);
