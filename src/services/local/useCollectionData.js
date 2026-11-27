import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from './database.js'
import { getLocalServices, hasLocalDatabase } from './client.js'

export function useCollectionData({
  collectionName,
  fallbackData = [],
  orderByField = null,
  orderDirection = 'asc',
  filters = [],
  fallbackFilter = null,
  clientFilter = null,
  limitCount = null,
}) {
  const localEnabled = hasLocalDatabase()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(localEnabled)
  const [error, setError] = useState('')
  const [source, setSource] = useState('stored')
  const filtersKey = JSON.stringify(filters ?? [])

  useEffect(() => {
    if (!localEnabled) {
      return undefined
    }

    setLoading(true)
    setError('')

    const { db } = getLocalServices()

    if (!db) {
      return undefined
    }

    const collectionRef = collection(db, collectionName)
    const queryConstraints = []

    filters.forEach((filter) => {
      if (filter?.field && filter?.operator && filter?.value !== undefined) {
        queryConstraints.push(where(filter.field, filter.operator, filter.value))
      }
    })

    if (orderByField) {
      queryConstraints.push(orderBy(orderByField, orderDirection))
    }

    if (limitCount) {
      queryConstraints.push(limit(limitCount))
    }

    const buildRows = (snapshot) =>
      snapshot.docs.map((doc) => ({
        documentId: doc.id,
        ...doc.data(),
        id: doc.data().id ?? doc.id,
      }))
    let activeUnsubscribe = () => {}
    let cancelled = false
    const subscribe = (shouldUseOrderBy = true) => {
      const effectiveConstraints = queryConstraints.filter(
        (constraint) => shouldUseOrderBy || constraint.type !== 'orderBy',
      )
      const collectionQuery = effectiveConstraints.length
        ? query(collectionRef, ...effectiveConstraints)
        : collectionRef

      activeUnsubscribe = onSnapshot(
        collectionQuery,
        (snapshot) => {
          if (cancelled) {
            return
          }

          setRows(buildRows(snapshot))
          setLoading(false)
          setError('')
          setSource('stored')
        },
        (nextError) => {
          if (cancelled) {
            return
          }

          if (shouldRetryWithoutOrderBy(nextError, shouldUseOrderBy, orderByField)) {
            subscribe(false)
            return
          }

          setRows([])
          setLoading(false)
          setError(nextError.message)
          setSource('stored')
        },
      )
    }

    subscribe(Boolean(orderByField))

    return () => {
      cancelled = true
      activeUnsubscribe()
    }
  }, [collectionName, localEnabled, filtersKey, limitCount, orderByField, orderDirection])

  const baseRows = localEnabled
    ? rows
    : typeof fallbackFilter === 'function'
      ? fallbackData.filter(fallbackFilter)
      : fallbackData

  const resolvedRows = typeof clientFilter === 'function'
    ? baseRows.filter(clientFilter)
    : baseRows

  return {
    rows: resolvedRows,
    loading: localEnabled ? loading : false,
    error,
    source: localEnabled ? source : 'local',
    isUsingLocalDatabase: source === 'stored',
  }
}

function shouldRetryWithoutOrderBy(error, shouldUseOrderBy, orderByField) {
  if (!shouldUseOrderBy || !orderByField) {
    return false
  }

  const message = String(error?.message ?? '').toLowerCase()
  return error?.code === 'failed-precondition' || message.includes('requires an index')
}
