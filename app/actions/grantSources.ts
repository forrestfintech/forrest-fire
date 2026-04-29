'use server'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getClient() {
  return createClient(url, anonKey)
}

export async function getGrantSources() {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('grant_sources')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function markSourceDone(
  id: string,
  payload: { record_count: number | null; drive_file_url: string | null; notes: string | null },
) {
  const supabase = getClient()
  const { error } = await supabase
    .from('grant_sources')
    .update({
      status: 'done',
      record_count: payload.record_count,
      drive_file_url: payload.drive_file_url,
      notes: payload.notes,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function updateSourceStatus(id: string, status: string) {
  const supabase = getClient()
  const { error } = await supabase
    .from('grant_sources')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function getSourceLogs(sourceId: string) {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('grant_sync_log')
    .select('*')
    .eq('source_id', sourceId)
    .order('started_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data ?? []
}
