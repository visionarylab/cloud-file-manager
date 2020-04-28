
export function reportError(err: Error|string) {
  if (typeof console.error === 'function') {
    console.error(err)
  }
}
