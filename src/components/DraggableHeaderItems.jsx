import { useState, useCallback } from 'react'

const DEFAULT_ORDER = ['weather', 'reminder', 'datetime']

export function loadHeaderOrder() {
  try {
    const saved = localStorage.getItem('header_order')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Ensure all items present
      const allKeys = new Set(DEFAULT_ORDER)
      const valid = parsed.filter(k => allKeys.has(k))
      for (const k of DEFAULT_ORDER) {
        if (!valid.includes(k)) valid.push(k)
      }
      return valid
    }
  } catch {}
  return [...DEFAULT_ORDER]
}

export default function DraggableHeaderItems({ order, onReorder, children, locked }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const handleDragStart = useCallback((idx) => {
    setDragIdx(idx)
  }, [])

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault()
    if (idx !== overIdx) setOverIdx(idx)
  }, [overIdx])

  const handleDrop = useCallback((idx) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    const updated = [...order]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    onReorder(updated)
    localStorage.setItem('header_order', JSON.stringify(updated))
    setDragIdx(null)
    setOverIdx(null)
  }, [dragIdx, order, onReorder])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setOverIdx(null)
  }, [])

  // children is an object: { weather: <Component>, reminder: <Component>, datetime: <Component> }
  return (
    <div className="hidden sm:flex items-center gap-3">
      {order.map((key, idx) => {
        const child = children[key]
        if (!child) return null
        return (
          <div
            key={key}
            draggable={!locked}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={`transition-all ${!locked ? 'cursor-grab active:cursor-grabbing' : ''} ${
              dragIdx === idx ? 'opacity-30' : ''
            } ${overIdx === idx && dragIdx !== idx ? 'ring-2 ring-amber-400/50 rounded-lg' : ''}`}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
