"use client"

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEnsureSession } from '@/lib/useEnsureSession'
import Link from 'next/link'
import { AuthForm } from '@/components/AuthForm'
import {
  createChatSession,
  getChatSessions,
  getMessages,
  sendMessage,
  updateSessionTitle,
  deleteSession,
  togglePinSession,
} from '@/lib/chat'
import { streamAssistantReply } from '@/lib/gemini'
import { useGeoLocation } from '@/lib/useGeoLocation'
import { MarkdownMessage } from '@/components/MarkdownMessage'

type ChatSession = { id: string; title: string; is_pinned: boolean }
type ChatMessage = { id: string; role: string; content: string }

export default function Home() {
  const { userId, email, isAdmin, loading, errorMsg, needsAuth } = useEnsureSession()
  const location = useGeoLocation()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [search, setSearch] = useState('')
  const [dark, setDark] = useState(false)
  const [lastUserText, setLastUserText] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSessions([])
    setActiveSessionId(null)
    setMessages([])
  }

  useEffect(() => {
    if (!userId) return
    getChatSessions(supabase).then(setSessions).catch((e) => setFetchError(String(e)))
  }, [userId])

  useEffect(() => {
    if (!activeSessionId) return
    getMessages(supabase, activeSessionId).then(setMessages).catch((e) => setFetchError(String(e)))
  }, [activeSessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function handleNewSession() {
    const session = await createChatSession(supabase, '??梨꾪똿')
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setMessages([])
  }

  async function handleRename(sessionId: string) {
    const newTitle = window.prompt('??梨꾪똿 ?대쫫???낅젰?섏꽭??)
    if (!newTitle) return
    await updateSessionTitle(supabase, sessionId, newTitle)
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s)))
  }

  async function handleDelete(sessionId: string) {
    if (!window.confirm('??梨꾪똿????젣?섏떆寃좎뒿?덇퉴?')) return
    await deleteSession(supabase, sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      setActiveSessionId(null)
      setMessages([])
    }
  }

  async function handleTogglePin(session: ChatSession) {
    const next = !session.is_pinned
    await togglePinSession(supabase, session.id, next)
    setSessions((prev) =>
      [...prev.map((s) => (s.id === session.id ? { ...s, is_pinned: next } : s))].sort(
        (a, b) => Number(b.is_pinned) - Number(a.is_pinned)
      )
    )
  }

  async function runAssistant(historyForModel: { role: 'user' | 'assistant'; content: string }[]) {
    if (!activeSessionId) return
    setSending(true)
    setStreamingText('')
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const finalText = await streamAssistantReply(
        supabase,
        historyForModel,
        (textSoFar) => setStreamingText(textSoFar),
        controller.signal,
        userId,
        location
      )
      const assistantMsg = await sendMessage(supabase, activeSessionId, 'assistant', finalText)
      setMessages((prev) => [...prev, assistantMsg])

      const currentSession = sessions.find((s) => s.id === activeSessionId)
      if (currentSession && (currentSession.title === '??梨꾪똿' || currentSession.title === 'New Chat')) {
        const autoTitle = historyForModel[0]?.content.slice(0, 30) || '??梨꾪똿'
        await updateSessionTitle(supabase, activeSessionId, autoTitle)
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, title: autoTitle } : s))
        )
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('AI ?묐떟 ?ㅽ뙣:', e)
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
    setInput('')
    setLastUserText(text)

    const userMsg = await sendMessage(supabase, activeSessionId, 'user', text)
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    const historyForModel = newMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    await runAssistant(historyForModel)
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

  if (loading) return <div className="p-6">濡쒓렇??泥섎━ 以?..</div>

  if (needsAuth) return <AuthForm />

  if (errorMsg) {
    return (
      <div className="p-6 text-red-600">
        <p className="font-bold">濡쒓렇???ㅻ쪟:</p>
        <pre className="whitespace-pre-wrap">{errorMsg}</pre>
      </div>
    )
  }

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      <aside className="w-64 border-r dark:border-gray-700 p-4 space-y-2 flex flex-col">
        <button
          onClick={handleNewSession}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded px-3 py-2"
        >
          + ??梨꾪똿
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="梨꾪똿 寃??
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
                onClick={() => setActiveSessionId(s.id)}
                className="flex-1 text-left px-3 py-2 truncate text-sm"
              >
                {s.is_pinned ? '?뱦 ' : ''}
                {s.title}
              </button>
              <div className="hidden group-hover:flex gap-1 pr-2 text-xs">
                <button onClick={() => handleTogglePin(s)} title="怨좎젙">?뱦</button>
                <button onClick={() => handleRename(s.id)} title="?대쫫蹂寃?>?륅툘</button>
                <button onClick={() => handleDelete(s.id)} title="??젣">?뿊截?/button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={toggleDark} className="text-sm border dark:border-gray-600 rounded px-2 py-1">
          {dark ? '?截??쇱씠??紐⑤뱶' : '?뙔 ?ㅽ겕 紐⑤뱶'}
        </button>

        <div className="border-t dark:border-gray-700 pt-2 text-xs space-y-1">
          <p className="truncate text-gray-500">{email}</p>
          <button
            onClick={handleLogout}
            className="w-full text-left text-red-600 hover:underline"
          >
            濡쒓렇?꾩썐
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {fetchError && (
          <div className="p-4 bg-red-50 text-red-600 text-sm whitespace-pre-wrap">
            {fetchError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block rounded px-3 py-2 max-w-[80%] text-left ${
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
                <MarkdownMessage content={streamingText || '?앷컖 以?..'} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex flex-col gap-2">
          {sending ? (
            <button
              onClick={handleStop}
              className="self-start text-sm border rounded px-3 py-1 text-red-600 border-red-300"
            >
              ???묐떟 ?뺤?
            </button>
          ) : (
            messages.length > 0 && (
              <button
                onClick={handleRegenerate}
                className="self-start text-sm border dark:border-gray-600 rounded px-3 py-1"
              >
                ?봽 ?ㅼ떆 ?앹꽦
              </button>
            )
          )}

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 border dark:border-gray-600 rounded px-3 py-2 bg-transparent"
              placeholder="硫붿떆吏瑜??낅젰?섏꽭??
              disabled={sending || !activeSessionId}
            />
            <button
              onClick={handleSend}
              className="bg-black dark:bg-white text-white dark:text-black rounded px-4 py-2"
              disabled={sending || !activeSessionId}
            >
              蹂대궡湲?            </button>
          </div>
        </div>
      </main>
    </div>
  )
}