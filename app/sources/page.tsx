'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Clock3, LoaderCircle, RefreshCw, XCircle } from 'lucide-react'

import {
  getGrantSources,
  getSourceLogs,
  markSourceDone,
  updateSourceStatus,
} from '@/app/actions/grantSources'

type GrantSource = {
  id: string
  name: string
  category: string
  jurisdiction: string | null
  source_url: string | null
  status: string
  record_count: number | null
  last_synced_at: string | null
  drive_file_url: string | null
  notes: string | null
  cron_job_id: string | null
  cron_schedule: string | null
  last_run_status: string | null
  last_run_at: string | null
  next_run_at: string | null
  last_error: string | null
}

type SyncLog = {
  id: string
  status: string
  records_added: number
  records_updated: number
  records_total: number | null
  error_message: string | null
  started_at: string
  finished_at: string | null
  triggered_by: string
}

const FILTERS = [
  'All',
  'States',
  'Cities',
  'Canada',
  'Corporate',
  'Web3',
  'Specialty',
] as const

type Filter = (typeof FILTERS)[number]

function filterMatches(source: GrantSource, filter: Filter) {
  if (filter === 'All') return true
  if (filter === 'States') return source.category === 'state'
  if (filter === 'Cities') return source.category === 'city'
  if (filter === 'Canada') return ['canada_federal', 'canada_province', 'canada_city'].includes(source.category)
  if (filter === 'Corporate') return source.category === 'corporate'
  if (filter === 'Web3') return source.category === 'web3'
  if (filter === 'Specialty') {
    return ['women', 'minority', 'nonprofit', 'clean_energy', 'restaurant', 'rural'].includes(source.category)
  }
  return true
}

function statusBadge(status: string) {
  if (status === 'done') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>
  }
  if (status === 'next') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"><ChevronRight className="h-3.5 w-3.5" /> Next</span>
  }
  if (status === 'error') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"><XCircle className="h-3.5 w-3.5" /> Error</span>
  }
  if (status === 'running') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Running</span>
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"><Clock3 className="h-3.5 w-3.5" /> Pending</span>
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function SourcesPage() {
  const [sources, setSources] = useState<GrantSource[]>([])
  const [filter, setFilter] = useState<Filter>('All')
  const [marking, setMarking] = useState<GrantSource | null>(null)
  const [logsSource, setLogsSource] = useState<GrantSource | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [recordCount, setRecordCount] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [notes, setNotes] = useState('')

  async function loadSources() {
    const data = await getGrantSources()
    setSources(data as GrantSource[])
  }

  useEffect(() => {
    loadSources()
  }, [])

  useEffect(() => {
    if (!logsSource) return
    getSourceLogs(logsSource.id).then((rows) => setLogs(rows as SyncLog[]))
  }, [logsSource])

  const filtered = useMemo(() => sources.filter((source) => filterMatches(source, filter)), [sources, filter])

  const stats = useMemo(() => ({
    total: sources.length,
    done: sources.filter((source) => source.status === 'done').length,
    next: sources.filter((source) => source.status === 'next').length,
    pending: sources.filter((source) => source.status === 'pending').length,
  }), [sources])

  async function submitMarkDone() {
    if (!marking) return
    await markSourceDone(marking.id, {
      record_count: recordCount ? Number(recordCount) : null,
      drive_file_url: driveUrl || null,
      notes: notes || null,
    })
    setMarking(null)
    setRecordCount('')
    setDriveUrl('')
    setNotes('')
    await loadSources()
  }

  async function changeStatus(id: string, status: string) {
    await updateSourceStatus(id, status)
    await loadSources()
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="space-y-2">
          <p className="text-3xl font-bold tracking-tight">Forrest Fire 🔥</p>
          <p className="text-base text-zinc-500">Grant Sources</p>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Sources" value={stats.total} tone="zinc" />
          <StatCard label="Done" value={stats.done} tone="green" />
          <StatCard label="Up Next" value={stats.next} tone="yellow" />
          <StatCard label="Pending" value={stats.pending} tone="gray" />
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                item === filter ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {item}
            </button>
          ))}
        </section>

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Records</th>
                  <th className="px-4 py-3">Last Run</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((source) => (
                  <tr key={source.id} className="border-t border-zinc-100 align-top">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-zinc-950">{source.name}</p>
                        <p className="text-xs text-zinc-500">{source.jurisdiction ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 capitalize text-zinc-600">{source.category.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-4">{statusBadge(source.status)}</td>
                    <td className="px-4 py-4 text-zinc-600">{source.record_count ?? '—'}</td>
                    <td className="px-4 py-4 text-zinc-600">{formatDate(source.last_run_at)}</td>
                    <td className="px-4 py-4 text-zinc-600">{source.cron_schedule ?? 'Manual'}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setMarking(source)} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white">Mark Done</button>
                        <button onClick={() => setLogsSource(source)} className="text-left text-xs font-medium text-zinc-600 underline underline-offset-4">View Logs</button>
                        <select value={source.status} onChange={(e) => changeStatus(source.id, e.target.value)} className="rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-700">
                          <option value="pending">pending</option>
                          <option value="next">next</option>
                          <option value="done">done</option>
                          <option value="error">error</option>
                          <option value="running">running</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {marking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Mark {marking.name} done</h2>
            <div className="mt-4 space-y-3">
              <input value={recordCount} onChange={(e) => setRecordCount(e.target.value)} placeholder="Record count" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
              <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="Drive file URL" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="min-h-24 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setMarking(null)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm">Cancel</button>
              <button onClick={submitMarkDone} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {logsSource && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-zinc-950">{logsSource.name} logs</h2>
              <p className="text-sm text-zinc-500">Last 10 sync runs</p>
            </div>
            <button onClick={() => setLogsSource(null)} className="text-sm text-zinc-500">Close</button>
          </div>
          <div className="space-y-3 p-5">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium capitalize text-zinc-950">{log.status}</p>
                  <p className="text-xs text-zinc-500">{formatDate(log.started_at)}</p>
                </div>
                <div className="mt-2 space-y-1 text-xs text-zinc-600">
                  <p>Added: {log.records_added}</p>
                  <p>Updated: {log.records_updated}</p>
                  <p>Total: {log.records_total ?? '—'}</p>
                  {log.error_message ? <p className="text-red-600">{log.error_message}</p> : null}
                </div>
              </div>
            ))}
            {!logs.length ? <p className="text-sm text-zinc-500">No logs yet.</p> : null}
          </div>
        </div>
      )}
    </main>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'zinc' | 'green' | 'yellow' | 'gray' }) {
  const toneClass = {
    zinc: 'bg-zinc-950 text-white',
    green: 'bg-emerald-50 text-emerald-700',
    yellow: 'bg-amber-50 text-amber-700',
    gray: 'bg-zinc-100 text-zinc-700',
  }[tone]

  return (
    <div className={`rounded-2xl p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
