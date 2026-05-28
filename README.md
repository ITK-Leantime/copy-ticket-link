# Copy Ticket Link

A small Leantime plugin that adds a "copy link" button to the ticket modal.
Clicking the button copies a context-free URL to the clipboard:

```text
https://your-leantime.example/#/tickets/showTicket/14
```

— rather than the contextual URL the user happens to be on when they open
the modal (e.g. `…/ProjectOverview?view=view_abc…#/tickets/showTicket/14`).
The plain link opens the ticket directly from the frontpage, without first
loading whatever page the linker happened to be on.

## How it works

The plugin ships a single vanilla-JS file (no build step, no dependencies).
On every authenticated page load, the asset is included via the standard
`afterScriptLibTags` event. The script listens for `hashchange`. When the
hash matches `#/tickets/showTicket/<id>`, the script waits for nyroModal's
`.nyroModalCont` wrapper to render and injects a button into it. The button
uses the async clipboard API (with a `document.execCommand('copy')` fallback
for non-HTTPS contexts) and flashes success / error styling for ~1.5 s.

## Install

Enable the plugin from **Settings → Plugins**. The plugin's `install()` hook
symlinks `dist/js/copy-ticket-link.js` and `dist/css/copy-ticket-link.css`
into `public/dist/` so the asset URLs resolve.

No configuration is required.

## Uninstall

Disabling the plugin removes the symlinks.
