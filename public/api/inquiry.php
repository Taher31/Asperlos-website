<?php
/**
 * Inquiry form handler (ADR-0001): validate, store in MySQL, email the sales inbox, optionally ping Telegram/Bale.
 *
 * - JSON clients (the form's fetch) get {"ok": true|false}.
 * - Plain form posts (no JavaScript) are redirected to the confirmation page, or back to the form on error.
 * Config lives outside public_html: ~/asperlos-config.php (see server/config.sample.php).
 */

declare(strict_types=1);

const LANGS = ['en', 'fa', 'ru'];
const LIMITS = ['name' => 100, 'company' => 150, 'phone' => 40, 'quantity' => 20, 'message' => 2000];

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
        header('Location: ' . ($ok ? "$prefix/inquiry/sent/" : "$prefix/inquiry/?error=$error"), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit;
}

// Spam trap: real visitors never fill the hidden "website" field. Pretend success so bots learn nothing.
if (trim((string)($_POST['website'] ?? '')) !== '') {
    finish(true, 200, $prefix, $wantsJson);
}

$configFile = dirname(__DIR__, 2) . '/asperlos-config.php';
if (!is_file($configFile)) {
    error_log('inquiry.php: missing config ' . $configFile);
    finish(false, 500, $prefix, $wantsJson, 'server');
}
$config = require $configFile;

// --- Validate ------------------------------------------------------------------
$field = static function (string $key) {
    $value = trim(str_replace("\0", '', (string)($_POST[$key] ?? '')));
    return mb_substr($value, 0, LIMITS[$key] ?? 100);
};
$data = [
    'name'     => $field('name'),
    'company'  => $field('company'),
    'phone'    => $field('phone'),
    'product'  => (string)($_POST['product'] ?? ''),
    'quantity' => $field('quantity'),
    'message'  => $field('message'),
];

$products = json_decode((string)@file_get_contents(__DIR__ . '/products.json'), true) ?: [];
$validProduct = $data['product'] === 'other' || isset($products[$data['product']]);

if ($data['name'] === '' || !preg_match('/^[+\d\s()\-.]{5,40}$/u', $data['phone']) || !$validProduct) {
    finish(false, 422, $prefix, $wantsJson, 'validation');
}

// --- Store and rate-limit ---------------------------------------------------------
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $config['ip_salt']);
$stored = false;
try {
    $pdo = new PDO($config['db']['dsn'], $config['db']['user'], $config['db']['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $recent = $pdo->prepare('SELECT COUNT(*) FROM inquiries WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 10 MINUTE)');
    $recent->execute([$ipHash]);
    if ((int)$recent->fetchColumn() >= (int)($config['rate_limit'] ?? 5)) {
        finish(false, 429, $prefix, $wantsJson, 'rate');
    }
    $insert = $pdo->prepare(
        'INSERT INTO inquiries (lang, name, company, phone, product, quantity, message, ip_hash, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insert->execute([
        $lang, $data['name'], $data['company'] ?: null, $data['phone'], $data['product'],
        $data['quantity'] ?: null, $data['message'] ?: null, $ipHash,
        mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
    ]);
    $stored = true;
} catch (Throwable $e) {
    error_log('inquiry.php: database error: ' . $e->getMessage());
}

// --- Notify ------------------------------------------------------------------------
$productName = $data['product'] === 'other' ? 'Other' : ($products[$data['product']]['en'] ?? $data['product']);
$lines = [
    'New inquiry from the website',
    '',
    'Product:  ' . $productName,
    'Quantity: ' . ($data['quantity'] ?: '-') . ' t',
    'Name:     ' . $data['name'],
    'Company:  ' . ($data['company'] ?: '-'),
    'Phone:    ' . $data['phone'],
    'Language: ' . $lang,
    '',
    'Message:',
    $data['message'] ?: '-',
];
$text = implode("\n", $lines);

$subject = '=?UTF-8?B?' . base64_encode("Inquiry: $productName ({$data['name']})") . '?=';
$headers = implode("\r\n", [
    'From: Asperlos website <' . $config['from_email'] . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);
$mailed = @mail($config['notify_email'], $subject, $text, $headers, '-f' . $config['from_email']);
if (!$mailed) {
    error_log('inquiry.php: mail() failed');
}

// Messenger bots are best-effort: a failure here never fails the request.
$notifyBot = static function (string $apiBase, string $token, string $chatId, string $message): void {
    if ($token === '' || $chatId === '') {
        return;
    }
    $ch = curl_init("$apiBase/bot$token/sendMessage");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => ['chat_id' => $chatId, 'text' => $message],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
    ]);
    if (curl_exec($ch) === false) {
        error_log("inquiry.php: bot notify failed ($apiBase): " . curl_error($ch));
    }
    curl_close($ch);
};
$notifyBot('https://api.telegram.org', (string)($config['telegram_bot_token'] ?? ''), (string)($config['telegram_chat_id'] ?? ''), $text);
$notifyBot('https://tapi.bale.ai', (string)($config['bale_bot_token'] ?? ''), (string)($config['bale_chat_id'] ?? ''), $text);

if (!$stored && !$mailed) {
    finish(false, 500, $prefix, $wantsJson, 'server');
}
finish(true, 200, $prefix, $wantsJson);
