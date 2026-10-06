import { expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, ModelForkResult, RenderPropsOf } from 'claude-code'

const PANE = {
  plugin: 'wtf',
  component: 'Pane',
  requestId: 'wtf',
  props: {
    title: 'wtf',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
  } as RenderPropsOf['Pane'],
} as const

const wtf = (args: string): CommandRunInput => ({
  command: 'wtf',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
})

const USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}

test('answers the argument from a fork and keeps it out of the transcript', async ($, on) => {
  const prompts: string[] = []
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('model.fork', (_$, e) => {
    prompts.push(e.prompt)
    const value: ModelForkResult = {
      isAnswered: true,
      text: `answer ${prompts.length}`,
      usage: USAGE,
    }

    return { value }
  })

  const ran = await $.command.run(wtf('the flux thing'))
  expect(ran.text).toBeUndefined()
  expect(prompts[0]).toContain('the flux thing')

  await $.command.run(wtf('second'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Markdown', text: 'answer 2' })).toBeDefined()
    await ui.press({ key: 'prev' })
    expect(await ui.find({ type: 'Markdown', text: 'answer 1' })).toBeDefined()
    await ui.press({ key: 'next' })
    expect(await ui.find({ type: 'Markdown', text: 'answer 2' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'follow', text: 'why though' })
  expect(prompts[2]).toContain('why though')
  expect(prompts[2]).toContain('answer 2')
  expect(await ui.find({ type: 'Text', text: '↳ why though' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '[3 / 3]' })).toBeDefined()
})

test('falls back to the selection, and says so when there is none', { options: { hotkey: true } }, async ($, on) => {
  let selected: { text: string } | undefined = { text: 'picked words' }
  const prompts: string[] = []
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.selection', () => ({ value: selected }))
  on('model.fork', (_$, e) => {
    prompts.push(e.prompt)
    const value: ModelForkResult = { isAnswered: false, reason: 'nothing-to-fork' }

    return { value }
  })

  await $.command.run(wtf(''))
  expect(prompts[0]).toContain('picked words')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /no context to read/ })).toBeDefined()

  selected = { text: 'hotkey words' }
  const hint = await $.ui.mount({
    plugin: 'wtf',
    surface: 'terminal',
    component: 'PromptHint',
    props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
  })
  expect(await hint.find({ type: 'Text', text: '? for shortcuts' })).toBeDefined()
  expect((await hint.find({ key: 'ask' }))?.props.action).toBe('app:cycleDiffBase')
  await hint.press({ key: 'ask' })
  expect(prompts[1]).toContain('hotkey words')
  prompts.pop()

  selected = undefined
  const ran = await $.command.run(wtf(''))
  expect(ran.text).toContain('Usage')
  expect(prompts).toHaveLength(1)
})

test('speaks Chinese for a Chinese question', async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('model.fork', () => {
    const value: ModelForkResult = { isAnswered: false, reason: 'nothing-to-fork' }

    return { value }
  })

  await $.command.run(wtf('这句话是什么意思'))
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /没有上下文/ })).toBeDefined()
})

test('answers from the saved transcript when a resumed session has nothing to fork', async ($, on) => {
  const prompts: string[] = []
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('model.fork', () => {
    const value: ModelForkResult = { isAnswered: false, reason: 'nothing-to-fork' }

    return { value }
  })
  on('session.messages', () => ({
    value: [
      { role: 'user' as const, text: 'where is the admin page', toolUses: [] },
      { role: 'assistant' as const, text: 'It is at /admin behind a key.', toolUses: [] },
    ],
  }))
  on('session.model', () => ({ value: 'test-model' }))
  on('model.complete', (_$, e) => {
    prompts.push(`${e.model}|${e.prompt}`)

    return { value: { isAnswered: true as const, text: 'from the transcript', usage: USAGE } }
  })

  await $.command.run(wtf('behind a key'))
  expect(prompts[0]).toContain('test-model|')
  expect(prompts[0]).toContain('Assistant: It is at /admin behind a key.')
  expect(prompts[0]).toContain('behind a key')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Markdown', text: 'from the transcript' })).toBeDefined()
})
