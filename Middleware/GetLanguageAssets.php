<?php
// phpcs:ignoreFile

namespace Leantime\Plugins\CopyTicketLink\Middleware;

use Closure;
use Illuminate\Support\Facades\Cache;
use Leantime\Core\Configuration\Environment;
use Leantime\Core\Http\IncomingRequest;
use Leantime\Core\Language;
use Symfony\Component\HttpFoundation\Response;

/**
 * Merges this plugin's Language/{locale}.ini into Leantime's language array
 * so `__('copyTicketLink.copy_link')` resolves on whatever locale the user
 * has selected.
 *
 * Pattern mirrors the upstream plugin template:
 * https://github.com/Leantime/plugin-template/blob/main/Middleware/GetLanguageAssets.php
 */
class GetLanguageAssets
{
    public function __construct(
        private Language $language,
        private Environment $config,
    ) {
    }

    /**
     * @param \Closure(IncomingRequest): Response $next
     **/
    public function handle(IncomingRequest $request, Closure $next): Response
    {
        $languageArray = Cache::get('copyTicketLink.languageArray', []);

        if (!empty($languageArray)) {
            $this->language->ini_array = array_merge($this->language->ini_array, $languageArray);
            return $next($request);
        }

        if (!Cache::store('installation')->has('copyTicketLink.language.en-US')) {
            $languageArray += parse_ini_file(__DIR__ . '/../Language/en-US.ini', true);
        }

        // @phpstan-ignore-next-line
        if (($language = session(['usersettings.language']) ?? $this->config->language) !== 'en-US') {
            $languageFile = __DIR__ . '/../Language/' . $language . '.ini';

            if (file_exists($languageFile)) {
                if (!Cache::store('installation')->has('copyTicketLink.language.' . $language)) {
                    Cache::store('installation')->put(
                        'copyTicketLink.language.' . $language,
                        parse_ini_file($languageFile, true)
                    );
                }

                $languageArray = array_merge($languageArray, Cache::store('installation')->get('copyTicketLink.language.' . $language));
            }
        }

        Cache::put('copyTicketLink.languageArray', $languageArray);

        $this->language->ini_array = array_merge($this->language->ini_array, $languageArray);
        return $next($request);
    }
}
