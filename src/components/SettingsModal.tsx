"use client"

import Link from "next/link"
import { useTheme } from "@/lib/useTheme"
import pkg from "../../package.json"

const THEME_OPTIONS = [
  { value: "light", label: "☀️ 라이트" },
  { value: "dark", label: "🌙 다크" },
  { value: "system", label: "💻 시스템" },
] as const

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

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white shadow-xl"
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

        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          <section>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">외모</h3>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 text-sm rounded border dark:border-gray-600 px-2 py-1.5 ${
                    theme === opt.value ? "bg-black text-white dark:bg-white dark:text-black" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">계정</h3>
            <p className="text-sm truncate mb-2">{email}</p>
            {isAdmin && (
              <Link href="/admin" className="block text-sm text-blue-600 hover:underline mb-2">
                👑 관리자 페이지
              </Link>
            )}
            <button onClick={onLogout} className="text-sm text-red-600 hover:underline">
              로그아웃
            </button>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">정보</h3>
            <p className="text-xs text-gray-400">
              버전 v{pkg.version} ({process.env.NEXT_PUBLIC_GIT_SHA})
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
