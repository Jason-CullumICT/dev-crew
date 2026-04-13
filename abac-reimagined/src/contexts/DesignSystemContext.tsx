// Design system is now permanently shadcn. This file is kept as a no-op
// to avoid breaking any remaining imports during migration cleanup.

import { createContext, useContext, type ReactNode } from 'react'

interface DesignSystemContextValue {
  designSystem: 'shadcn'
  setDesignSystem: () => void
  toggle: () => void
}

const Ctx = createContext<DesignSystemContextValue>({
  designSystem: 'shadcn',
  setDesignSystem: () => {},
  toggle: () => {},
})

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  return (
    <Ctx.Provider value={{ designSystem: 'shadcn', setDesignSystem: () => {}, toggle: () => {} }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDesignSystem() {
  return useContext(Ctx)
}
