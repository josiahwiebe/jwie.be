---
title: Plex → Letterboxd Scrobbler
layout: post 
date: 2025-08-01
excerpt: I've long wanted a tool that would sync my movie history from Plex to Letterboxd, but since there is no public API for Letterboxd, I had to build it myself. 
subtitle: Automatically sync your Plex watch and rating history with Letterboxd. 
---

Plex is the best way to manage your personal media library, and I love using [Letterboxd](https://letterboxd.com/josiahwiebe/films/diary) to keep track of movies that I enjoyed. Since there was no way to connect these two services easily, I built this one. This tool uses Puppeteer on the server to log in to your Letterboxd account.

To get started, login using your Plex account [on the app](https://plex-scrobbler.jwie.be). After logging in, you'll need to connect your Letterboxd account. Your credentials are hashed and stored securely.

After connecting your account, [add a new webhook](https://app.plex.tv/desktop/#!/settings/webhooks) to your Plex account (requires Plex Pass). Use the following URL: `https://plex-scrobble.jwie.be/webhook`

You can manage which events you want to be handled. The app currently supports `media.scrobble` and `media.rate`. You can also disable scrobbling for non-film content.

Source code is available on [GitHub](https://github.com/josiahwiebe/plex-scrobble).

[👉 Visit the app](https://plex-scrobble.jwie.be)
