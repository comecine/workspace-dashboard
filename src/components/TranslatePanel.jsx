import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://api.mymemory.translated.net/get'

const LANG_OPTIONS = [
  { code: 'zh-TW', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
]

export default function TranslatePanel({ customTitle }) {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sourceLang, setSourceLang] = useState('zh-TW')
  const [targetLang, setTargetLang] = useState('en')
  const [copied, setCopied] = useState(false)
  const [swapAnim, setSwapAnim] = useState(false)
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
    setSwapAnim(true)
    setTimeout(() => setSwapAnim(false), 500)
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  const copyResult = async () => {
    if (translatedText) {
      await navigator.clipboard.writeText(translatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copySource = async () => {
    if (sourceText) {
      await navigator.clipboard.writeText(sourceText)
    }
  }

  const clearAll = () => {
    setSourceText('')
    setTranslatedText('')
    setError(null)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setSourceText(text)
    } catch {}
  }

  return (
    <section className="glass-card card-stripe card-stripe-violet rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-violet-500 dark:text-violet-400 text-2xl glow-violet">A</span> {customTitle || 'Translate'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={pasteFromClipboard}
            className="text-xs text-gray-500 hover:text-violet-500 dark:hover:text-violet-400 transition-all"
            title="Paste"
          >
            Paste
          </button>
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Language selector row */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 input-glow transition-all"
        >
          {LANG_OPTIONS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <button
          onClick={swapLanguages}
          className={`swap-btn text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-all p-2 rounded-lg hover:bg-violet-500/10 ${swapAnim ? 'swap-active' : ''}`}
          title="交換語言並互換文字"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 7a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm-4 6a1 1 0 011-1h6a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
            <path d="M14.707 4.293a1 1 0 010 1.414L13.414 7l1.293 1.293a1 1 0 01-1.414 1.414l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 0zM5.293 15.707a1 1 0 010-1.414L6.586 13l-1.293-1.293a1 1 0 011.414-1.414l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414 0z" />
          </svg>
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 input-glow transition-all"
        >
          {LANG_OPTIONS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-300/50 dark:border-red-700/30 rounded-lg p-3 text-sm text-red-600 dark:text-red-300 mb-4 backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="relative">
          <div className="absolute top-2 left-3 text-xs text-gray-400 dark:text-gray-500 font-medium">
            {LANG_OPTIONS.find(l => l.code === sourceLang)?.label}
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="輸入要翻譯的文字..."
            className="w-full h-40 sm:h-48 bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-lg pt-7 px-3 pb-3 sm:px-4 sm:pb-4 text-sm resize-none focus:outline-none focus:border-violet-500 input-glow placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-600">{sourceText.length}</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute top-2 left-3 text-xs text-gray-400 dark:text-gray-500 font-medium">
            {LANG_OPTIONS.find(l => l.code === targetLang)?.label}
          </div>
          <div className="w-full h-40 sm:h-48 bg-white/30 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/10 rounded-lg pt-7 px-3 pb-3 sm:px-4 sm:pb-4 text-sm overflow-auto transition-all">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-violet-500 dark:border-violet-400 border-t-transparent rounded-full animate-spin" />
                翻譯中...
              </div>
            ) : (
              translatedText || <span className="text-gray-400 dark:text-gray-600">翻譯結果會顯示在這裡...</span>
            )}
          </div>
          {translatedText && (
            <button
              onClick={copyResult}
              className={`absolute bottom-3 right-3 text-xs px-2 py-0.5 rounded transition-all ${copied ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-500 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-500/10'}`}
              title="複製結果"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400 dark:text-gray-600">
        MyMemory Translation API | 點擊中間按鈕可交換語言與文字
      </div>
    </section>
  )
}
