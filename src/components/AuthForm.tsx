"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage("회원가입이 완료되었습니다. 자동으로 로그인됩니다.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMessage(String((err as Error).message ?? err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900 text-black dark:text-white">
      <form onSubmit={handleSubmit} className="w-80 border dark:border-gray-700 rounded p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          required
          className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (6자 이상)"
          required
          minLength={6}
          className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
        />

        {message && <p className="text-sm text-red-600 whitespace-pre-wrap">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded px-3 py-2"
        >
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login")
            setMessage(null)
          }}
          className="w-full text-sm text-gray-500 underline"
        >
          {mode === "login" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
        </button>
      </form>
    </div>
  )
}