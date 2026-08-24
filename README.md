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

On every authenticated page load, the asset is included via the standard
`afterScriptLibTags` event.

The script listens for `hashchange`. When the hash matches `#/tickets/showTicket/<id>`, the script waits for nyroModal's
`.nyroModalCont` wrapper to render and injects a button into it.

The button uses the async clipboard API (with a `document.execCommand('copy')` fallback
for non-HTTPS contexts) and flashes success / error styling for ~1.5 s.

## Install

Enable the plugin from **Company Settings → Leantime Apps → My apps**. The plugin's `install()` hook
symlinks `assets/copy-ticket-link.js` and `assets/copy-ticket-link.css` into
`public/dist/` so the asset URLs resolve.

No configuration is required.

## Uninstall

Disabling the plugin removes the symlinks.

## Development

Clone this repository into your Leantime plugins folder:

```shell
git clone https://github.com/ITK-Leantime/copy-ticket-link.git app/Plugins/CopyTicketLink
```

Run composer install:

```shell name=development-install
docker run --interactive --rm --volume ${PWD}:/app itkdev/php8.3-fpm:latest composer install
```

### Composer normalize

```shell name=composer-normalize
docker run --rm --volume ${PWD}:/app itkdev/php8.3-fpm:latest composer normalize
```

### Coding standards

#### Check and apply with phpcs

```shell name=check-coding-standards
docker run --interactive --rm --volume ${PWD}:/app itkdev/php8.3-fpm:latest composer coding-standards-check
```

```shell name=apply-coding-standards
docker run --interactive --rm --volume ${PWD}:/app itkdev/php8.3-fpm:latest composer coding-standards-apply
```

#### Check and apply with prettier

```shell name=prettier-check
docker run --rm -v "$(pwd):/work" tmknom/prettier:latest --check assets
```

```shell name=prettier-apply
docker run --rm -v "$(pwd):/work" tmknom/prettier:latest --write assets
```

#### Check and apply markdownlint

```shell name=markdown-check
docker run --rm --volume "$PWD:/md" itkdev/markdownlint '**/*.md'
```

```shell name=markdown-apply
docker run --rm --volume "$PWD:/md" itkdev/markdownlint '**/*.md' --fix
```

#### Check with shellcheck

```shell name=shell-check
docker run --rm --volume "$PWD:/app" --workdir /app peterdavehello/shellcheck shellcheck --external-sources --source-path=SCRIPTDIR bin/create-release
docker run --rm --volume "$PWD:/app" --workdir /app peterdavehello/shellcheck shellcheck --external-sources --source-path=SCRIPTDIR bin/deploy
docker run --rm --volume "$PWD:/app" --workdir /app peterdavehello/shellcheck shellcheck --external-sources --source-path=SCRIPTDIR bin/local.create-release
```

### Code analysis

```shell name=code-analysis
# This analysis takes a bit more than the default allocated ram.
docker run --interactive --rm --volume ${PWD}:/app --env PHP_MEMORY_LIMIT=256M itkdev/php8.3-fpm:latest composer code-analysis
```

## Test release build

```shell name=test-create-release
docker compose build && docker compose run --rm php bin/create-release dev-test
```

The create-release script replaces `%%VERSION%%` in
[register.php](https://github.com/ITK-Leantime/copy-ticket-link/blob/main/register.php)
with the tag provided (in the above it is `dev-test`).

## Deploy

The deploy script downloads a [release](https://github.com/ITK-Leantime/copy-ticket-link/releases) from Github and
unzips it. The script should be passed a tag as argument. In the process the script deletes itself, but the script
finishes because it [is still in memory](https://linux.die.net/man/3/unlink).
