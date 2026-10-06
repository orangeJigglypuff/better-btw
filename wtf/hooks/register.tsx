import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { WtfEntry } from '../types'

const PANE = { id: 'wtf', title: 'wtf', columns: 36, closeOnEscape: true } as const
const KEEP = 10
const MAX_QUESTION = 2000
const MAX_SHOWN_QUESTION = 160
const MAX_ANSWER = 9000
const MAX_BASIS = 6000
const MAX_TRANSCRIPT = 80000
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const SPIN_MS = 100
// The engine has no key event for a mod: a Button naming an engine keybinding
// action is pressed by the chord the person bound to that action, from the
// prompt, while the Button is mounted. This action's own handler lives in the
// diff panel only; the README has the person bind a key to it.
const ASK_ACTION = 'app:cycleDiffBase'

const entries = atom({ plugin: 'wtf', key: 'entries' } as const, [])
const cursor = atom({ plugin: 'wtf', key: 'cursor' } as const, 0)
const frame = atom({ plugin: 'wtf', key: 'frame' } as const, 0)

// Text and Markdown take tab and newline as their only control characters.
const clean = (text: string) =>
  text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')

// The pane speaks the language of the question: Chinese for one holding Han
// characters, English otherwise. The model is told to answer in the user's.
const TEXT = {
  en: {
    reading: 'Reading the conversation',
    followUp: 'Follow up…',
    submit: 'ask',
    empty: 'Select some text, then run /wtf.',
    usage: 'Usage: select text with the mouse, then run /wtf, or run /wtf <text>.',
    nothingSelected: 'wtf: select some text first',
    unanswered: 'No answer came back.',
    why: {
      'nothing-to-fork':
        'This conversation has no reply yet, so there is no context to read. Try again after one turn.',
      'api-error': 'The request failed (API error).',
      'empty-reply': 'The model gave no text answer.',
      aborted: 'Interrupted.',
    } as Record<string, string>,
  },
  zh: {
    reading: '正在读对话',
    followUp: '追问…',
    submit: '追问',
    empty: '划选一段文字，然后输入 /wtf。',
    usage: '用法：先用鼠标划选一句话再输入 /wtf，或直接 /wtf <文字>。',
    nothingSelected: 'wtf：先用鼠标划选一段文字',
    unanswered: '没有得到回答。',
    why: {
      'nothing-to-fork': '当前对话还没有任何回复，没有上下文可读。先聊一轮再试。',
      'api-error': '请求失败（API 错误）。',
      'empty-reply': '模型没有给出文字回答。',
      aborted: '被中断了。',
    } as Record<string, string>,
  },
}

const langOf = (text: string) => (/[\u3400-\u9fff]/.test(text) ? 'zh' : 'en')

const ask = (question: string, basis: string | undefined) =>
  basis === undefined
    ? [
        '[/wtf side question. Do not call tools and do not continue the main task; answer only this.]',
        'This question and your answer appear only in a side pane and are never added to the conversation; do not comment on that.',
        'Explain what the text below means in the context of this conversation: what it refers to and why it appears here.',
        'Be direct and brief (a few sentences). Answer in the language the user has been writing in.',
        '',
        '<selected>',
        question,
        '</selected>',
      ].join('\n')
    : [
        '[/wtf side follow-up. Do not call tools and do not continue the main task; answer only this.]',
        'This question and your answer appear only in a side pane and are never added to the conversation; do not comment on that.',
        'The user asked the side questions below earlier (the main conversation does not show them) and now follows up.',
        'Answer the follow-up in the context of this conversation. Be direct and brief, in the language the user has been writing in.',
        '',
        '<earlier>',
        basis,
        '</earlier>',
        '',
        '<follow-up>',
        question,
        '</follow-up>',
      ].join('\n')

// A fork reads the transcript as the main thread last sent it, and a resumed
// session has sent nothing yet: until its first turn there is nothing to fork
// although the conversation is all there. Then the question goes out as a
// completion of its own, over the tail of the saved transcript as text.
const answer = async ($: EngineInterface, prompt: string) => {
  const forked = await $.model.fork({ prompt })

  if (forked.isAnswered || forked.reason !== 'nothing-to-fork') {
    return forked
  }

  const rows = await $.session.messages().catch(() => [])
  const said = Array.isArray(rows) ? rows.filter(row => row.text.trim() !== '') : []

  if (!said.some(row => row.role === 'assistant')) {
    return forked
  }

  const transcript = said
    .map(row => `${row.role === 'user' ? 'User' : 'Assistant'}: ${row.text}`)
    .join('\n\n')
    .slice(-MAX_TRANSCRIPT)

  return $.model.complete({
    model: await $.session.model(),
    prompt: `<conversation>\n${transcript}\n</conversation>\n\n${prompt}`,
  })
}

// Answers whether there was anything to explain. With `parent`, the question
// is a follow-up on that entry and carries its thread along.
const explain = async ($: EngineInterface, raw: string | undefined, parent?: WtfEntry) => {
  const question = clean(raw ?? '').trim().slice(0, MAX_QUESTION)

  if (question === '') {
    return false
  }

  const basis =
    parent === undefined
      ? undefined
      : `${parent.basis ?? ''}Q: ${parent.question}\nA: ${parent.answer}\n\n`.slice(-MAX_BASIS)
  const lang = parent?.lang ?? langOf(question)
  let id = 0
  await update($, entries, list => {
    id = (list.at(-1)?.id ?? 0) + 1
    const entry: WtfEntry = { id, question, answer: '', status: 'pending', lang, basis }

    return [...list, entry].slice(-KEEP)
  })
  await update($, cursor, () => KEEP)
  await $.ui.open(PANE)

  const spin = $.clock.every(SPIN_MS, () => update($, frame, n => (n + 1) % SPINNER.length))
  const reply = await answer($, ask(question, basis))
    .catch(() => ({ isAnswered: false, reason: 'api-error' }) as const)
    .finally(() => spin.cancel())
  const text = reply.isAnswered
    ? clean(reply.text).slice(0, MAX_ANSWER)
    : (TEXT[lang].why[reply.reason] ?? TEXT[lang].unanswered)
  const status = reply.isAnswered ? 'done' : 'failed'
  await update($, entries, list =>
    list.map(one => (one.id === id ? { ...one, answer: text, status } : one)),
  )

  return true
}

// What is said with no question to take the language from: the last one's.
const spoken = async ($: EngineInterface) => TEXT[(await read($, entries)).at(-1)?.lang ?? 'en']

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'wtf',
      description: 'Explain the selected text (or the argument) in the context of this conversation',
      argumentHint: '[text]',
      immediate: true,
    })

    return next(e)
  })

  on('command.run', { command: 'wtf' }, async ($, e) => {
    const typed = e.args.trim()
    const picked = typed === '' ? (await $.ui.selection())?.text : typed

    if (!(await explain($, picked))) {
      return { text: (await spoken($)).usage }
    }

    return {}
  })

  // The one site that is always mounted and not above the prompt: the hint
  // line under it carries, unseen, the Button the ask chord presses. Opt-in,
  // since the line is then this mod's drawing and not the engine's.
  on('ui.render', { component: 'PromptHint' }, ($, e, next) => {
    if (options.hotkey !== true) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const onAsk = async () => {
      if (!(await explain($, (await $.ui.selection())?.text))) {
        $.ui.toast((await spoken($)).nothingSelected)
      }
    }

    return (
      <Box>
        <Text dimColor>{e.props.hint}</Text>
        <Button key="ask" label=" " action={ASK_ACTION} plain onPress={onAsk} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: 'wtf' }, async ($, e) => {
    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const Input = e.surface === 'mobile' ? undefined : $.ui.resolve(e).Input
    const list = await read($, entries)
    const last = list.length - 1
    const at = Math.min(Math.max(await read($, cursor), 0), Math.max(last, 0))
    const entry = list[at]

    if (entry === undefined) {
      return (
        <Box flexDirection="column" width={e.props.bodyColumns} paddingX={1}>
          <Text dimColor>{TEXT.en.empty}</Text>
        </Box>
      )
    }

    const text = TEXT[entry.lang]
    const move = (by: number) => () =>
      update($, cursor, n => Math.min(Math.max(Math.min(n, last) + by, 0), last))
    const spinner = entry.status === 'pending' ? SPINNER[await read($, frame)] : undefined
    const shown =
      entry.question.length > MAX_SHOWN_QUESTION
        ? `${entry.question.slice(0, MAX_SHOWN_QUESTION)}…`
        : entry.question

    return (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        <Box justifyContent="space-between" paddingX={1}>
          <Button
            key="prev"
            label="last"
            plain
            dimColor={at === 0}
            onPress={move(-1)}
          />
          <Text bold color="magenta">
            [{at + 1} / {list.length}]
          </Text>
          <Button
            key="next"
            label="next"
            plain
            dimColor={at === last}
            onPress={move(1)}
          />
        </Box>
        <Box borderStyle="round" borderDimColor paddingX={1} marginTop={1}>
          <Text italic dimColor>
            {entry.basis === undefined ? shown : `↳ ${shown}`}
          </Text>
        </Box>
        <Box flexDirection="column" paddingX={1} marginY={1}>
          {spinner !== undefined && <Text color="magenta">{spinner} {text.reading}</Text>}
          {entry.status === 'failed' && <Text color="red">{entry.answer}</Text>}
          {entry.status === 'done' && <Markdown text={entry.answer} />}
        </Box>
        {entry.status === 'done' && Input !== undefined && (
          <Input
            key="follow"
            label="↳"
            placeholder={text.followUp}
            value=""
            submitLabel={text.submit}
            onSubmit={text => {
              void explain($, text, entry)
            }}
          />
        )}
      </Box>
    )
  })
}
