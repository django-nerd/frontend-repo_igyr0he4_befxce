import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addTrade, computeStats, deleteTrade, exportTradesToCSV, getAllPairs, listTrades, metaGet, metaSet, updateTrade } from './storage'
import { useSecurityGuards } from './security'
import { Download, LogOut, Plus, Search, SlidersHorizontal, Trash2, Edit3 } from 'lucide-react'

function number(v, d = 2) {
  const n = Number(v || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}

function CalcPL({ value }) {
  const isPos = Number(value) >= 0
  const color = isPos ? 'text-emerald-400' : 'text-red-400'
  return <span className={color}>{isPos ? '+' : ''}{number(value)}</span>
}

function TradeForm({ initial, onCancel, onSave, readOnly }) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0,16))
  const [pair, setPair] = useState(initial?.pair || '')
  const [side, setSide] = useState(initial?.side || 'Long')
  const [entry, setEntry] = useState(initial?.entry || '')
  const [exit, setExit] = useState(initial?.exit || '')
  const [size, setSize] = useState(initial?.size || '')
  const [leverage, setLeverage] = useState(initial?.leverage || '')
  const [takeProfit, setTakeProfit] = useState(initial?.takeProfit || '')
  const [stopLoss, setStopLoss] = useState(initial?.stopLoss || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [screenshot, setScreenshot] = useState(initial?.screenshot || '')

  // Calculate P/L and ROI
  const { profit, roi } = useMemo(() => {
    const e = parseFloat(entry)
    const x = parseFloat(exit)
    const sz = parseFloat(size)
    const lev = parseFloat(leverage || 1)
    if (isNaN(e) || isNaN(x) || isNaN(sz) || isNaN(lev)) return { profit: 0, roi: 0 }
    const dir = side === 'Long' ? 1 : -1
    const pl = (x - e) * sz * lev * dir
    const roi = e !== 0 ? (pl / (e * sz)) * 100 : 0
    return { profit: Math.round(pl * 100) / 100, roi: Math.round(roi * 100) / 100 }
  }, [entry, exit, size, leverage, side])

  const submit = async (e) => {
    e.preventDefault()
    const record = { date, pair, side, entry: Number(entry), exit: Number(exit), size: Number(size), leverage: Number(leverage || 1), takeProfit: takeProfit ? Number(takeProfit) : null, stopLoss: stopLoss ? Number(stopLoss) : null, notes, screenshot, profit, roi }
    if (initial?.id) {
      await updateTrade(initial.id, record)
    } else {
      await addTrade(record)
    }
    onSave && onSave()
  }

  const handleScreenshot = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setScreenshot(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-white/70">Date & Time</label>
        <input type="datetime-local" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} required />
      </div>
      <div>
        <label className="text-sm text-white/70">Pair</label>
        <input value={pair} onChange={(e)=>setPair(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} required placeholder="BTC/USDT" />
      </div>
      <div>
        <label className="text-sm text-white/70">Long/Short</label>
        <select value={side} onChange={(e)=>setSide(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly}>
          <option>Long</option>
          <option>Short</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-white/70">Entry Price</label>
        <input type="number" step="any" value={entry} onChange={(e)=>setEntry(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} required />
      </div>
      <div>
        <label className="text-sm text-white/70">Exit Price</label>
        <input type="number" step="any" value={exit} onChange={(e)=>setExit(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} required />
      </div>
      <div>
        <label className="text-sm text-white/70">Position Size</label>
        <input type="number" step="any" value={size} onChange={(e)=>setSize(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} required />
      </div>
      <div>
        <label className="text-sm text-white/70">Leverage</label>
        <input type="number" step="any" value={leverage} onChange={(e)=>setLeverage(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} />
      </div>
      <div>
        <label className="text-sm text-white/70">Take Profit (optional)</label>
        <input type="number" step="any" value={takeProfit} onChange={(e)=>setTakeProfit(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} />
      </div>
      <div>
        <label className="text-sm text-white/70">Stop Loss (optional)</label>
        <input type="number" step="any" value={stopLoss} onChange={(e)=>setStopLoss(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" disabled={readOnly} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm text-white/70">Notes</label>
        <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" rows={3} disabled={readOnly} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm text-white/70">Upload Screenshot (optional)</label>
        <input type="file" accept="image/*" onChange={(e)=>handleScreenshot(e.target.files?.[0])} disabled={readOnly} />
        {screenshot && <img src={screenshot} alt="screenshot" className="mt-2 max-h-40 rounded border border-white/10" />}
      </div>
      <div className="md:col-span-2 flex gap-3 mt-2">
        {!readOnly && <button type="submit" className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600">Save</button>}
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Cancel</button>
        <div className="ml-auto text-sm self-center">P/L: <CalcPL value={profit} /> | ROI: <span className={roi>=0? 'text-emerald-400': 'text-red-400'}>{number(roi)}%</span></div>
      </div>
    </form>
  )
}

function StatCard({ title, value, sub }) {
  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-white/70 text-sm">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-white/60 mt-1">{sub}</div>}
    </div>
  )
}

function Chart({ data }) {
  // simple SVG cumulative chart
  const width = 600
  const height = 160
  const pad = 24
  const points = (() => {
    if (!data?.length) return []
    const cum = []
    let sum = 0
    for (const d of data) { sum += d.profit; cum.push({ date: d.date, value: sum }) }
    const xs = cum.map((_, i) => i)
    const ys = cum.map((p) => p.value)
    const minY = Math.min(...ys, 0)
    const maxY = Math.max(...ys, 0)
    const xScale = (i) => pad + (i / Math.max(xs.length - 1, 1)) * (width - pad*2)
    const yScale = (v) => height - pad - ((v - minY) / Math.max(maxY - minY || 1, 1)) * (height - pad*2)
    return cum.map((p, i) => `${xScale(i)},${yScale(p.value)}`).join(' ')
  })()
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      <polyline fill="none" stroke="url(#grad)" strokeWidth="2" points={points} />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [role, setRole] = useState('viewer')
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const [pair, setPair] = useState('all')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState([])
  const [pairs, setPairs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  useSecurityGuards()

  useEffect(() => {
    (async () => {
      const r = await metaGet('session_role')
      setRole(r || 'viewer')
      const p = await getAllPairs()
      setPairs(p)
      refresh()
    })()
  }, [])

  const refresh = async () => {
    const { items, total } = await listTrades({ search: query, pair, status, sortBy, sortDir, page, pageSize: 20 })
    setItems(items)
    setTotal(total)
    const s = await computeStats()
    setStats(s)
  }

  useEffect(() => { refresh() }, [query, pair, status, sortBy, sortDir, page])

  const totalPages = Math.max(1, Math.ceil(total / 20))

  const logout = async () => {
    await metaSet('session_role', null)
    navigate('/')
  }

  const downloadCSV = async () => {
    const csv = await exportTradesToCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'trades.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <div className="sticky top-0 z-20 backdrop-blur bg-black/40 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-lg font-semibold">Portfolio Dashboard</div>
          <div className="ml-auto flex items-center gap-2">
            {role === 'admin' && (
              <button onClick={()=>{ setEditItem(null); setShowForm(true) }} className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2"><Plus size={16}/> Add Trade</button>
            )}
            {role === 'admin' && (
              <button onClick={downloadCSV} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 flex items-center gap-2"><Download size={16}/> Export CSV</button>
            )}
            {role === 'admin' && (
              <button onClick={logout} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 flex items-center gap-2"><LogOut size={16}/> Logout</button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard title="Total Trades" value={stats ? stats.totalTrades : '-'} />
          <StatCard title="Win Rate" value={stats ? number(stats.winRate, 2) + '%' : '-'} />
          <StatCard title="Total P/L" value={stats ? <CalcPL value={stats.totalPL}/> : '-'} />
          <StatCard title="Avg ROI" value={stats ? number(stats.avgROI) + '%' : '-'} />
          <StatCard title="Best Pair" value={stats?.bestPair || '-'} />
          <StatCard title="Worst Pair" value={stats?.worstPair || '-'} />
        </div>

        {/* Chart */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-white/70 mb-2">Performance Over Time</div>
          <Chart data={stats?.timeline || []} />
        </div>

        {/* Filters */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 w-full md:w-auto bg-white/10 rounded px-3 py-2"><Search size={16}/><input value={query} onChange={(e)=>{ setPage(1); setQuery(e.target.value) }} placeholder="Search trades" className="bg-transparent outline-none w-full"/></div>
          <div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-white/60"/>
            <select value={pair} onChange={(e)=>{ setPage(1); setPair(e.target.value) }} className="bg-white/10 px-2 py-2 rounded border border-white/10">
              <option value="all">All Pairs</option>
              {pairs.map((p)=> <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={status} onChange={(e)=>{ setPage(1); setStatus(e.target.value) }} className="bg-white/10 px-2 py-2 rounded border border-white/10">
              <option value="all">All</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
            </select>
            <select value={sortBy} onChange={(e)=>{ setPage(1); setSortBy(e.target.value) }} className="bg-white/10 px-2 py-2 rounded border border-white/10">
              <option value="date">Date</option>
              <option value="pair">Pair</option>
              <option value="profit">Profit</option>
            </select>
            <select value={sortDir} onChange={(e)=>{ setPage(1); setSortDir(e.target.value) }} className="bg-white/10 px-2 py-2 rounded border border-white/10">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/10 text-left text-sm">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Pair</th>
                  <th className="px-4 py-2">Side</th>
                  <th className="px-4 py-2">Entry</th>
                  <th className="px-4 py-2">Exit</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Lev</th>
                  <th className="px-4 py-2">P/L</th>
                  <th className="px-4 py-2">ROI</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map((t)=> (
                  <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(t.date).toLocaleString()}</td>
                    <td className="px-4 py-2">{t.pair}</td>
                    <td className="px-4 py-2">{t.side}</td>
                    <td className="px-4 py-2">{number(t.entry)}</td>
                    <td className="px-4 py-2">{number(t.exit)}</td>
                    <td className="px-4 py-2">{number(t.size)}</td>
                    <td className="px-4 py-2">{t.leverage}</td>
                    <td className="px-4 py-2"><CalcPL value={t.profit}/></td>
                    <td className="px-4 py-2">{number(t.roi)}%</td>
                    <td className="px-4 py-2">
                      {role === 'admin' ? (
                        <div className="flex items-center gap-2">
                          <button onClick={()=>{ setEditItem(t); setShowForm(true) }} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"><Edit3 size={14}/></button>
                          <button onClick={async ()=>{ await deleteTrade(t.id); refresh() }} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-red-300"><Trash2 size={14}/></button>
                        </div>
                      ) : (
                        <span className="text-white/40">View</span>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan="10" className="px-4 py-12 text-center text-white/60">No trades found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-sm">
            <div>Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=> setPage(Math.max(1, page-1))} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">Prev</button>
              <button onClick={()=> setPage(Math.min(totalPages, page+1))} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-2xl w-full backdrop-blur-xl bg-gray-900/90 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <div className="text-lg font-semibold">{editItem ? 'Edit Trade' : 'Add Trade'}</div>
              <button onClick={()=> setShowForm(false)} className="ml-auto px-3 py-1 rounded bg-white/10 hover:bg-white/20">Close</button>
            </div>
            <TradeForm initial={editItem} onCancel={()=> setShowForm(false)} onSave={()=> { setShowForm(false); refresh() }} readOnly={role !== 'admin'} />
          </div>
        </div>
      )}
    </div>
  )
}
