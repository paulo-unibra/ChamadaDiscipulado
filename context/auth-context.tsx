import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { API_BASE_URL } from '@/constants/api'

type AuthValue = { token: string | null; loading: boolean; setToken: (value: string | null) => void }
const AuthContext = createContext<AuthValue | null>(null)

if (typeof window !== 'undefined') {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const token = sessionStorage.getItem('chamada-token')
    if (!url.startsWith(API_BASE_URL) || !token) return originalFetch(input, init)
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set('Authorization', `Bearer ${token}`)
    return originalFetch(input, { ...init, headers })
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const savedToken =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('chamada-token') : null
    if (!savedToken) {
      setLoading(false)
      return
    }

    fetch(`${API_BASE_URL}/auth/session`, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('Sessão inválida')
        setTokenState(savedToken)
      })
      .catch(() => {
        sessionStorage.removeItem('chamada-token')
        setTokenState(null)
      })
      .finally(() => setLoading(false))
  }, [])
  const setToken = (value: string | null) => {
    setTokenState(value)
    if (typeof sessionStorage !== 'undefined') {
      if (value) sessionStorage.setItem('chamada-token', value)
      else sessionStorage.removeItem('chamada-token')
    }
  }
  const value = useMemo(() => ({ token, loading, setToken }), [token, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return value
}
