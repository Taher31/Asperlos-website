<?php
// Copy to the home directory on the host, OUTSIDE public_html, as:  ~/asperlos-config.php
// (public_html/api/inquiry.php loads it from two levels up). Never commit the real file.

return [
    'db' => [
        'dsn'      => 'mysql:host=localhost;dbname=CPANELUSER_asperlos;charset=utf8mb4',
        'user'     => 'CPANELUSER_asperlos',
        'password' => 'CHANGE_ME',
    ],

    // Inquiries are emailed here. Send from an address on the site's domain so SPF/DKIM pass (ADR-0001, R3).
    'notify_email' => 'sales@example.com',
    'from_email'   => 'no-reply@esperlos.sbs',

    // Random string used to hash visitor IPs for rate limiting (no raw IPs are stored).
    'ip_salt' => 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',

    // Optional instant notifications. Leave empty to disable.
    'telegram_bot_token' => '',
    'telegram_chat_id'   => '',
    'bale_bot_token'     => '',
    'bale_chat_id'       => '',

    // Max inquiries per visitor in 10 minutes.
    'rate_limit' => 5,
];
