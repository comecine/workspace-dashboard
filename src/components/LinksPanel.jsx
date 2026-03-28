import { useState, useEffect } from 'react'
import { fetchLinks, addLink as apiAddLink, updateLink as apiUpdateLink, removeLink as apiRemoveLink, reorderLinks, hasLinksApi } from '../api'

const DEFAULT_LINKS = [
  { id: '1', name: 'Google', url: 'https://google.com', icon: 'G', desc: '搜尋引擎' },
  { id: '2', name: 'GitHub', url: 'https://github.com', icon: 'GH', desc: '程式碼管理' },
]

export default function LinksPanel() {
  const [links, setLinks] = useState([])
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', icon: '', desc: '' })
  const [synced, setSynced] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

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
          <span className="text-orange-400 text-xl glow-orange">@</span> Quick Links
        </h2>
        <button
          onClick={() => { resetForm(); setShowAdd(!showAdd) }}
          className="text-xs text-gray-500 hover:text-orange-400 transition-all"
        >
          {showAdd ? 'Cancel' : '+ Add'}
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
              {editing ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Links Table */}
      {links.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300/20 dark:border-white/10 text-xs text-gray-500 dark:text-gray-500">
                <th className="py-2 px-1 w-6" />
                <th className="py-2 px-2 text-left font-medium">名稱</th>
                <th className="py-2 px-2 text-left font-medium w-[30%]">說明</th>
                <th className="py-2 px-1 w-12" />
              </tr>
            </thead>
            <tbody>
              {links.map((link, idx) => (
                <tr
                  key={link.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`border-b border-gray-200/10 dark:border-white/5 hover:bg-white/5 dark:hover:bg-white/[0.03] transition-colors group cursor-grab active:cursor-grabbing ${dragIdx === idx ? 'opacity-30' : ''} ${overIdx === idx && dragIdx !== idx ? 'border-t-2 !border-t-orange-400' : ''}`}
                >
                  <td className="py-2.5 px-1 text-center text-gray-400 dark:text-gray-600 select-none">
                    <span className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">⠿</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-orange-400 transition-colors whitespace-nowrap"
                    >
                      <div className="link-icon w-6 h-6 rounded-md bg-orange-600/15 dark:bg-orange-500/15 text-orange-500 dark:text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {link.icon}
                      </div>
                      <span className="font-medium text-xs">{link.name}</span>
                    </a>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-gray-500 dark:text-gray-400">
                    {link.desc || <span className="text-gray-400/50 dark:text-gray-600">---</span>}
                  </td>
                  <td className="py-2.5 px-1 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(link)}
                        className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 text-xs transition-all"
                        title="Edit"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-xs transition-all"
                        title="Delete"
                      >
                        x
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-6">
          還沒有連結，點擊「+ Add」新增第一個連結
        </div>
      )}
    </section>
  )
}
