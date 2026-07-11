"use client"

import { useEffect, useState } from "react"

const SAVED_EMAIL_KEY = "savedEmail"

export function AuthForm({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [rememberEmail, setRememberEmail] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY)
    if (saved) {
      setEmail(saved)
      setRememberEmail(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = { email, password, autoLogin }
      if (mode === "signup") {
        body.name = name
        body.date_of_birth = dateOfBirth
        body.phone = phone
        body.address = address
      }

      const res = await fetch(`/api/auth/${mode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "요청이 실패했습니다.")

      if (rememberEmail) {
        localStorage.setItem(SAVED_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY)
      }

      onAuthenticated?.()
    } catch (err) {
      setMessage(String((err as Error).message ?? err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900 text-black dark:text-white overflow-y-auto py-8">
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

        {mode === "signup" && (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              required
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
            />

            <div>
              <label className="block text-xs text-gray-500 mb-1">생년월일</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
              />
            </div>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="핸드폰 번호"
              required
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
            />

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="주소 (선택)"
              className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
            />
          </>
        )}

        <div className="space-y-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
            />
            이메일 기억하기
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoLogin}
              onChange={(e) => setAutoLogin(e.target.checked)}
            />
            자동 로그인
          </label>
        </div>

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
