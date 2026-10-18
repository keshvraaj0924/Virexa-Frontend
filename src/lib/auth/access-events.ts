export const ACCESS_INVALIDATED = 'virexa:access-invalidated'
/** A denial invalidates cached UI hints; it never automatically retries a mutation. */
export function notifyAccessDenied(status: number) {
  if ((status === 401 || status === 403) && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACCESS_INVALIDATED))
  }
}
