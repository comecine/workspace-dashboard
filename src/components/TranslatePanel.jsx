import { useState, useEffect, useRef } from 'react'

const API_KEY = import.meta.env.VITE_DEEPL_API_KEY
const API_URL = 'https://api-free.deepl.com/v2/translate'

function detectLang(text) {
  // Simple heuristic: if text contains CJK characters, it's Chinese
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/
  return cjkRegex.test(text) ? 'ZH' : 'EN'
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

    if (!API_KEY) {
      setError('Missing VITE_DEEPL_API_KEY')
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      const sourceLang = detectLang(sourceText)
      const targetLang = sourceLang === 'ZH' ? 'EN' : 'ZH-HANT'
      setDetectedDir(sourceLang === 'ZH' ? 'ZH -> EN' : 'EN -> ZH')

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${API_KEY}` },
          body: JSON.stringify({
            text: [sourceText],
            target_lang: targetLang,
          }),
        })

        if (!res.ok) {
          const errBody = await res.text()
          throw new Error(`DeepL API ${res.status}: ${errBody}`)
        }

        const json = await res.json()
        setTranslatedText(json.translations?.[0]?.text ?? '')
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
    <section className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-violet-400">A</span> Translate
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">{detectedDir}</span>
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source */}
        <div className="relative">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Enter text to translate (auto-detect Chinese/English)..."
            className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-violet-500 placeholder-gray-500"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-600">
            {sourceText.length} chars
          </div>
        </div>

        {/* Result */}
        <div className="relative">
          <div className="w-full h-48 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm overflow-auto">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Translating...
              </div>
            ) : (
              translatedText || <span className="text-gray-600">Translation will appear here...</span>
            )}
          </div>
          {translatedText && (
            <button
              onClick={copyResult}
              className="absolute bottom-3 right-3 text-xs text-gray-500 hover:text-violet-400 transition-colors"
              title="Copy result"
            >
              Copy
            </button>
          )}
        </div>
      </div>

      {!API_KEY && (
        <div className="mt-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-300">
          Please set VITE_DEEPL_API_KEY in .env to enable translation.
        </div>
      )}
    </section>
  )
}
