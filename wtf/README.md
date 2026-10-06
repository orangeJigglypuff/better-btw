# wtf?

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) for the moment you read something in the conversation and think "wtf does that mean".

Select the text, run `/wtf`, and a narrow side pane explains what it means **in the context of the current conversation**. The answer never enters the conversation, so it costs the main thread no context.

- `/wtf` explains the text you last selected with the mouse.
- `/wtf some text` explains the text you typed instead.
- The pane keeps the last 10 questions; click `last` / `next` to page through them.
- A follow-up field under each answer continues that side thread.
- Works while Claude is mid-turn.
- The pane speaks English, or Chinese when the question contains Chinese. Answers come in the language you have been writing in.

中文说明见[文末](#中文)。

## Install

Requires Claude Code v2.1.287 or later. Tested with v2.1.289. The mods API can change between releases.

From your shell:

```bash
claude plugin marketplace add orangeJigglypuff/better-btw
claude plugin install wtf@better-btw
```

Or, from inside a Claude Code session: `/plugin install wtf --marketplace orangeJigglypuff/better-btw`.

To try it for one session without installing, clone [the repository](https://github.com/orangeJigglypuff/better-btw) and run `claude --plugin-dir ./better-btw/wtf`.

## How it works

Each question is one tool-less model call forked from your session's own transcript (`$.model.fork`), on the same model and system prompt, so the prompt cache serves most of it. The call runs on your plan or API key. Nothing is written to disk and nothing is sent anywhere else.

Run `claude plugin validate ./wtf` to list every event the mod hooks and every API it calls before you load it.

## Optional: a hotkey

Mods have no key events of their own. A mod button can be pressed by the key bound to an engine keybinding action, so the hotkey borrows one: `app:cycleDiffBase`.

1. Turn on the **Hotkey button** option for the plugin in `/config`.
2. Bind a key to the action in `~/.claude/keybindings.json`:

```json
{
  "bindings": [
    {
      "context": "Global",
      "bindings": { "alt+q": "app:cycleDiffBase" }
    }
  ]
}
```

Select text, press the key, and the pane opens with the answer.

Know what this changes before turning it on:

- The button has to be mounted somewhere that is always on screen, so the mod redraws the hint line under the prompt (same text, plus one invisible cell). Anything interactive the engine draws on that line may stop responding to clicks, and another mod that draws the same line will conflict.
- While the `/diff` panel is open, the key does its original job there instead.

## Limitations

- Reading the mouse selection needs the fullscreen terminal layout. Elsewhere, use `/wtf some text`.
- A brand-new session, or one right after `/clear`, has no context to read until the first reply.
- A docked pane is always full height; only its width is adjustable.
- History lasts for the session.

## Development

In a clone of the repository:

```bash
claude plugin validate --strict ./wtf
claude plugin test ./wtf
```

## License

MIT

---

## 中文

读对话时看到一句看不懂的话：用鼠标划选它，输入 `/wtf`，侧边面板会结合**当前对话的语境**解释它是什么意思。答案不进入主对话，不占主线程的上下文。

- `/wtf`：解释刚才划选的文字；`/wtf 某段文字`：解释直接输入的文字。
- 面板保留最近 10 条，点 `last` / `next` 翻看；每条答案下方可以追问。
- Claude 正在回复时也能用。
- 快捷键是可选的：在 `/config` 里打开 **Hotkey button**，再按上面的示例在 `~/.claude/keybindings.json` 里绑定一个键。它会接管输入框下方的提示行，开启前请先看上面的说明。
- 划选只在全屏终端布局下可读；新会话或刚 `/clear` 后要先聊一轮才有上下文。
