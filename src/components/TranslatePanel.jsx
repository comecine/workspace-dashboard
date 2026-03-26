import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://api.mymemory.translated.net/get'

function detectLang(text) {
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/
  return cjkRegex.test(text) ? 'zh' : 'en'
}

export default function TranslatePanel() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detectedDir, setDetectedDir] = useState('ZH -> EN')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText('')
      setDetectedDir('ZH -> EN')
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      const sourceLang = detectLang(sourceText)
      const targetLang = sourceLang === 'zh' ? 'en' : 'zh-TW'
      setDetectedDir(sourceLang === 'zh' ? 'ZH -> EN' : 'EN -> ZH')

      try {
        const langpair = `${sourceLang === 'zh' ? 'zh-TW' : 'en'}|${targetLang}`
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
  }, [sourceText])

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
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">{detectedDir}</span>
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
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
            placeholder="Enter text to translate (auto-detect Chinese/English)..."
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
