import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { source_name, status, records_added, records_total, error_message, triggered_by } = body

  const { data: source, error: sourceError } = await supabase
    .from('grant_sources')
    .select('*')
    .eq('name', source_name)
    .single()

  if (sourceError || !source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  const { error: logError } = await supabase.from('grant_sync_log').insert({
    source_id: source.id,
    source_name: source_name,
    status,
    records_added: records_added ?? 0,
    records_total: records_total ?? null,
    error_message: error_message ?? null,
    finished_at: now,
    triggered_by: triggered_by ?? 'cron',
  })

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 })
  }

  const updatePayload: Record<string, unknown> = {
    last_run_at: now,
    last_run_status: status,
    record_count: records_total ?? source.record_count,
    last_error: error_message ?? null,
    updated_at: now,
  }

  if (status === 'success') {
    updatePayload.status = 'done'
    updatePayload.last_synced_at = now
  } else if (status === 'running') {
    updatePayload.status = 'running'
  } else if (status === 'error') {
    updatePayload.status = 'error'
  }

  const { error: updateError } = await supabase
    .from('grant_sources')
    .update(updatePayload)
    .eq('id', source.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
