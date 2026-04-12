import { createContext, useContext, useState, type ReactNode } from 'react'

type DesignSystem = 'classic' | 'shadcn'

interface DesignSystemContextValue {
  designSystem: DesignSystem
  setDesignSystem: (ds: DesignSystem) => void
  toggle: () => void
}

const Ctx = createContext<DesignSystemContextValue>({
  designSystem: 'classic',
  setDesignSystem: () => {},
  toggle: () => {},
})

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [designSystem, setDesignSystem] = useState<DesignSystem>(
    () => (localStorage.getItem('axon-design-system') as DesignSystem) ?? 'classic'
  )

  function toggle() {
    setDesignSystem(prev => {
      const next = prev === 'classic' ? 'shadcn' : 'classic'
      localStorage.setItem('axon-design-system', next)
      return next
    })
  }

  return (
    <Ctx.Provider value={{ designSystem, setDesignSystem, toggle }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDesignSystem() {
  return useContext(Ctx)
}
