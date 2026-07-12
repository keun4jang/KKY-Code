"use client"

import { useEffect, useRef, useState } from 'react'
import { useEnsureSession } from '@/lib/useEnsureSession'
import { AuthForm } from '@/components/AuthForm'
import { SettingsModal } from '@/components/SettingsModal'
import {
  createChatSession,
  getChatSessions,
  getMessages,
  sendMessage,
  updateSessionTitle,
  deleteSession,
  togglePinSession,
} from '@/lib/chat'
import { streamAssistantReply, type Attachment } from '@/lib/gemini'
import { useGeoLocation } from '@/lib/useGeoLocation'
import { MarkdownMessage } from '@/components/MarkdownMessage'
import { getUsage, type Usage } from '@/lib/usage'
import pkg from '../../package.json'

type ChatSession = { id: string; title: string; is_pinned: boolean }
type ChatMessage = { id: string; role: string; content: string }

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
]

export default function Home() {
  const { email, isAdmin, loading, errorMsg, needsAuth, refresh } = useEnsureSession()
  const location = useGeoLocation()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [search, setSearch] = useState('')
  const [lastUserText, setLastUserText] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [statusText, setStatusText] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [attachError, setAttachError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAttachError(null)

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachError('이미지, PDF, 텍스트 파일만 첨부할 수 있습니다.')
      return
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError('파일 크기는 3MB 이하만 지원합니다.')
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    const base64 = dataUrl.split(',')[1] ?? ''
    setAttachment({ name: file.name, mimeType: file.type, data: base64 })
  }

  function clearAttachment() {
    setAttachment(null)
    setAttachError(null)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setSessions([])
    setActiveSessionId(null)
    setMessages([])
    refresh()
  }

  useEffect(() => {
    if (needsAuth || loading) return
    getChatSessions().then(setSessions).catch((e) => setFetchError(String(e)))
  }, [needsAuth, loading])

  useEffect(() => {
    if (needsAuth || loading) return
    const refreshUsage = () => getUsage().then(setUsage).catch(() => {})
    refreshUsage()
    const interval = setInterval(refreshUsage, 30000)
    return () => clearInterval(interval)
  }, [needsAuth, loading])

  useEffect(() => {
    if (!activeSessionId) return
    getMessages(activeSessionId).then(setMessages).catch((e) => setFetchError(String(e)))
  }, [activeSessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function handleNewSession() {
    const session = await createChatSession('새 채팅')
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setMessages([])
  }

  async function handleRename(sessionId: string) {
    const newTitle = window.prompt('새 채팅 이름을 입력하세요')
    if (!newTitle) return
    await updateSessionTitle(sessionId, newTitle)
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s)))
  }

  async function handleDelete(sessionId: string) {
    if (!window.confirm('이 채팅을 삭제하시겠습니까?')) return
    await deleteSession(sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      setActiveSessionId(null)
      setMessages([])
    }
  }

  async function handleTogglePin(session: ChatSession) {
    const next = !session.is_pinned
    await togglePinSession(session.id, next)
    setSessions((prev) =>
      [...prev.map((s) => (s.id === session.id ? { ...s, is_pinned: next } : s))].sort(
        (a, b) => Number(b.is_pinned) - Number(a.is_pinned)
      )
    )
  }

  async function runAssistant(
    historyForModel: { role: 'user' | 'assistant'; content: string }[],
    attachmentForThisTurn?: Attachment | null
  ) {
    if (!activeSessionId) return
    setSending(true)
    setStreamingText('')
    setStatusText('')
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const finalText = await streamAssistantReply(
        historyForModel,
        (textSoFar) => setStreamingText(textSoFar),
        controller.signal,
        location,
        (status) => setStatusText(status),
        attachmentForThisTurn
      )
      const assistantMsg = await sendMessage(activeSessionId, 'assistant', finalText)
      setMessages((prev) => [...prev, assistantMsg])
      getUsage().then(setUsage).catch(() => {})

      const currentSession = sessions.find((s) => s.id === activeSessionId)
      if (currentSession && (currentSession.title === '새 채팅' || currentSession.title === 'New Chat')) {
        const autoTitle = historyForModel[0]?.content.slice(0, 30) || '새 채팅'
        await updateSessionTitle(activeSessionId, autoTitle)
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, title: autoTitle } : s))
        )
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('AI 응답 실패:', e)
        setFetchError(String(e))
      }
    } finally {
      setStreamingText('')
      setSending(false)
      abortRef.current = null
    }
  }

  async function handleSend() {
    if (!activeSessionId || !input.trim() || sending) return
    const text = input
    const currentAttachment = attachment
    setInput('')
    setLastUserText(text)
    setAttachment(null)
    setAttachError(null)

    const displayText = currentAttachment ? `📎 ${currentAttachment.name}\n${text}` : text
    const userMsg = await sendMessage(activeSessionId, 'user', displayText)
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    const historyForModel = newMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    await runAssistant(historyForModel, currentAttachment)
  }

  async function handleRegenerate() {
    if (!lastUserText || messages.length === 0) return
    const withoutLastAssistant = messages.filter((_, i) => i !== messages.length - 1)
    setMessages(withoutLastAssistant)
    const historyForModel = withoutLastAssistant.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    await runAssistant(historyForModel)
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  if (loading) return <div className="p-6">로그인 처리 중...</div>

  if (needsAuth) return <AuthForm onAuthenticated={refresh} />

  if (errorMsg) {
    return (
      <div className="p-6 text-red-600">
        <p className="font-bold">로그인 오류:</p>
        <pre className="whitespace-pre-wrap">{errorMsg}</pre>
      </div>
    )
  }

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900 text-black dark:text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 shrink-0 border-r dark:border-gray-700 p-4 pt-[max(1rem,env(safe-area-inset-top))] space-y-2 flex flex-col bg-white dark:bg-gray-900 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <p className="text-[11px] text-center text-green-600 dark:text-green-400 font-semibold">
          🎉 완전 무료로 이용 가능한 AI 챗봇
        </p>
        {usage && (
          <p className="text-[11px] text-center text-gray-500">
            오늘 남은 질문 (전체 공용): {usage.remaining} / {usage.limit}
          </p>
        )}

        <button
          onClick={() => {
            handleNewSession()
            setSidebarOpen(false)
          }}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded px-3 py-2"
        >
          + 새 채팅
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="채팅 검색"
          className="w-full border dark:border-gray-600 rounded px-2 py-1 text-sm bg-transparent"
        />

        <div className="flex-1 overflow-y-auto space-y-1">
          {filteredSessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center rounded ${
                activeSessionId === s.id ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
            >
              <button
                onClick={() => {
                  setActiveSessionId(s.id)
                  setSidebarOpen(false)
                }}
                className="flex-1 text-left px-3 py-2 truncate text-sm"
              >
                {s.is_pinned ? '📌 ' : ''}
                {s.title}
              </button>
              <div className="hidden group-hover:flex gap-1 pr-2 text-xs">
                <button onClick={() => handleTogglePin(s)} title="고정">📌</button>
                <button onClick={() => handleRename(s.id)} title="이름변경">✏️</button>
                <button onClick={() => handleDelete(s.id)} title="삭제">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t dark:border-gray-700 pt-2 text-xs space-y-1">
          <p className="truncate text-gray-500">{email}</p>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full text-left hover:underline"
          >
            ⚙️ 설정
          </button>
          <p className="text-gray-400 dark:text-gray-600">v{pkg.version}</p>
        </div>
      </aside>

      {settingsOpen && (
        <SettingsModal
          email={email}
          isAdmin={isAdmin}
          onClose={() => setSettingsOpen(false)}
          onLogout={() => {
            setSettingsOpen(false)
            handleLogout()
          }}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden p-2 pt-[max(0.5rem,env(safe-area-inset-top))] border-b dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-sm border dark:border-gray-600 rounded px-2 py-1"
          >
            ☰ 메뉴
          </button>
        </div>

        {fetchError && (
          <div className="p-4 bg-red-50 text-red-600 text-sm whitespace-pre-wrap">
            {fetchError}
          </div>
        )}

        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {!activeSessionId && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-500 dark:text-gray-400">
              <p className="text-sm">
                아직 대화가 없습니다.
                <br />
                왼쪽 위 <span className="font-semibold text-black dark:text-white">&quot;+ 새 채팅&quot;</span> 버튼을 눌러 대화를 시작해보세요!
              </p>
              <button
                onClick={handleNewSession}
                className="bg-black dark:bg-white text-white dark:text-black rounded px-4 py-2 text-sm"
              >
                + 새 채팅 시작하기
              </button>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                🎉 이 앱은 완전 무료로 이용하실 수 있습니다
              </p>
              {usage && (
                <p className="text-xs text-gray-500">
                  오늘 남은 질문 (전체 공용): {usage.remaining} / {usage.limit}
                </p>
              )}
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block rounded px-3 py-2 max-w-[80%] break-words text-left ${
                  m.role === 'user'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <MarkdownMessage content={m.content} />
              </div>
            </div>
          ))}

          {sending && (
            <div className="text-left">
              <div className="inline-block rounded px-3 py-2 max-w-[80%] bg-gray-100 dark:bg-gray-800">
                {streamingText ? (
                  <MarkdownMessage content={streamingText} />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    {statusText || '생각 중...'}
                  </p>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t dark:border-gray-700 flex flex-col gap-2">
          {sending ? (
            <button
              onClick={handleStop}
              className="self-start text-sm border rounded px-3 py-1 text-red-600 border-red-300"
            >
              ⏹ 응답 정지
            </button>
          ) : (
            messages.length > 0 && (
              <button
                onClick={handleRegenerate}
                className="self-start text-sm border dark:border-gray-600 rounded px-3 py-1"
              >
                🔄 다시 생성
              </button>
            )
          )}

          {attachment && (
            <div className="flex items-center gap-2 text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 self-start">
              <span>📎 {attachment.name}</span>
              <button onClick={clearAttachment} className="text-gray-500 hover:text-red-500">
                ✕
              </button>
            </div>
          )}
          {attachError && <p className="text-xs text-red-500">{attachError}</p>}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 border dark:border-gray-600 rounded px-3 py-2"
              disabled={sending || !activeSessionId}
              title="파일 첨부 (이미지 / PDF / 텍스트, 3MB 이하)"
            >
              📎
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 min-w-0 border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
              placeholder="메시지를 입력하세요 (그림을 그려달라고 요청할 수도 있어요)"
              disabled={sending || !activeSessionId}
            />
            <button
              onClick={handleSend}
              className="shrink-0 bg-black dark:bg-white text-white dark:text-black rounded px-4 py-2"
              disabled={sending || !activeSessionId}
            >
              보내기
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
