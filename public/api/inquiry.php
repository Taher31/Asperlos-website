<?php
/**
 * Validate and email each inquiry. A private host config can also enable MySQL and messenger notifications.
 *
 * - JSON clients (the form's fetch) get {"ok": true|false}.
 * - Plain form posts (no JavaScript) are redirected to the confirmation page, or back to the form on error.
 * Optional config lives above the document root: ~/asperlos-config.php (see server/config.sample.php).
 */

declare(strict_types=1);

const LANGS = ['en', 'fa', 'ru'];
const INQUIRY_EMAIL = 'info@asperlos.ir';
const RATE_WINDOW_SECONDS = 600;

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');
$lang = in_array($_POST['lang'] ?? '', LANGS, true) ? $_POST['lang'] : 'en';
$prefix = $lang === 'en' ? '' : "/$lang";

function finish(bool $ok, int $status, string $prefix, bool $json, string $error = ''): never
{
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    } else {
        header('Location: ' . ($ok ? "$prefix/inquiry/sent/" : "$prefix/inquiry/?error=$error#inquiry-error"), true, 303);
    }
    exit;
}

function posted(string $key): string
{
    $value = $_POST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function field(string $key, int $limit): string
{
    return mb_substr(str_replace("\0", '', posted($key)), 0, $limit, 'UTF-8');
}

function emailAddress(string $value): ?string
{
    if (strlen($value) > 254 || strpbrk($value, "\r\n") !== false || !filter_var($value, FILTER_VALIDATE_EMAIL)) {
        return null;
    }
    return $value;
}

function phoneNumber(string $value): ?string
{
    if (strlen($value) > 254) {
        return null;
    }
    $value = strtr($value, [
        '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
        '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
    ]);
    if (preg_match('/^\+?[0-9 ().\-\p{Zs}]+$/uD', $value) !== 1) {
        return null;
    }
    $digits = preg_replace('/\D/', '', $value);
    if (strlen($digits) < 7 || strlen($digits) > 15) {
        return null;
    }
    return (str_starts_with($value, '+') ? '+' : '') . $digits;
}

/** Reserve a submission slot atomically. Return false when this visitor has reached the limit. */
function reserveSlot(string $ipHash, int $limit): bool
{
    $directory = sys_get_temp_dir() . '/asperlos-inquiry-' . substr(hash('sha256', __DIR__), 0, 16);
    if (!is_dir($directory) && !@mkdir($directory, 0700) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create rate limiter directory');
    }
    if (is_link($directory)) {
        throw new RuntimeException('Invalid rate limiter directory');
    }
    $file = @fopen($directory . '/rate.json', 'c+');
    if ($file === false) {
        throw new RuntimeException('Cannot open rate limiter');
    }
    try {
        if (!flock($file, LOCK_EX)) {
            throw new RuntimeException('Cannot lock rate limiter');
        }
        $history = json_decode(stream_get_contents($file), true);
        $history = is_array($history) ? $history : [];
        $now = time();
        $cutoff = $now - RATE_WINDOW_SECONDS;
        foreach ($history as $visitor => $timestamps) {
            $recent = array_values(array_filter($timestamps, static fn ($time) => $time > $cutoff));
            if ($recent === []) {
                unset($history[$visitor]);
            } else {
                $history[$visitor] = $recent;
            }
        }
        if (count($history[$ipHash] ?? []) >= $limit) {
            return false;
        }
        $history[$ipHash][] = $now;
        $encoded = json_encode($history, JSON_THROW_ON_ERROR);
        if (!rewind($file) || fwrite($file, $encoded) !== strlen($encoded)
            || !ftruncate($file, strlen($encoded)) || !fflush($file)
        ) {
            throw new RuntimeException('Cannot save rate limiter');
        }
        return true;
    } finally {
        fclose($file);
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit;
}

// Spam trap: real visitors never fill the hidden "website" field. Pretend success so bots learn nothing.
if (posted('website') !== '') {
    finish(true, 200, $prefix, $wantsJson);
}

// --- Validate ------------------------------------------------------------------
$name = field('name', 100);
$productInput = $_POST['product'] ?? '';
$product = posted('product');
$products = json_decode((string)@file_get_contents(__DIR__ . '/products.json'), true) ?: [];
if ($name === '' || !is_string($productInput) || ($product !== '' && $product !== 'other' && !isset($products[$product]))) {
    finish(false, 422, $prefix, $wantsJson, 'validation');
}

if (!array_key_exists('email', $_POST) && array_key_exists('contact', $_POST)) {
    // Cached pages may still submit the combined contact field.
    $contact = posted('contact');
    $email = emailAddress($contact);
    $phone = $email === null ? phoneNumber($contact) : null;
} else {
    $emailInput = $_POST['email'] ?? '';
    $phoneInput = $_POST['phone'] ?? '';
    $email = emailAddress(posted('email'));
    $phone = phoneNumber(posted('phone'));
    if (!is_string($emailInput) || (trim($emailInput) !== '' && $email === null)) {
        finish(false, 422, $prefix, $wantsJson, 'email');
    }
    if (!is_string($phoneInput) || (trim($phoneInput) !== '' && $phone === null)) {
        finish(false, 422, $prefix, $wantsJson, 'phone');
    }
}
if ($email === null && $phone === null) {
    finish(false, 422, $prefix, $wantsJson, 'contact');
}

// These fields remain accepted for visitors using a cached copy of the old form.
$company = field('company', 150);
$quantity = field('quantity', 20);
$message = field('message', 2000);

$configFile = dirname(__DIR__, 2) . '/asperlos-config.php';
$config = [];
try {
    if (is_file($configFile)) {
        $config = require $configFile;
    }
    $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ($config['ip_salt'] ?? __DIR__));
    if (!reserveSlot($ipHash, max(1, (int)($config['rate_limit'] ?? 5)))) {
        finish(false, 429, $prefix, $wantsJson, 'rate');
    }
} catch (Throwable $e) {
    error_log('inquiry.php: could not prepare submission');
    finish(false, 500, $prefix, $wantsJson, 'server');
}

// --- Email ----------------------------------------------------------------------
$productName = $product === 'other' ? 'Other' : ($products[$product]['en'] ?? $product);
$lines = [
    'New inquiry from the website',
    '',
    'Name: ' . $name,
];
if ($email !== null) {
    $lines[] = 'Email: ' . $email;
}
if ($phone !== null) {
    $lines[] = 'Phone / WhatsApp: ' . $phone;
}
if ($productName !== '') {
    $lines[] = 'Product: ' . $productName;
}
$lines[] = 'Language: ' . $lang;
if ($company !== '') {
    $lines[] = 'Company: ' . $company;
}
if ($quantity !== '') {
    $lines[] = 'Quantity: ' . $quantity . ' t';
}
if ($message !== '') {
    array_push($lines, '', 'Message:', $message);
}
$text = implode("\r\n", $lines);

$configuredSender = $config['from_email'] ?? '';
$sender = filter_var($configuredSender, FILTER_VALIDATE_EMAIL) && str_ends_with(strtolower($configuredSender), '@asperlos.ir')
    ? $configuredSender
    : INQUIRY_EMAIL;
$subject = $productName !== '' ? "Website inquiry: $productName" : 'Website inquiry';
$headers = [
    'From' => "Asperlos website <$sender>",
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => 'base64',
];
if ($email !== null) {
    $headers['Reply-To'] = $email;
}
if (!function_exists('mail') || !@mail(INQUIRY_EMAIL, $subject, chunk_split(base64_encode($text)), $headers, '-f' . escapeshellarg($sender))) {
    error_log('inquiry.php: mail transport rejected the inquiry');
    finish(false, 500, $prefix, $wantsJson, 'server');
}

// Store a copy when MySQL is configured. Keep email replies in the existing message column.
if (isset($config['db']['dsn'], $config['db']['user'], $config['db']['password'])) {
    try {
        $pdo = new PDO($config['db']['dsn'], $config['db']['user'], $config['db']['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $insert = $pdo->prepare(
            'INSERT INTO inquiries (lang, name, company, phone, product, quantity, message, ip_hash, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $storedMessage = $email === null ? $message : trim("Email: $email\n\n$message");
        $insert->execute([
            $lang, $name, $company !== '' ? $company : null, $phone ?? '', $product,
            $quantity !== '' ? $quantity : null, $storedMessage !== '' ? $storedMessage : null,
            $ipHash, mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255, 'UTF-8'),
        ]);
    } catch (Throwable $e) {
        error_log('inquiry.php: could not store inquiry copy');
    }
}

// Messenger bots are best-effort: a failure here never fails the request.
$notifyBot = static function (string $apiBase, string $token, string $chatId, string $message): void {
    if ($token === '' || $chatId === '' || !function_exists('curl_init')) {
        return;
    }
    try {
        $ch = curl_init("$apiBase/bot$token/sendMessage");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => ['chat_id' => $chatId, 'text' => $message],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);
        if (curl_exec($ch) === false || curl_getinfo($ch, CURLINFO_HTTP_CODE) >= 400) {
            error_log("inquiry.php: bot notification failed ($apiBase)");
        }
    } catch (Throwable $e) {
        error_log("inquiry.php: bot notification failed ($apiBase)");
    }
};
$notifyBot('https://api.telegram.org', (string)($config['telegram_bot_token'] ?? ''), (string)($config['telegram_chat_id'] ?? ''), $text);
$notifyBot('https://tapi.bale.ai', (string)($config['bale_bot_token'] ?? ''), (string)($config['bale_chat_id'] ?? ''), $text);

finish(true, 200, $prefix, $wantsJson);
