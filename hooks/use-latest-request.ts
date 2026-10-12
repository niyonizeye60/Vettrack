import { useCallback, useRef } from "react"

/**
 * Latest-wins guard for a list loader.
 *
 * Record pages free their form as soon as a save lands and refresh their lists in the
 * background, so on a slow connection two refreshes of the same list can be in flight
 * at once. Call the returned function as a request starts and check the result before
 * writing state - only the most recently started request may write, otherwise an older
 * response arriving last would hide a just-saved record or bring back a deleted one.
 */
export function useLatestRequest() {
  const latest = useRef(0)
  return useCallback(() => {
    const id = ++latest.current
    return () => id === latest.current
  }, [])
}
