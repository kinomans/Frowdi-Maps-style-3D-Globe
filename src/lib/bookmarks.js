const STORAGE_KEY = 'map-bookmarks'

export function getBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(bookmarks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — bookmark just won't persist.
  }
}

export function addBookmark({ lon, lat, label }) {
  const bookmarks = getBookmarks()
  const bookmark = { id: Date.now(), lon, lat, label: label || 'Без названия' }
  save([...bookmarks, bookmark])
  return bookmark
}

export function removeBookmark(id) {
  save(getBookmarks().filter((b) => b.id !== id))
}
