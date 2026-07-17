"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTheme } from "@/lib/useTheme"
import { getProfile, updateProfile } from "@/lib/profile"
import { deleteAllSessions } from "@/lib/chat"
import { submitFeedback, getAllFeedback, type Feedback } from "@/lib/feedback"
import pkg from "../../package.json"

const THEME_OPTIONS = [
  { value: "light", label: "☀️ 라이트" },
  { value: "dark", label: "🌙 다크" },
  { value: "system", label: "💻 시스템" },
] as const

const BASE_TABS = [
  { value: "general", label: "일반" },
  { value: "account", label: "계정" },
  { value: "about", label: "정보" },
] as const

const ADMIN_TAB = { value: "feedback", label: "피드백" } as const

type Tab = (typeof BASE_TABS)[number]["value"] | typeof ADMIN_TAB["value"]

export function SettingsModal({
  email,
  isAdmin,
  onClose,
  onLogout,
}: {
  email: string | null
  isAdmin: boolean
  onClose: () => void
  onLogout: () => void
}) {
  const { theme, setTheme } = useTheme()
  const [tab, setTab] = useState<Tab>("general")
  const tabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS

  const [nickname, setNickname] = useState("")
  const [customInstructions, setCustomInstructions] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [address, setAddress] = useState("")
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then((p) => {
        setNickname(p.nickname ?? "")
        setCustomInstructions(p.custom_instructions ?? "")
        setName(p.name ?? "")
        setPhone(p.phone ?? "")
        setDateOfBirth(p.date_of_birth ?? "")
        setAddress(p.address ?? "")
      })
      .catch((e) => setMessage(String(e)))
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveGeneral() {
    setSavingGeneral(true)
    setMessage(null)
    try {
      await updateProfile({ nickname, custom_instructions: customInstructions })
      setMessage("저장되었습니다.")
    } catch (e) {
      setMessage(String(e))
    } finally {
      setSavingGeneral(false)
    }
  }

  async function handleSaveAccount() {
    setSavingAccount(true)
    setMessage(null)
    try {
      await updateProfile({ name, phone, date_of_birth: dateOfBirth, address })
      setMessage("저장되었습니다.")
    } catch (e) {
      setMessage(String(e))
    } finally {
      setSavingAccount(false)
    }
  }

  async function handleDeleteHistory() {
    if (!window.confirm("모든 대화 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.")) return
    try {
      await deleteAllSessions()
      setMessage("대화 기록이 모두 삭제되었습니다. 새로고침 후 반영됩니다.")
    } catch (e) {
      setMessage(String(e))
    }
  }

  async function handleSendFeedback() {
    if (!feedbackText.trim()) return
    setSendingFeedback(true)
    setMessage(null)
    try {
      await submitFeedback(feedbackText.trim())
      setFeedbackText("")
      setMessage("피드백이 전송되었습니다. 감사합니다!")
    } catch (e) {
      setMessage(String(e))
    } finally {
      setSendingFeedback(false)
    }
  }

  useEffect(() => {
    if (tab !== "feedback" || !isAdmin) return
    setFeedbackLoading(true)
    getAllFeedback()
      .then(setFeedbackList)
      .catch((e) => setMessage(String(e)))
      .finally(() => setFeedbackLoading(false))
  }, [tab, isAdmin])

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 text-black dark:text-white shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b dark:border-gray-700 p-4">
          <h2 className="font-bold">설정</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b dark:border-gray-700 text-sm">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-2 transition-colors ${
                tab === t.value
                  ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-5 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <>
              {tab === "general" && (
                <>
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 mb-2">외모</h3>
                    <div className="flex gap-2">
                      {THEME_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className={`flex-1 text-sm rounded-lg border px-2 py-1.5 transition-colors ${
                            theme === opt.value
                              ? "border-transparent bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 mb-2">닉네임</h3>
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="AI가 어떻게 불러드릴까요?"
                      className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent text-sm"
                    />
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 mb-2">AI 답변 스타일 (지침)</h3>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="예: 항상 존댓말로 답변해주세요. 답변은 간결하게 해주세요."
                      rows={4}
                      className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent text-sm resize-none"
                    />
                  </section>

                  <button
                    onClick={handleSaveGeneral}
                    disabled={savingGeneral}
                    className="btn-primary w-full rounded-lg px-3 py-2 text-sm"
                  >
                    {savingGeneral ? "저장 중..." : "저장"}
                  </button>
                </>
              )}

              {tab === "account" && (
                <>
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 mb-1">이메일</h3>
                      <p className="text-sm">{email}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 mb-1">이름</h3>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent text-sm"
                      />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 mb-1">핸드폰 번호</h3>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent text-sm"
                      />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 mb-1">생년월일</h3>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent text-sm"
                      />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 mb-1">주소 (선택)</h3>
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent text-sm"
                      />
                    </div>
                  </section>

                  <button
                    onClick={handleSaveAccount}
                    disabled={savingAccount}
                    className="btn-primary w-full rounded-lg px-3 py-2 text-sm"
                  >
                    {savingAccount ? "저장 중..." : "저장"}
                  </button>

                  <section className="border-t dark:border-gray-700 pt-4 space-y-2">
                    {isAdmin && (
                      <Link href="/admin" className="block text-sm text-blue-600 hover:underline">
                        👑 관리자 페이지
                      </Link>
                    )}
                    <button
                      onClick={handleDeleteHistory}
                      className="block text-sm text-red-600 hover:underline"
                    >
                      🗑️ 대화 기록 전체 삭제
                    </button>
                    <button onClick={onLogout} className="block text-sm text-red-600 hover:underline">
                      로그아웃
                    </button>
                  </section>
                </>
              )}

              {tab === "about" && (
                <>
                  <section>
                    <p className="text-xs text-gray-400">
                      버전 v{pkg.version} ({process.env.NEXT_PUBLIC_GIT_SHA})
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-2">
                      🎉 이 앱은 완전 무료로 이용하실 수 있습니다
                    </p>
                  </section>

                  <section className="border-t dark:border-gray-700 pt-4">
                    <h3 className="text-xs font-semibold text-gray-500 mb-2">개발자에게 피드백 보내기</h3>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="불편한 점이나 원하는 기능을 자유롭게 남겨주세요."
                      rows={4}
                      className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-transparent text-sm resize-none"
                    />
                    <button
                      onClick={handleSendFeedback}
                      disabled={sendingFeedback || !feedbackText.trim()}
                      className="btn-primary mt-2 w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {sendingFeedback ? "전송 중..." : "피드백 보내기"}
                    </button>
                  </section>
                </>
              )}

              {tab === "feedback" && isAdmin && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500">받은 피드백</h3>
                  {feedbackLoading ? (
                    <p className="text-sm text-gray-500">불러오는 중...</p>
                  ) : feedbackList.length === 0 ? (
                    <p className="text-sm text-gray-500">아직 받은 피드백이 없습니다.</p>
                  ) : (
                    feedbackList.map((f) => (
                      <div key={f.id} className="border dark:border-gray-700 rounded p-3 text-sm">
                        <p className="whitespace-pre-wrap">{f.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {f.email} · {new Date(f.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </section>
              )}

              {message && <p className="text-xs text-gray-500 whitespace-pre-wrap">{message}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
