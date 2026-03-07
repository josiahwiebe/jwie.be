---
title: Introducing Open Session
slug: introducing-open-session
date: '2026-03-07T21:39:12.000Z'
updated: '2026-03-07T21:39:12.000Z'
excerpt: ''
published: true
---
If you're like me, you probably bounce around between coding tools – Cursor, Opencode, Codex etc. 

These sessions exist all over the place, with a multitude of working directories, and I often forget which tool I started a session with.

So I built `opensession` – a simple TUI for managing your past chat sessions – making it easy to recall a session and jump right back in.

^^^
![](/img/introducing-open-session/cleanshot-2026-03-07-at-15-15-44-2x.png)
^^^ Screenshot of the Open Session TUI

### Install

```bash
curl -fsSL https://jwww.me/opensession/install | bash
```

### Support

It currently supports:

- Claude Code
- OpenAI Codex
- Cursor
- Gemini
- OpenCode

Check it out on [GitHub](https://github.com/josiahwiebe/opensession). Open a PR if you want to add another app!
