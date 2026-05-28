<?php

namespace Leantime\Plugins\CopyTicketLink\Services;

/**
 * Symlinks the plugin's assets into Leantime's public path on install,
 * and removes them on uninstall.
 */
class CopyTicketLink
{
    /**
     * @var array<string, string>
     */
    private static array $assets = [
        __DIR__ . '/../assets/copy-ticket-link.css' => APP_ROOT . '/public/dist/css/copy-ticket-link.css',
        __DIR__ . '/../assets/copy-ticket-link.js' => APP_ROOT . '/public/dist/js/copy-ticket-link.js',
    ];

    /**
     * @return void
     */
    public function install(): void
    {
        foreach (self::getAssets() as $source => $target) {
            $targetDir = dirname($target);
            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }
            if (file_exists($target) || is_link($target)) {
                unlink($target);
            }
            if (file_exists($source)) {
                symlink($source, $target);
            }
        }
    }

    /**
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
     * @return array<string, string>
     */
    private static function getAssets(): array
    {
        return self::$assets;
    }
}
