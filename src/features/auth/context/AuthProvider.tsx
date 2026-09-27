import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'

type AuthContextValue = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function isProfileActive(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('active')
    .eq('id', userId)
    .maybeSingle()

  if (error) return true
  return data?.active !== false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      if (data.session && !(await isProfileActive(data.session.user.id))) {
        await supabase.auth.signOut()
        if (mounted) setSession(null)
      } else {
        setSession(data.session)
      }

      if (mounted) setLoading(false)
    }

    void restoreSession()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return

      setSession(nextSession)
      setLoading(false)

      if (nextSession) {
        void isProfileActive(nextSession.user.id).then((active) => {
          if (!mounted || active) return
          void supabase.auth.signOut()
        })
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({ session, loading }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return context
}
