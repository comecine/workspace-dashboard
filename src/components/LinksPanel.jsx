import { useState, useEffect } from 'react'

const DEFAULT_LINKS = [
  { id: '1', name: 'Google', url: 'https://google.com', icon: 'G' },
  { id: '2', name: 'GitHub', url: 'https://github.com', icon: 'GH' },
]

export default function LinksPanel() {
  const [links, setLinks] = useState(() => {
    const saved = localStorage.getItem('work_links')
    return saved ? JSON.parse(saved) : DEFAULT_LINKS
  })
  const [editing, setEditing] = useState(null) // link id being edited
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', icon: '' })

  useEffect(() => {
    localStorage.setItem('work_links', JSON.stringify(links))
  }, [links])

  const resetForm = () => {
    setForm({ name: '', url: '', icon: '' })
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
    }
    setLinks([...links, newLink])
    resetForm()
  }

  const updateLink = () => {
    if (!form.name.trim() || !form.url.trim()) return
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`
    setLinks(links.map((l) =>
      l.id === editing
        ? { ...l, name: form.name.trim(), url, icon: form.icon.trim() || form.name.charAt(0).toUpperCase() }
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
    setForm({ name: link.name, url: link.url, icon: link.icon })
  }

  return (
    <section className="bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-800 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-orange-400">@</span> Quick Links
        </h2>
        <button
          onClick={() => { resetForm(); setShowAdd(!showAdd) }}
          className="text-xs text-gray-500 hover:text-orange-400 transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg p-3 mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="Icon (1-2 chars)"
              maxLength={2}
              className="w-16 bg-gray-800 dark:bg-gray-700 border border-gray-700 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              className="flex-1 bg-gray-800 dark:bg-gray-700 border border-gray-700 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && (editing ? updateLink() : addLink())}
              placeholder="https://..."
              className="flex-1 bg-gray-800 dark:bg-gray-700 border border-gray-700 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={editing ? updateLink : addLink}
              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {editing ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Links Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {links.map((link) => (
          <div key={link.id} className="group relative">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-gray-800/50 dark:bg-gray-800/50 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg p-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                {link.icon}
              </div>
              <span className="text-sm truncate">{link.name}</span>
            </a>
            <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
              <button
                onClick={(e) => { e.preventDefault(); startEdit(link) }}
                className="w-5 h-5 rounded bg-gray-700 text-gray-400 hover:text-blue-400 text-xs flex items-center justify-center"
                title="Edit"
              >
                e
              </button>
              <button
                onClick={(e) => { e.preventDefault(); removeLink(link.id) }}
                className="w-5 h-5 rounded bg-gray-700 text-gray-400 hover:text-red-400 text-xs flex items-center justify-center"
                title="Delete"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center text-gray-600 text-sm py-6">
          No links yet. Click "+ Add" to add your first link.
        </div>
      )}
    </section>
  )
}
