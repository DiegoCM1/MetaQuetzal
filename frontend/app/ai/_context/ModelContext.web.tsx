import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export const MODEL_OPT_IN_KEY = '@blueye_model_opted_in'

type WebModelError = {
  message: string
}

type WebLLM = {
  isReady: false
  downloadProgress: 0
  error: null
  configure: (_config: unknown) => void
}

interface ModelContextValue {
  llm: WebLLM
  modelOptedIn: boolean
  optIn: () => Promise<void>
  optOut: () => Promise<void>
  retryDownload: () => void
  downloadProgress: number
  modelReady: boolean
  modelError: WebModelError | null
  modelMode: 'online' | 'offline' | null
  setModelMode: (mode: 'online' | 'offline') => void
}

const noop = () => {}

const fallbackLLM: WebLLM = {
  isReady: false,
  downloadProgress: 0,
  error: null,
  configure: noop,
}

const ModelContext = createContext<ModelContextValue | null>(null)

export function ModelProvider({ children }: { children: ReactNode }) {
  const [modelMode, setModelMode] = useState<'online' | 'offline' | null>('online')

  const value = useMemo<ModelContextValue>(() => ({
    llm: fallbackLLM,
    modelOptedIn: false,
    optIn: async () => {},
    optOut: async () => {},
    retryDownload: noop,
    downloadProgress: 0,
    modelReady: false,
    modelError: null,
    modelMode,
    setModelMode,
  }), [modelMode])

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
}

export function useModel() {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModel must be used inside <ModelProvider>')
  return ctx
}
