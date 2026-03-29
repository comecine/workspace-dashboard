import { useState, useEffect } from 'react'
import { fetchLinks, addLink as apiAddLink, updateLink as apiUpdateLink, removeLink as apiRemoveLink, reorderLinks, hasLinksApi } from '../api'

const DEFAULT_LINKS = [
  { id: '1', name: 'Google', url: 'https://google.com', icon: 'G', desc: '搜尋引擎' },
  { id: '2', name: 'GitHub', url: 'https://github.com', icon: 'GH', desc: '程式碼管理' },
]

export default function LinksPanel({ customTitle }) {
  const [links, setLinks] = useState([])
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', icon: '', desc: '' })
  const [synced, setSynced] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)

  // Load from D1 on mount, fallback to localStorage
  useEffect(() => {
    async function load() {
      if (hasLinksApi()) {
        try {
          const dbLinks = await fetchLinks()
          if (dbLinks) {
            const mapped = dbLinks.map(l => ({
              id: l.id,
              name: l.name,
              url: l.url,
              icon: l.icon || l.name.charAt(0).toUpperCase(),
              desc: l.desc || '',
            }))
            setLinks(mapped)
            setSynced(true)
            localStorage.setItem('work_links', JSON.stringify(mapped))
            return
          }
        } catch (e) {
          console.warn('D1 fetch failed, using localStorage', e)
        }
      }
      // Fallback to localStorage
      const saved = localStorage.getItem('work_links')
      if (saved) {
        const parsed = JSON.parse(saved)
        setLinks(parsed.map(l => ({ desc: '', ...l })))
      } else {
        setLinks(DEFAULT_LINKS)
      }
    }
    load()
  }, [])

  // Save to localStorage as cache
  useEffect(() => {
    if (links.length > 0 || synced) {
      localStorage.setItem('work_links', JSON.stringify(links))
    }
  }, [links, synced])

  const resetForm = () => {
    setForm({ name: '', url: '', icon: '', desc: '' })
    setShowAdd(false)
    setEditing(null)
  }

  const addLink = async () => {
    if (!form.name.trim() || !form.url.trim()) return
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`
    const newLink = {
      id: Date.now().toString(),
      name: form.name.trim(),
      url,
      icon: form.icon.trim() || form.name.charAt(0).toUpperCase(),
      desc: form.desc.trim(),
    }
    setLinks([...links, newLink])
    resetForm()
    // Sync to D1
    if (hasLinksApi()) {
      apiAddLink({ id: newLink.id, name: newLink.name, url: newLink.url, icon: newLink.icon, desc: newLink.desc })
        .catch(e => console.warn('D1 add link failed', e))
    }
  }

  const handleUpdateLink = async () => {
    if (!form.name.trim() || !form.url.trim()) return
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`
    const updated = {
      name: form.name.trim(),
      url,
      icon: form.icon.trim() || form.name.charAt(0).toUpperCase(),
      desc: form.desc.trim(),
    }
    setLinks(links.map((l) =>
      l.id === editing ? { ...l, ...updated } : l
    ))
    const editingId = editing
    resetForm()
    // Sync to D1
    if (hasLinksApi()) {
      apiUpdateLink({ id: editingId, ...updated })
        .catch(e => console.warn('D1 update link failed', e))
    }
  }

  const handleRemoveLink = async (id) => {
    setLinks(links.filter((l) => l.id !== id))
    if (editing === id) resetForm()
    // Sync to D1
    if (hasLinksApi()) {
      apiRemoveLink(id).catch(e => console.warn('D1 remove link failed', e))
    }
  }

  const startEdit = (link) => {
    setEditing(link.id)
    setShowAdd(true)
    setForm({ name: link.name, url: link.url, icon: link.icon, desc: link.desc || '' })
  }

  const handleDragStart = (idx) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    if (idx !== overIdx) setOverIdx(idx)
  }

  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    const updated = [...links]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    setLinks(updated)
    setDragIdx(null)
    setOverIdx(null)
    // Sync order to D1
    if (hasLinksApi()) {
      const order = updated.map((l, i) => ({ id: l.id, sort_order: i }))
      reorderLinks(order).catch(e => console.warn('D1 reorder failed', e))
    }
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <section className="glass-card card-stripe card-stripe-orange rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-orange-400 text-xl glow-orange">@</span> {customTitle || 'Quick Links'}
        </h2>
        <button
          onClick={() => { resetForm(); setShowAdd(!showAdd) }}
          className="text-xs text-gray-500 hover:text-orange-400 transition-all"
        >
          {showAdd ? '取消' : '+ 新增'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="glass-inner rounded-lg p-3 mb-4 space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="Icon"
              maxLength={2}
              className="w-16 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-orange-500 input-glow transition-all"
            />
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="名稱"
              className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500 input-glow transition-all"
            />
            <input
              type="text"
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="說明"
              className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500 input-glow transition-all"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && (editing ? handleUpdateLink() : addLink())}
              placeholder="https://..."
              className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500 input-glow transition-all"
            />
            <button
              onClick={editing ? handleUpdateLink : addLink}
              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-orange-500/20 active:scale-95"
            >
              {editing ? '儲存' : '新增'}
            </button>
          </div>
        </div>
      )}

      {/* Links Grid */}
      {links.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {links.map((link, idx) => (
            <div
              key={link.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`group relative cursor-grab active:cursor-grabbing ${dragIdx === idx ? 'opacity-30' : ''} ${overIdx === idx && dragIdx !== idx ? 'ring-2 ring-orange-400' : ''}`}
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-inner rounded-lg p-3 flex flex-col items-center gap-2 hover:bg-white/10 dark:hover:bg-white/[0.06] hover:scale-[1.03] transition-all block text-center"
              >
                <div className="link-icon w-10 h-10 rounded-xl bg-orange-600/15 dark:bg-orange-500/15 text-orange-500 dark:text-orange-400 flex items-center justify-center text-sm font-bold">
                  {link.icon}
                </div>
                <div>
                  <div className="font-medium text-xs">{link.name}</div>
                  {link.desc && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5 truncate max-w-[100px]">{link.desc}</div>
                  )}
                </div>
              </a>
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.preventDefault(); startEdit(link) }}
                  className="w-5 h-5 rounded bg-black/30 text-gray-300 hover:text-blue-400 text-[10px] flex items-center justify-center transition-all"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    if (confirmRemoveId === link.id) {
                      handleRemoveLink(link.id)
                      setConfirmRemoveId(null)
                    } else {
                      setConfirmRemoveId(link.id)
                      setTimeout(() => setConfirmRemoveId(null), 3000)
                    }
                  }}
                  className={`w-5 h-5 rounded text-[10px] flex items-center justify-center transition-all ${
                    confirmRemoveId === link.id
                      ? 'bg-red-500/50 text-white'
                      : 'bg-black/30 text-gray-300 hover:text-red-400'
                  }`}
                  title={confirmRemoveId === link.id ? '再按一次確認刪除' : '刪除'}
                >
                  {confirmRemoveId === link.id ? '!' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">
          <div className="text-3xl mb-2 opacity-30">🔗</div>
          還沒有連結，點擊「+ 新增」加入第一個
        </div>
      )}
    </section>
  )
}
