"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useEnsureSession } from "@/lib/useEnsureSession"
import { getAllUsers, getSessionsByUser, getMessagesBySession, type AdminUser, type AdminSession, type AdminMessage } from "@/lib/admin"

export default function AdminPage() {
  const { isAdmin, loading, needsAuth } = useEnsureSession()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    getAllUsers().then(setUsers).catch((e) => setError(String(e)))
  }, [isAdmin])

  useEffect(() => {
    if (!selectedUserId) return
    setSessions([])
    setSelectedSessionId(null)
    setMessages([])
    getSessionsByUser(selectedUserId).then(setSessions).catch((e) => setError(String(e)))
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedSessionId) return
    setMessages([])
    getMessagesBySession(selectedSessionId).then(setMessages).catch((e) => setError(String(e)))
  }, [selectedSessionId])

  if (loading) return <div className="p-6">로딩 중...</div>
  if (needsAuth) return <div className="p-6">로그인이 필요합니다. <Link href="/" className="underline">메인으로</Link></div>
  if (!isAdmin) return <div className="p-6">관리자 권한이 없습니다. <Link href="/" className="underline">메인으로</Link></div>

  return (
    <div className="flex h-screen overflow-x-auto bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="w-64 shrink-0 border-r dark:border-gray-700 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">사용자 목록</h2>
          <Link href="/" className="text-xs underline text-gray-500">채팅으로</Link>
        </div>
        {error && <p className="text-red-600 text-xs mb-2 whitespace-pre-wrap">{error}</p>}
        <ul className="space-y-1">
          {users.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full text-left px-2 py-1 rounded text-sm truncate ${
                  selectedUserId === u.id ? "bg-gray-200 dark:bg-gray-700" : ""
                }`}
              >
                {u.is_admin ? "👑 " : ""}
                {u.email}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-64 shrink-0 border-r dark:border-gray-700 p-4 overflow-y-auto">
        <h2 className="font-bold mb-4">채팅 세션</h2>
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left px-2 py-1 rounded text-sm truncate ${
                  selectedSessionId === s.id ? "bg-gray-200 dark:bg-gray-700" : ""
                }`}
              >
                {s.title}
              </button>
            </li>
          ))}
          {selectedUserId && sessions.length === 0 && (
            <li className="text-xs text-gray-500">채팅 기록이 없습니다.</li>
          )}
        </ul>
      </div>

      <div className="flex-1 min-w-[320px] p-4 overflow-y-auto space-y-3">
        <h2 className="font-bold mb-4">대화 내용</h2>
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <p className="text-xs text-gray-500 mb-1">
              {m.role} · {new Date(m.created_at).toLocaleString()}
            </p>
            <div
              className={`inline-block rounded px-3 py-2 max-w-[80%] whitespace-pre-wrap text-sm ${
                m.role === "user"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {selectedSessionId && messages.length === 0 && (
          <p className="text-xs text-gray-500">메시지가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
