import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { fetchTodos, addTodo, toggleTodo, removeTodo, hasLinksApi } from '../api'

const LOCAL_KEY = 'workspace_todos'

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch { return [] }
}

function saveLocal(todos) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(todos))
}

export default function TodoPanel({ customTitle }) {
  const [todos, setTodos] = useState(loadLocal)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  // Load from D1
  useEffect(() => {
    async function load() {
      if (hasLinksApi()) { // reuse WORKER_URL check
        try {
          const remote = await fetchTodos()
          if (remote && remote.length > 0) {
            setTodos(remote)
            saveLocal(remote)
          }
        } catch (e) {
          console.warn('D1 todo fetch failed', e)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  // Sync local on change
  useEffect(() => {
    if (!loading) saveLocal(todos)
  }, [todos, loading])

  const handleAdd = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    const id = Date.now().toString()
    const newTodo = { id, text, done: 0, created_at: new Date().toISOString() }
    setTodos(prev => [...prev, newTodo])
    setInput('')
    inputRef.current?.focus()
    try {
      await addTodo(id, text)
    } catch (e) {
      console.warn('D1 todo add failed', e)
    }
  }, [input])

  const handleToggle = useCallback(async (id, currentDone) => {
    const newDone = currentDone ? 0 : 1
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: newDone } : t))
    try {
      await toggleTodo(id, newDone)
    } catch (e) {
      console.warn('D1 todo toggle failed', e)
    }
  }, [])

  const handleRemove = useCallback(async (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    try {
      await removeTodo(id)
    } catch (e) {
      console.warn('D1 todo remove failed', e)
    }
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  const pending = todos.filter(t => !t.done)
  const completed = todos.filter(t => t.done)

  return (
    <section className="glass-card card-stripe card-stripe-rose rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-rose-500 dark:text-rose-400 text-xl">✅</span> {customTitle || 'To-Do'}
        </h2>
        {todos.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {completed.length}/{todos.length} done
          </span>
        )}
      </div>

      {/* Progress bar */}
      {todos.length > 0 && (
        <div className="mb-3">
          <div className="w-full h-1.5 bg-gray-200/20 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${todos.length === 0 ? 0 : (completed.length / todos.length) * 100}%`,
                background: completed.length === todos.length && todos.length > 0
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #f43f5e, #fb7185)',
              }}
            />
          </div>
          {completed.length === todos.length && todos.length > 0 && (
            <div className="text-center text-xs text-emerald-500 mt-1.5 font-medium animate-fade-in">
              All clear! Great job today.
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="新增待辦事項..."
          className="flex-1 text-sm bg-white/30 dark:bg-white/5 border border-gray-200/30 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-rose-500 transition-all placeholder-gray-400 dark:placeholder-gray-600"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="px-3 py-2 text-sm bg-rose-500/90 hover:bg-rose-500 text-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 skeleton-shimmer rounded-lg" />
          <div className="h-8 skeleton-shimmer rounded-lg" />
        </div>
      ) : todos.length === 0 ? (
        <div className="text-center text-sm text-gray-400 dark:text-gray-600 py-6 cursor-pointer hover:text-rose-400 transition-colors" onClick={() => inputRef.current?.focus()}>
          <div className="text-2xl mb-1 opacity-30">&#9998;</div>
          點這裡開始寫下今天要做的事
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {/* Pending */}
          {pending.map(todo => (
            <div key={todo.id} id={`todo-${todo.id}`} className="glass-inner rounded-lg px-3 py-2 flex items-center gap-2 group">
              <button
                onClick={() => {
                  // Brief visual celebration before toggling
                  const el = document.getElementById(`todo-${todo.id}`)
                  if (el) el.classList.add('todo-completing')
                  setTimeout(() => handleToggle(todo.id, todo.done), 300)
                }}
                className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center hover:scale-110"
              />
              <span className="flex-1 text-sm truncate">{todo.text}</span>
              <button
                onClick={() => handleRemove(todo.id)}
                className="text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Completed */}
          {completed.length > 0 && (
            <>
              <div className="text-[10px] text-gray-400 dark:text-gray-600 pt-2 pb-1 font-medium">
                已完成 ({completed.length})
              </div>
              {completed.map(todo => (
                <div key={todo.id} className="glass-inner rounded-lg px-3 py-2 flex items-center gap-2 group opacity-50">
                  <button
                    onClick={() => handleToggle(todo.id, todo.done)}
                    className="w-4 h-4 rounded border border-rose-400/50 bg-rose-500/20 flex-shrink-0 flex items-center justify-center text-rose-500 text-[10px]"
                  >
                    ✓
                  </button>
                  <span className="flex-1 text-sm truncate line-through">{todo.text}</span>
                  <button
                    onClick={() => handleRemove(todo.id)}
                    className="text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  )
}
