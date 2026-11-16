<?php
// Optional: copy above the web document root as asperlos-config.php to store
// inquiries in MySQL or send messenger notifications. Never commit the real file.

return [
    'db' => [
        'dsn'      => 'mysql:host=localhost;dbname=CPANELUSER_asperlos;charset=utf8mb4',
        'user'     => 'CPANELUSER_asperlos',
        'password' => 'CHANGE_ME',
    ],

    // The form delivers to info@asperlos.ir. Override the sender only if needed.
    'from_email'   => 'info@asperlos.ir',

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
