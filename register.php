<?php

use Leantime\Core\Events\EventDispatcher;
use Leantime\Plugins\CopyTicketLink\Middleware\GetLanguageAssets;

// Register the language-asset middleware so the plugin's Language/*.ini files
// get merged into the request's language array, which lets `__('copyTicketLink.*')`
// resolve below.
EventDispatcher::add_filter_listener(
    'leantime.core.http.httpkernel.handle.plugins_middleware',
    fn (array $middleware) => array_merge($middleware, [GetLanguageAssets::class]),
);

/*
 * Emit the asset tags on every authenticated page. The script is tiny and
 * self-contained; it just listens for `hashchange` and only does anything
 * when the hash matches `#/tickets/showTicket/<id>`, so the cost of loading
 * it everywhere is negligible.
 *
 * Skipping anonymous pages (no `userdata.id`) keeps the script out of the
 * login / install flows where the ticket modal can't open anyway.
 */
EventDispatcher::add_event_listener(
    'leantime.core.template.tpl.*.afterScriptLibTags',
    function () {
        if (session('userdata.id') === null) {
            return;
        }

        // %%VERSION%% is substituted during release packaging. In dev that
        // placeholder is left as-is, which would freeze the URL and let the
        // browser cache forever; fall back to the asset's mtime so every
        // edit produces a fresh URL.
        $jsPath = __DIR__ . '/dist/js/copy-ticket-link.js';
        $cssPath = __DIR__ . '/dist/css/copy-ticket-link.css';
        $jsVersion = '%%VERSION%%';
        $cssVersion = '%%VERSION%%';
        if ($jsVersion === '%' . '%VERSION%' . '%' && is_file($jsPath)) {
            $jsVersion = (string) filemtime($jsPath);
        }
        if ($cssVersion === '%' . '%VERSION%' . '%' && is_file($cssPath)) {
            $cssVersion = (string) filemtime($cssPath);
        }

        $jsUrl = '/dist/js/copy-ticket-link.js?' . http_build_query(['v' => $jsVersion]);
        $cssUrl = '/dist/css/copy-ticket-link.css?' . http_build_query(['v' => $cssVersion]);

        // Translated strings for the JS bundle. The bundle has no template
        // and no other PHP entry point, so we expose translations via a
        // window-scoped object — matches the pattern used by ProjectOverview
        // (`window.projectOverviewI18n`).
        $i18n = [
            'copyLink' => __('copyTicketLink.copy_link'),
            'copyLinkTooltip' => __('copyTicketLink.copy_link_tooltip'),
            'copied' => __('copyTicketLink.copied'),
            'copyFailed' => __('copyTicketLink.copy_failed'),
        ];

        echo '<link rel="stylesheet" href="' . htmlspecialchars($cssUrl) . '">';
        echo '<script>window.copyTicketLinkI18n = '
            . json_encode($i18n, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)
            . ';</script>';
        echo '<script type="module" src="' . htmlspecialchars($jsUrl) . '"></script>';
    },
    5
);
