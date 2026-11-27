import { useMemo } from 'react'
import { usePageSearchContext } from '../contexts/PageSearchContext'

export function usePageSearch(rows, searchKeys = null) {
  const { searchTerm = '' } = usePageSearchContext()

  return useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase()

    if (!normalizedTerm) {
      return rows
    }

    return rows.filter((row) => {
      const values = Array.isArray(searchKeys) && searchKeys.length
        ? searchKeys.map((key) => row?.[key])
        : Object.values(row)

      return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedTerm))
    })
  }, [rows, searchKeys, searchTerm])
}
