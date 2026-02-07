---
title: (Untitled)
slug: untitled
updated: '2026-02-07T18:54:30.000Z'
excerpt: ''
published: false
---
# Setting Up OpenClaw for Basically Free

I rewired my spare hardware stack so that OpenClaw feels like a self‑hosted service, not a rented subscription. The point is simple: the money you already sunk into old machines and existing API plans should keep working for you, not be replaced by another vendor. When you stitch together an old desktop, a $5 VPS, and the routing smarts inside OpenClaw, you get a fast, private, and mostly free automation surface.

## Keep the old machine honest

An unused laptop or desktop becomes the private compute node. It does not need to be new; 8 GB of RAM, a modest SSD, and a current Linux/macOS install are enough. I installed OpenClaw there, kept the service lean, and let it run the background tasks that touch sensitive data. Because the box sits on my desk, I can troubleshoot hardware quirks without waiting for support tickets. The machine is effectively my security boundary.

## A tiny VPS for the public layer

Compliment that node with a minimal VPS in the cloud. Hetzner or DigitalOcean’s smallest droplet provides the uptime and reachable IP address that Telegram and webhooks expect. That server never sees my private data—it only routes traffic through Tailscale to the local node and terminates TLS for the bot integrations. Think of it as a relay, not a platform. It carries the public API surface, while everything actual stays tucked behind the mesh.

## Route sensitive work to Ollama on your LAN

Once OpenClaw is running on the private metal, you can define routes. Everything tagged with `#notes`, `#things`, or `#private` gets forwarded to an Ollama instance co‑located on the same machine, so Apple Notes, Things, and other personal silos never leave your local network. Ollama has compact models that fit within the RAM budget, and it keeps combos of data, prompts, and contexts inside the LAN. The router definition lives in a single config file, so adding new sensitive domains is just editing a line. External APIs never see that material.

## Use your Codex + Copilot plan for the rest

Public or collaborative prompts go to the OpenAI Codex subscription you already pay for. There is no need to double up on Claude Max; Codex handles general logic and text generation just fine, especially when you batch requests and cache responses. When the job needs a more developer‑centric brain, drop the call to a Copilot model (sonnet/opus). OpenClaw can switch providers based on tags, so the private work stays local, while the general questions lean on the cloud models you already control.

## Tailscale is the trust layer

Install Tailscale on every node: the VPS, the old computer, your laptop, your phone. Lock the ACLs down so only selected devices can reach the OpenClaw UI or SSH. This mesh keeps everything encrypted, gives you a consistent hostname, and means you never open ports to the public internet. You can even run the OpenClaw UI over Tailscale and keep the VPS strictly for inbound Telegram webhooks.

## Telegram is the command center

Telegram does not need your real phone number and it fits my preference for keeping carriers out of the automation stack. Configure OpenClaw’s Telegram plugin, wire it to the VPS, and you get a bot that can trigger automations, send notifications, and pass back logs. Because the control surface sits in Telegram, there is no demand for WhatsApp or iMessage integrations that force you to expose your number or device.

## Keep it basically free

Monitor resource usage, keep a simple cron that rsyncs config to the VPS, and let OpenClaw stay lightweight. The combined cost is the electricity for the old desktop plus a $5 VPS. Everything sensitive stays local, routed to Ollama. Everything public rides Codex/Copilot. Tailscale keeps the mesh closed. Telegram is the front door. That is how you run OpenClaw with roughly zero incremental cost and maximum control.
