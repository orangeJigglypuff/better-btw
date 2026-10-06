export type WtfEntry = {
  id: number
  question: string
  answer: string
  status: 'pending' | 'done' | 'failed'
  /** The language the pane speaks for this entry, taken from the question. */
  lang: 'en' | 'zh'
  /** The side thread before this question, when it is a follow-up. */
  basis?: string
}

declare module 'claude-code' {
  interface PluginState {
    wtf: { entries: WtfEntry[]; cursor: number; frame: number }
  }
}
