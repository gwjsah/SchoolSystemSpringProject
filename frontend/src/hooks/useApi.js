import { useCallback, useEffect, useState } from 'react'
import api, { getErrorMessage } from '../api/client'

/**
 * Loads GET {path} and tracks loading / error state.
 * - `data` is null for a 204 No Content response (for example, no balance owed).
 * - `reload()` fetches again and keeps the old data on screen meanwhile, so pages don't flash.
 * - Pass a null path to skip the request.
 */
export function useApi(path) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .get(path)
      .then((res) => {
        if (!cancelled) setState({ data: res.status === 204 ? null : res.data, loading: false, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }))
      })
    return () => {
      cancelled = true
    }
  }, [path, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { ...state, reload }
}

