# My Blog

Personal blog powered by [Hexo](https://hexo.io) + the [NexT](https://theme-next.js.org) theme, deployed to [eazow.github.io](https://eazow.github.io).

## Setup

```bash
npm install
```

## Common commands

| Command | Description |
| --- | --- |
| `npm run server` | Start the local dev server at `localhost:4000` |
| `npm run build` | Generate the static site into `public/` |
| `npm run clean` | Clear the cache (`db.json`) and generated files — run this after changing anything under `scripts/` or `source/_data/` |
| `npm run deploy` | Build and push `public/` to the GitHub Pages repo |
| `hexo new "post title"` | Create a new post under `source/_posts` |

## Notes

- Diagrams: fenced ` ```mermaid ` code blocks are auto-converted to NexT's `{% mermaid %}` tag at render time (see `scripts/mermaid-fence.js`), so standard Mermaid syntax works directly in posts.
- Custom site styles/scripts live in `source/_data/` (`styles.styl`, `body-end.njk`), wired up via `custom_file_path` in `themes/next/_config.yml`.

[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](https://forthebadge.com)
