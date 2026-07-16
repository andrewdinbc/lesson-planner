// lib/link-check.js
// Shared link-reachability check for steering document web sources.
// Uses a HEAD request first (cheap), falls back to GET if the server
// doesn't support HEAD (some do return 405/501 for HEAD even when GET
// works fine) -- a real, if imperfect, signal that many "sites" respond
// to HEAD oddly even when genuinely up.
export async function checkLink(url) {
  const attempt = async (method) => {
    const res = await fetch(url, {
      method,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
    return res
  }

  try {
    let res
    try {
      res = await attempt('HEAD')
      if (res.status === 405 || res.status === 501) res = await attempt('GET')
    } catch {
      res = await attempt('GET')
    }
    return { ok: res.ok, statusCode: res.status, error: res.ok ? null : `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, statusCode: null, error: e.name === 'TimeoutError' ? 'Timed out after 10s' : e.message }
  }
}
