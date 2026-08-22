// Node 18+ exposes the standards-compliant DOMException globally.
// This compatibility entry point replaces the deprecated npm polyfill used by
// fetch-blob while preserving its default-export contract.
export default globalThis.DOMException;
