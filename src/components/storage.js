// Simple IndexedDB wrapper for persistent storage (no localStorage)
// Database: crypto_portfolio
// Stores:
// - trades: { id (auto), createdAt, updatedAt, ...fields }
// - meta: { key, value }

const DB_NAME = 'crypto_portfolio'
const DB_VERSION = 1
const TRADE_STORE = 'trades'
const META_STORE = 'meta'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = request.result
      if (!db.objectStoreNames.contains(TRADE_STORE)) {
        const store = db.createObjectStore(TRADE_STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('by_date', 'date', { unique: false })
        store.createIndex('by_pair', 'pair', { unique: false })
        store.createIndex('by_profit', 'profit', { unique: false })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore(storeName, mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = fn(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function metaSet(key, value) {
  return withStore(META_STORE, 'readwrite', (store) => {
    store.put({ key, value })
  })
}

export async function metaGet(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly')
    const store = tx.objectStore(META_STORE)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result ? req.result.value : null)
    req.onerror = () => reject(req.error)
  })
}

export async function addTrade(trade) {
  const now = new Date().toISOString()
  const record = { ...trade, createdAt: now, updatedAt: now }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, 'readwrite')
    const store = tx.objectStore(TRADE_STORE)
    const req = store.add(record)
    req.onsuccess = () => resolve({ ...record, id: req.result })
    req.onerror = () => reject(req.error)
  })
}

export async function updateTrade(id, updates) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, 'readwrite')
    const store = tx.objectStore(TRADE_STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const existing = getReq.result
      if (!existing) {
        reject(new Error('Trade not found'))
        return
      }
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve(updated)
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function deleteTrade(id) {
  return withStore(TRADE_STORE, 'readwrite', (store) => store.delete(id))
}

export async function getTrade(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, 'readonly')
    const store = tx.objectStore(TRADE_STORE)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function applyFilters(list, { search = '', pair = 'all', status = 'all', startDate = null, endDate = null }) {
  const q = search.trim().toLowerCase()
  const inRange = (dt) => {
    const time = new Date(dt).getTime()
    if (startDate && time < new Date(startDate).getTime()) return false
    if (endDate && time > new Date(endDate).getTime()) return false
    return true
  }
  return list.filter((t) => {
    const st = t.side || ''
    const s = `${t.pair || ''} ${t.notes || ''} ${st}`.toLowerCase()
    const bySearch = q ? s.includes(q) : true
    const byPair = pair === 'all' ? true : (t.pair === pair)
    const byStatus = status === 'all' ? true : (status === 'win' ? t.profit > 0 : t.profit <= 0)
    const byDate = inRange(t.date)
    return bySearch && byPair && byStatus && byDate
  })
}

function applySort(list, sortBy = 'date', sortDir = 'desc') {
  const dir = sortDir === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    let va = a[sortBy]
    let vb = b[sortBy]
    if (sortBy === 'date') {
      va = new Date(a.date).getTime()
      vb = new Date(b.date).getTime()
    }
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
}

export async function listTrades({ search = '', pair = 'all', status = 'all', startDate = null, endDate = null, sortBy = 'date', sortDir = 'desc', page = 1, pageSize = 20 } = {}) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, 'readonly')
    const store = tx.objectStore(TRADE_STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      let items = req.result || []
      items = items.map((t) => ({
        ...t,
        profit: Number(t.profit || 0),
        roi: Number(t.roi || 0),
      }))
      const filtered = applyFilters(items, { search, pair, status, startDate, endDate })
      const sorted = applySort(filtered, sortBy, sortDir)
      const total = sorted.length
      const start = (page - 1) * pageSize
      const pageItems = sorted.slice(start, start + pageSize)
      resolve({ items: pageItems, total })
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getAllPairs() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, 'readonly')
    const store = tx.objectStore(TRADE_STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const items = req.result || []
      const set = new Set(items.map((t) => t.pair).filter(Boolean))
      resolve(Array.from(set))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function exportTradesToCSV() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, 'readonly')
    const store = tx.objectStore(TRADE_STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const items = req.result || []
      const headers = ['id','date','pair','side','entry','exit','size','leverage','takeProfit','stopLoss','notes','profit','roi','createdAt','updatedAt']
      const rows = items.map((t) => headers.map((h) => typeof t[h] === 'string' ? '"' + t[h].replace(/"/g,'""') + '"' : t[h] ?? ''))
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      resolve(csv)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function computeStats() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, 'readonly')
    const store = tx.objectStore(TRADE_STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const items = (req.result || []).map((t) => ({ ...t, profit: Number(t.profit || 0), roi: Number(t.roi || 0) }))
      const totalTrades = items.length
      const wins = items.filter((t) => t.profit > 0).length
      const totalPL = items.reduce((s, t) => s + t.profit, 0)
      const avgROI = totalTrades ? items.reduce((s, t) => s + t.roi, 0) / totalTrades : 0
      // Best/Worst pair by total profit
      const pairAgg = {}
      for (const t of items) {
        if (!t.pair) continue
        pairAgg[t.pair] = (pairAgg[t.pair] || 0) + Number(t.profit || 0)
      }
      let bestPair = null
      let worstPair = null
      let bestVal = -Infinity
      let worstVal = Infinity
      for (const [p, v] of Object.entries(pairAgg)) {
        if (v > bestVal) { bestVal = v; bestPair = p }
        if (v < worstVal) { worstVal = v; worstPair = p }
      }
      // Performance over time (by day)
      const byDay = {}
      for (const t of items) {
        const d = new Date(t.date)
        if (isNaN(d)) continue
        const key = d.toISOString().slice(0,10)
        byDay[key] = (byDay[key] || 0) + Number(t.profit || 0)
      }
      const timeline = Object.keys(byDay).sort().map((k) => ({ date: k, profit: byDay[k] }))
      resolve({
        totalTrades,
        winRate: totalTrades ? Math.round((wins / totalTrades) * 10000) / 100 : 0,
        totalPL: Math.round(totalPL * 100) / 100,
        avgROI: Math.round(avgROI * 100) / 100,
        bestPair,
        worstPair,
        timeline,
      })
    }
    req.onerror = () => reject(req.error)
  })
}
