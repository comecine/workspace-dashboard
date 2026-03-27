import { useState, useEffect } from 'react'

const DEFAULT_LINKS = [
  { id: '1', name: 'Google', url: 'https://google.com', icon: 'G', desc: '搜尋引擎' },
  { id: '2', name: 'GitHub', url: 'https://github.com', icon: 'GH', desc: '程式碼管理' },
]

export default function LinksPanel() {
  const [links, setLinks] = useState(() => {
    const saved = localStorage.getItem('work_links')
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.map(l => ({ desc: '', ...l }))
    }
    return DEFAULT_LINKS
  })
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', icon: '', desc: '' })

  useEffect(() => {
    localStorage.setItem('work_links', JSON.stringify(links))
  }, [links])

  const resetForm = () => {
    setForm({ name: '', url: '', icon: '', desc: '' })
    setShowAdd(false)
    setEditing(null)
  }

  const addLink = () => {
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
  }

  const updateLink = () => {
    if (!form.name.trim() || !form.url.trim()) return
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`
    setLinks(links.map((l) =>
      l.id === editing
        ? { ...l, name: form.name.trim(), url, icon: form.icon.trim() || form.name.charAt(0).toUpperCase(), desc: form.desc.trim() }
        : l
    ))
    resetForm()
  }

  const removeLink = (id) => {
    setLinks(links.filter((l) => l.id !== id))
    if (editing === id) resetForm()
  }

  const startEdit = (link) => {
    setEditing(link.id)
    setShowAdd(true)
    setForm({ name: link.name, url: link.url, icon: link.icon, desc: link.desc || '' })
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
              onKeyDown={(e) => e.key === 'Enter' && (editing ? updateLink() : addLink())}
              placeholder="https://..."
              className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500 input-glow transition-all"
            />
            <button
              onClick={editing ? updateLink : addLink}
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
                <th className="py-2 px-2 text-left font-medium w-[25%]">名稱</th>
                <th className="py-2 px-2 text-left font-medium">網址</th>
                <th className="py-2 px-2 text-left font-medium w-[30%]">說明</th>
                <th className="py-2 px-1 w-14" />
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-gray-200/10 dark:border-white/5 hover:bg-white/5 dark:hover:bg-white/[0.03] transition-colors group">
                  <td className="py-2.5 px-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-orange-400 transition-colors"
                    >
                      <div className="link-icon w-7 h-7 rounded-md bg-orange-600/15 dark:bg-orange-500/15 text-orange-500 dark:text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {link.icon}
                      </div>
                      <span className="font-medium">{link.name}</span>
                    </a>
                  </td>
                  <td className="py-2.5 px-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 dark:text-gray-500 hover:text-orange-400 transition-colors truncate block max-w-[200px]"
                      title={link.url}
                    >
                      {link.url.replace(/^https?:\/\//, '')}
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
                        onClick={() => removeLink(link.id)}
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
