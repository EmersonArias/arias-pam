import type { Session as SupabaseSession } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import type {
  AriasAuthService,
  AriasSession,
  AuthResult,
  AuthStateListener,
  AuthSubscription,
} from '../types'

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
      emailConfirmedAt: session.user.email_confirmed_at ?? null,
    },
    accessToken: session.access_token,
  }
}

export const supabaseAuthProvider: AriasAuthService = {
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

  async requestPasswordReset(email: string): Promise<AuthResult<null>> {
    const redirectTo = `${window.location.origin}/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    }
  },

  async updatePassword(password: string): Promise<AuthResult<null>> {
    const { error } = await supabase.auth.updateUser({ password })

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    }
  },

  async activateAccount(): Promise<AuthResult<boolean>> {
    const { data, error } = await supabase.rpc('activate_my_account')

    return {
      data: data ?? false,
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
