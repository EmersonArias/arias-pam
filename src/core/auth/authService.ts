import type { Session as SupabaseSession } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export type AriasUser = {
  id: string
  email: string | null
  fullName: string | null
}

export type AriasSession = {
  user: AriasUser
  accessToken: string
}

export type AuthResult<T> = {
  data: T | null
  error: Error | null
}

export type AuthStateListener = (session: AriasSession | null) => void

export type AuthSubscription = {
  unsubscribe: () => void
}

function mapSession(session: SupabaseSession | null): AriasSession | null {
  if (!session) return null

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      fullName:
        (session.user.user_metadata?.full_name as string | undefined) ??
        (session.user.user_metadata?.name as string | undefined) ??
        null,
    },
    accessToken: session.access_token,
  }
}

export const ariasAuth = {
  async getSession(): Promise<AuthResult<AriasSession>> {
    const { data, error } = await supabase.auth.getSession()

    return {
      data: mapSession(data.session),
      error: error ? new Error(error.message) : null,
    }
  },

  async signIn(email: string, password: string): Promise<AuthResult<AriasSession>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return {
      data: mapSession(data.session),
      error: error ? new Error(error.message) : null,
    }
  },

  async signOut(): Promise<AuthResult<null>> {
    const { error } = await supabase.auth.signOut()

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    }
  },

  onAuthStateChange(listener: AuthStateListener): AuthSubscription {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(mapSession(session))
    })

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    }
  },

  async isProfileActive(userId: string): Promise<AuthResult<boolean>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      return {
        data: null,
        error: new Error(error.message),
      }
    }

    return {
      data: data?.active !== false,
      error: null,
    }
  },
}
