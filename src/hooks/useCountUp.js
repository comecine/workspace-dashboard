import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    if (target == null || isNaN(target)) return
    const start = prevRef.current
    const diff = target - start
    if (diff === 0) return

    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(start + diff * eased)
      if (progress < 1) requestAnimationFrame(tick)
      else prevRef.current = target
    }

    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}
