<?php

namespace Leantime\Plugins\CopyTicketLink\Services;

/**
 * Install / uninstall for the CopyTicketLink plugin — only responsibility is
 * keeping symlinks in `public/dist/{js,css}/` pointing at the plugin's own
 * dist folder so the asset URLs emitted from `register.php` resolve.
 *
 * The plugin has no build step (single-file vanilla JS + a few lines of CSS,
 * no imports), so `dist/` here is the source of truth, not a build output.
 */
class CopyTicketLink
{
    /**
     * @var array<string, string>
     */
    private static array $assets = [
        // source => target
        __DIR__ . '/../dist/css/copy-ticket-link.css' => APP_ROOT . '/public/dist/css/copy-ticket-link.css',
        __DIR__ . '/../dist/js/copy-ticket-link.js' => APP_ROOT . '/public/dist/js/copy-ticket-link.js',
    ];

    /**
     * Install plugin.
     *
     * @return void
     */
    public function install(): void
    {
        foreach (self::getAssets() as $source => $target) {
            // Ensure the target directory exists
            $targetDir = dirname($target);
            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }

            // Remove any existing file or broken symlink at target path
            if (file_exists($target) || is_link($target)) {
                unlink($target);
            }

            // Only create symlink if the source file exists
            if (file_exists($source)) {
                symlink($source, $target);
            }
        }
    }

    /**
     * Uninstall plugin.
     *
     * @return void
     */
    public function uninstall(): void
    {
        foreach (self::getAssets() as $target) {
            if (file_exists($target)) {
                unlink($target);
            }
        }
    }

    /**
     * Get assets.
     *
     * @return array<string, string>
     */
    private static function getAssets(): array
    {
        return self::$assets;
    }
}
