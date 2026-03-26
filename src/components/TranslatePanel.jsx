import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://api.mymemory.translated.net/get'

const LANG_OPTIONS = [
  { code: 'zh-TW', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
]

export default function TranslatePanel() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sourceLang, setSourceLang] = useState('zh-TW')
  const [targetLang, setTargetLang] = useState('en')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText('')
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const langpair = `${sourceLang}|${targetLang}`
        const params = new URLSearchParams({ q: sourceText, langpair })
        const res = await fetch(`${API_URL}?${params}`)

        if (!res.ok) throw new Error(`API ${res.status}`)

        const json = await res.json()
        if (json.responseStatus !== 200) {
          throw new Error(json.responseDetails || 'Translation failed')
        }
        setTranslatedText(json.responseData?.translatedText ?? '')
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sourceText, sourceLang, targetLang])

  const swapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  const copyResult = async () => {
    if (translatedText) {
      await navigator.clipboard.writeText(translatedText)
    }
  }

  const clearAll = () => {
    setSourceText('')
    setTranslatedText('')
    setError(null)
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-violet-500 dark:text-violet-400">A</span> Translate
        </h2>
        <button
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Language selector row */}
      <div className="flex items-center gap-2 mb-3">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        >
          {LANG_OPTIONS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <button
          onClick={swapLanguages}
          className="text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors p-1.5"
          title="Swap languages"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 7a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm-4 6a1 1 0 011-1h6a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
            <path d="M14.707 4.293a1 1 0 010 1.414L13.414 7l1.293 1.293a1 1 0 01-1.414 1.414l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 0zM5.293 15.707a1 1 0 010-1.414L6.586 13l-1.293-1.293a1 1 0 011.414-1.414l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414 0z" />
          </svg>
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500"
        >
          {LANG_OPTIONS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 rounded-lg p-3 text-sm text-red-600 dark:text-red-300 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="relative">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Enter text to translate..."
            className="w-full h-40 sm:h-48 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 sm:p-4 text-sm resize-none focus:outline-none focus:border-violet-500 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-600">
            {sourceText.length} chars
          </div>
        </div>

        <div className="relative">
          <div className="w-full h-40 sm:h-48 bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg p-3 sm:p-4 text-sm overflow-auto">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-violet-500 dark:border-violet-400 border-t-transparent rounded-full animate-spin" />
                Translating...
              </div>
            ) : (
              translatedText || <span className="text-gray-400 dark:text-gray-600">Translation will appear here...</span>
            )}
          </div>
          {translatedText && (
            <button
              onClick={copyResult}
              className="absolute bottom-3 right-3 text-xs text-gray-500 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
              title="Copy result"
            >
              Copy
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400 dark:text-gray-600">
        Powered by MyMemory Translation API (free, no key required)
      </div>
    </section>
  )
}
