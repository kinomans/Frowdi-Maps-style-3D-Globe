import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBox({ onSearch, onSelect, placeholder = 'Поиск города или страны…' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)
  const suppressNextSearchRef = useRef(false)

  // onSearch is a fresh function identity on every parent render (it's an inline handler,
  // not memoized) — reading it through a ref instead of a dependency keeps this effect from
  // re-firing (and reopening the dropdown with a stale query) whenever the parent re-renders
  // for any unrelated reason, e.g. clicking a toolbar button elsewhere on the page.
  const onSearchRef = useRef(onSearch)
  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (suppressNextSearchRef.current) {
      // The query just changed because a result was selected (setQuery below), not because
      // the user typed — searching again would only reopen the dropdown right after closing it.
      suppressNextSearchRef.current = false
      return
    }
    if (!query.trim()) {
      setResults([])
      return
    }
    const requestId = ++requestIdRef.current
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await onSearchRef.current(query)
        if (requestId !== requestIdRef.current) return // a newer keystroke already superseded this request
        setResults(found)
        setOpen(true)
      } catch (err) {
        console.error('Geocoder search failed:', err)
        if (requestId === requestIdRef.current) setResults([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function selectResult(result) {
    onSelect(result.destination)
    suppressNextSearchRef.current = true
    setQuery(result.label)
    setResults([])
    setOpen(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (results[0]) selectResult(results[0])
  }

  function clear() {
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <Search size={16} className="search-box__icon" />
      <input
        className="search-box__input"
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {query && (
        <button type="button" className="search-box__clear" onClick={clear} aria-label="Очистить">
          <X size={14} />
        </button>
      )}
      {open && results.length > 0 && (
        <ul className="search-box__results">
          {results.map((r) => (
            <li key={r.id}>
              {/* mousedown, not click: fires before the input's onBlur closes the dropdown */}
              <button type="button" onMouseDown={() => selectResult(r)}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
