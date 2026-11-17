<?php
declare(strict_types=1);

const COMMENT_LIMIT = 150;
const COMMENT_FILE_BYTES = 1024 * 1024;
const COMMENT_REQUEST_BYTES = 20 * 1024;
const VISITOR_LIMIT = 3;
const VISITOR_WINDOW = 600;
const SITE_LIMIT = 60;
const SITE_WINDOW = 3600;

function respond(int $status, array $data): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readBounded(string $path, int $limit): string
{
    if (is_link($path) || !is_file($path)) {
        throw new RuntimeException('Invalid comment storage file');
    }
    $data = @file_get_contents($path, false, null, 0, $limit + 1);
    if ($data === false || strlen($data) > $limit) {
        throw new RuntimeException('Cannot read comment storage file');
    }
    return $data;
}

function privateDirectory(bool $create): ?string
{
    $parent = realpath(dirname(__DIR__, 2));
    $documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__));
    if ($parent === false || $documentRoot === false) {
        throw new RuntimeException('Cannot resolve comment storage location');
    }

    $directory = $parent . DIRECTORY_SEPARATOR . 'asperlos-journal-comments';
    $pathForComparison = fn ($path) => rtrim(str_replace('\\', '/', $path), '/');
    $directoryPath = $pathForComparison($directory);
    $publicPath = $pathForComparison($documentRoot);
    if (PHP_OS_FAMILY === 'Windows') {
        $directoryPath = strtolower($directoryPath);
        $publicPath = strtolower($publicPath);
    }
    if (str_starts_with($directoryPath . '/', $publicPath . '/')) {
        throw new RuntimeException('Comment storage would be public');
    }

    if (is_link($directory)) {
        throw new RuntimeException('Invalid comment storage directory');
    }
    if (!is_dir($directory)) {
        if (!is_writable($parent) || file_exists($directory)) {
            throw new RuntimeException('Cannot create comment storage directory');
        }
        if (!$create) {
            return null;
        }
        if (!@mkdir($directory, 0700) && !is_dir($directory)) {
            throw new RuntimeException('Cannot create comment storage directory');
        }
    }
    if (is_link($directory) || !is_readable($directory) || !is_writable($directory)) {
        throw new RuntimeException('Comment storage directory is unavailable');
    }
    if (PHP_OS_FAMILY !== 'Windows' && (fileperms($directory) & 0022) !== 0) {
        throw new RuntimeException('Comment storage directory is writable by other accounts');
    }
    return $directory;
}

function readState(string $path, int $limit): array
{
    clearstatcache(true, $path);
    if (!file_exists($path) && !is_link($path)) {
        return [];
    }
    $data = json_decode(readBounded($path, $limit), true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new RuntimeException('Invalid comment storage data');
    }
    return $data;
}

function writeState(string $path, array $data, int $limit): void
{
    if (is_link($path) || (file_exists($path) && !is_file($path))) {
        throw new RuntimeException('Invalid comment storage target');
    }
    $encoded = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $directory = dirname($path);
    $temp = @tempnam($directory, '.journal-');
    if ($temp === false) {
        throw new RuntimeException('Cannot allocate comment storage');
    }
    try {
        if (realpath(dirname($temp)) !== realpath($directory) || strlen($encoded) > $limit
            || @file_put_contents($temp, $encoded) !== strlen($encoded)
            || !@rename($temp, $path)
        ) {
            throw new RuntimeException('Cannot save comment storage');
        }
    } finally {
        if (is_file($temp)) {
            @unlink($temp);
        }
    }
}

function withLock(string $path, callable $operation): mixed
{
    if (is_link($path) || (file_exists($path) && !is_file($path))) {
        throw new RuntimeException('Invalid comment storage lock');
    }
    $file = @fopen($path, 'c+b');
    if ($file === false) {
        throw new RuntimeException('Cannot open comment storage lock');
    }
    try {
        if (is_link($path) || !flock($file, LOCK_EX)) {
            throw new RuntimeException('Cannot lock comment storage');
        }
        return $operation();
    } finally {
        fclose($file);
    }
}

function reserveSlot(string $directory): int
{
    return withLock($directory . '/submission.lock', static function () use ($directory): int {
        $path = $directory . '/submission.json';
        $state = readState($path, 16384);
        $secret = $state['secret'] ?? bin2hex(random_bytes(32));
        $visitor = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '', $secret);
        $now = time();
        $recent = array_values(array_filter(
            $state['events'] ?? [],
            static fn (array $event): bool => $event['time'] > $now - SITE_WINDOW,
        ));
        $visitorEvents = array_values(array_filter(
            $recent,
            static fn (array $event): bool => $event['visitor'] === $visitor && $event['time'] > $now - VISITOR_WINDOW,
        ));
        if (count($visitorEvents) >= VISITOR_LIMIT) {
            return max(1, $visitorEvents[0]['time'] + VISITOR_WINDOW - $now);
        }
        if (count($recent) >= SITE_LIMIT) {
            return max(1, $recent[0]['time'] + SITE_WINDOW - $now);
        }

        $recent[] = ['visitor' => $visitor, 'time' => $now];
        writeState($path, ['secret' => $secret, 'events' => $recent], 16384);
        return 0;
    });
}

function sameOrigin(): bool
{
    $fetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($fetchSite !== '' && $fetchSite !== 'same-origin' && $fetchSite !== 'none') {
        return false;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $https = in_array(strtolower($_SERVER['HTTPS'] ?? ''), ['on', '1'], true)
        || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $expected = ($https ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '');
    return $origin === '' || strcasecmp($origin, $expected) === 0;
}

function cleanText(mixed $value, int $limit, bool $multiline): ?string
{
    if (!is_string($value)) {
        return null;
    }
    $value = str_replace(["\r\n", "\r", "\u{2028}", "\u{2029}", "\t"], ["\n", "\n", "\n", "\n", ' '], $value);
    if (!$multiline) {
        $value = str_replace("\n", ' ', $value);
    }
    // Keep Persian joiners and line breaks, and discard controls that can disrupt nearby text.
    $value = preg_replace('/[\x{0000}-\x{0009}\x{000B}-\x{001F}\x{007F}-\x{009F}\x{202A}-\x{202E}\x{2066}-\x{2069}]/u', '', $value);
    $value = is_string($value) ? preg_replace('/^[\p{Z}\s]+|[\p{Z}\s]+$/u', '', $value) : null;
    if (!is_string($value) || $value === '' || preg_match('/[\p{L}\p{N}\p{P}\p{S}]/u', $value) !== 1) {
        return null;
    }
    return preg_match_all('/./us', $value) <= $limit ? $value : null;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'GET' && $method !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'method_not_allowed']);
}

$article = $_GET['article'] ?? '';
if (!is_string($article) || strlen($article) > 90 || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $article)) {
    respond(404, ['error' => 'not_found']);
}

try {
    $published = json_decode(readBounded(__DIR__ . '/journal-articles.json', 512 * 1024), true, 8, JSON_THROW_ON_ERROR);
    if (!is_array($published) || !array_is_list($published)) {
        throw new RuntimeException('Invalid published journal index');
    }
    if (!in_array($article, $published, true)) {
        respond(404, ['error' => 'not_found']);
    }

    if ($method === 'GET') {
        $directory = privateDirectory(false);
        $comments = $directory === null ? [] : readState($directory . '/article-' . $article . '.json', COMMENT_FILE_BYTES);
        respond(200, ['comments' => $comments]);
    }

    if (!sameOrigin()) {
        respond(403, ['error' => 'forbidden']);
    }
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '', 2)[0]));
    if ($contentType !== 'application/json' || (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > COMMENT_REQUEST_BYTES) {
        respond(400, ['error' => 'invalid']);
    }
    $raw = file_get_contents('php://input', false, null, 0, COMMENT_REQUEST_BYTES + 1);
    if ($raw === false || strlen($raw) > COMMENT_REQUEST_BYTES) {
        respond(400, ['error' => 'invalid']);
    }
    $payload = json_decode($raw, true, 8);
    if (!is_array($payload) || ($payload['website'] ?? '') !== '') {
        respond(400, ['error' => 'invalid']);
    }
    $name = cleanText($payload['name'] ?? null, 60, false);
    $body = cleanText($payload['body'] ?? null, 1500, true);
    if ($name === null || $body === null) {
        respond(400, ['error' => 'invalid']);
    }

    $directory = privateDirectory(true);
    $retryAfter = reserveSlot($directory);
    if ($retryAfter > 0) {
        header('Retry-After: ' . $retryAfter);
        respond(429, ['error' => 'rate_limit']);
    }

    $comment = ['name' => $name, 'body' => $body, 'createdAt' => gmdate(DATE_ATOM)];
    $path = $directory . '/article-' . $article . '.json';
    withLock($path . '.lock', static function () use ($path, $comment): void {
        $comments = readState($path, COMMENT_FILE_BYTES);
        array_unshift($comments, $comment);
        writeState($path, array_slice($comments, 0, COMMENT_LIMIT), COMMENT_FILE_BYTES);
    });
    respond(201, ['comment' => $comment]);
} catch (Throwable $error) {
    error_log('journal-comments.php: ' . $error->getMessage());
    respond(503, ['error' => 'unavailable']);
}
