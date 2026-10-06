# better-btw

Claude Code [mods](https://code.claude.com/docs/en/plugins/mods/overview) by orangeJigglypuff.

## Why use it?

Claude Code original `/btw` command is so dumb. `/wtf` does the same job in a side pane. Launch it with a hotkey if you hate typing `/`, `w`, `t`, and `f`.

## Install

Add the marketplace once, then install any mod from it:

```bash
claude plugin marketplace add orangeJigglypuff/better-btw
claude plugin install wtf@better-btw
```

## Usage

Three ways to ask:

1. **Select, then `/wtf`.** Highlight any text on screen with the mouse (a word in Claude's reply, a line of a tool result, an error), then type `/wtf` and press Enter. A side pane opens and explains what it means in the context of this conversation.
2. **Type the question.** `/wtf <anything>` asks about the text you typed instead, so it also works as a plain side question: `/wtf what does the --force flag do here`.
3. **Hotkey (optional).** Turn on the plugin's **Hotkey button** option in `/config`, then bind a key to `app:cycleDiffBase` in `~/.claude/keybindings.json`; select text and press it. The [wtf README](./wtf#optional-a-hotkey) explains what this changes.

## Mods

| Mod | What it does |
| :- | :- |
| [`wtf`](./wtf) | Select text, run `/wtf`, and a side pane explains what it means in the context of the conversation. Follow-ups, history, optional hotkey. |

Requires Claude Code v2.1.287 or later. Each mod's README says which version it was tested with.

## License

MIT
