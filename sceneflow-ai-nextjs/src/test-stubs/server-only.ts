/**
 * `server-only` is supplied by Next.js at build time and is not resolvable
 * under vitest, so importing any module that guards itself with it fails at
 * resolution. Vitest aliases the package here; the marker has no runtime
 * behaviour to reproduce.
 */
export {}
