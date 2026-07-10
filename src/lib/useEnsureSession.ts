"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type SessionState = {
  userId: string | null
  email: string | null
  isAdmin: boolean
  loading: boolean
  errorMsg: string | null
  needsAuth: boolean
}

export function useEnsureSession() {
  const [state, setState] = useState<SessionState>({
    userId: null,
    email: null,
    isAdmin: false,
    loading: true,
    errorMsg: null,
    needsAuth: false,
  })

  useEffect(() => {
    const supabase = createClient()

    async function loadAdminFlag(userId: string): Promise<boolean> {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single()
      return data?.is_admin ?? false
    }

    async function check() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        if (data.session) {
          const isAdmin = await loadAdminFlag(data.session.user.id)
          setState({
            userId: data.session.user.id,
            email: data.session.user.email ?? null,
            isAdmin,
            loading: false,
            errorMsg: null,
            needsAuth: false,
          })
        } else {
          setState({ userId: null, email: null, isAdmin: false, loading: false, errorMsg: null, needsAuth: true })
        }
      } catch (e) {
        setState({ userId: null, email: null, isAdmin: false, loading: false, errorMsg: String(e), needsAuth: true })
      }
    }

    check()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadAdminFlag(session.user.id).then((isAdmin) => {
          setState({
            userId: session.user.id,
            email: session.user.email ?? null,
            isAdmin,
            loading: false,
            errorMsg: null,
            needsAuth: false,
          })
        })
      } else {
        setState({ userId: null, email: null, isAdmin: false, loading: false, errorMsg: null, needsAuth: true })
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return state
}