---
title: Using Vite to Develop Wordpress Themes
date: 2023-02-07
published: false
---

# Using Vite to Develop Wordpress Themes

At Leisure Travel Vans, we've been using a custom build system to compile our SCSS and JS files for our Wordpress themes, as well as custom plugins we've developed. We've been using this system for a few years now, and it's worked well for us. However, with modern browser support aligning well with our user demographic, I wanted to move to a more modern build system, ideally with less dependencies and a faster build time. I also wanted to be able to use modern JS features like ES6 modules, and I wanted to be able to use SCSS.

I'm going to walk through the steps I took to get this working, and I'll also share some of the challenges I ran into along the way.

## Why Vite?

1. Vite is fast. It's a lot faster than our previous build system, which was based on Webpack.
2. Vite is easy to use.

## Getting Started
