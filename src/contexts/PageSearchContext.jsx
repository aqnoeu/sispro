import { createContext, useContext } from 'react'

const PageSearchContext = createContext({ searchTerm: '' })

export function PageSearchProvider({ searchTerm = '', children }) {
  return (
    <PageSearchContext.Provider value={{ searchTerm }}>
      {children}
    </PageSearchContext.Provider>
  )
}

export function usePageSearchContext() {
  return useContext(PageSearchContext)
}
