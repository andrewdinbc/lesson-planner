'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Shared auth guard for client-side pages. Call at the top of any page
// that needs a logged-in session -- redirects to /login immediately if
// there isn't one, instead of letting the page render and silently fail
// (or surface a confusing "Not authenticated" error deep inside some
// specific feature, like the calendar upload used to).
export function useRequireAuth() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.replace('/login')
        } else {
          setChecked(true)
        }
      })
      .catch(() => router.replace('/login'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return checked
}
