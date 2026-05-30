import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'preact/hooks'
import { supabase } from './supabase'

export type AuthSession = Session | null

export type AuthState = {
  session: AuthSession
  loading: boolean
}

let passwordRecoveryActive =
  typeof window !== 'undefined' &&
  (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))

export function isPasswordRecoveryActive(): boolean {
  return passwordRecoveryActive
}

export function clearPasswordRecovery(): void {
  passwordRecoveryActive = false
}

export function subscribeToPasswordRecovery(listener: (active: boolean) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      passwordRecoveryActive = true
      listener(true)
    }
    if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      passwordRecoveryActive = false
      listener(false)
    }
  })

  return () => subscription.unsubscribe()
}

export function useAuthSession(): AuthState {
  const [session, setSession] = useState<AuthSession>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return
      }
      if (error) {
        console.warn('Could not read Supabase session', error)
      }
      setSession(passwordRecoveryActive ? null : data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        passwordRecoveryActive = true
        setSession(null)
      } else {
        if (_event === 'SIGNED_OUT' || _event === 'USER_UPDATED') {
          passwordRecoveryActive = false
        }
        setSession(nextSession)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw error
  }
  if (!data.session) {
    throw new Error('No se pudo iniciar sesión.')
  }

  return data.session
}

export async function signUp(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    throw error
  }
  if (!data.session) {
    throw new Error('La cuenta se creó, pero falta activar el inicio de sesión.')
  }

  return data.session
}

export async function resetPasswordForEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  })

  if (error) {
    throw error
  }
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    throw error
  }

  passwordRecoveryActive = false
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname)
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
