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

1. **Select any text, type `/wtf`.**
2. **Type `/wtf <anything>`**.
3. **Select any text and press a hotkey.** Tell your agent to turn on the plugin's hotkey button option, then bind a key to `app:cycleDiffBase` in `~/.claude/keybindings.json`.

## Mods

| Mod | What it does |
| :- | :- |
| [`wtf`](./wtf) | Select text, run `/wtf`, and a side pane explains what it means in the context of the conversation. Follow-ups, history, optional hotkey. |

Requires Claude Code v2.1.287 or later. Each mod's README says which version it was tested with.

## License

MIT
