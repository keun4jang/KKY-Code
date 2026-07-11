"use client"

import { useEffect, useState } from "react"

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

  async function refresh() {
    try {
      const res = await fetch("/api/auth/session")
      if (res.status === 401) {
        setState({ userId: null, email: null, isAdmin: false, loading: false, errorMsg: null, needsAuth: true })
        return
      }
      if (!res.ok) throw new Error(`세션 확인 실패 (${res.status})`)

      const { session } = await res.json()
      setState({
        userId: session.userId,
        email: session.email,
        isAdmin: session.isAdmin,
        loading: false,
        errorMsg: null,
        needsAuth: false,
      })
    } catch (e) {
      setState({ userId: null, email: null, isAdmin: false, loading: false, errorMsg: String(e), needsAuth: true })
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return { ...state, refresh }
}
