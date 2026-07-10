import type { SupabaseClient } from '@supabase/supabase-js'

export async function createChatSession(supabase: SupabaseClient, title: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인되지 않은 사용자입니다.')

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: user.id, title })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getChatSessions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateSessionTitle(supabase: SupabaseClient, sessionId: string, title: string) {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId)

  if (error) throw error
}

export async function deleteSession(supabase: SupabaseClient, sessionId: string) {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

export async function togglePinSession(supabase: SupabaseClient, sessionId: string, pinned: boolean) {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ is_pinned: pinned })
    .eq('id', sessionId)

  if (error) throw error
}

export async function sendMessage(
  supabase: SupabaseClient,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인되지 않은 사용자입니다.')

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, user_id: user.id, role, content })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMessages(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}
