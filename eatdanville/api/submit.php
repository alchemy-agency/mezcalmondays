<?php
// EatDanville form endpoint. Accepts industry sign-ups, partner inquiries and contact messages.
// Stores every submission as one JSON line outside the web root and optionally emails a notification.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Configure the notification address here. Leave empty to only store submissions.
$NOTIFY_EMAIL = '';
$FROM_EMAIL = 'noreply@eatdanville.com';
$STORE = dirname(__DIR__, 2) . '/private/eatdanville-submissions.jsonl';

function respond(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'POST only']);
}

// Same-origin check (best effort).
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && $host !== '' && stripos($origin, $host) === false) {
    respond(403, ['ok' => false, 'error' => 'Cross-origin submissions are not accepted']);
}

$raw = file_get_contents('php://input');
$data = [];
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    $data = json_decode($raw ?: '[]', true) ?: [];
} else {
    $data = $_POST;
}

// Honeypot: real visitors never fill this.
if (!empty($data['website_url'])) {
    respond(200, ['ok' => true]);
}

$type = preg_replace('/[^a-z_]/', '', strtolower((string)($data['type'] ?? 'contact')));
if (!in_array($type, ['industry', 'partner', 'contact', 'newsletter'], true)) {
    $type = 'contact';
}

$clean = static function ($v, int $max = 500): string {
    $v = is_string($v) ? $v : '';
    $v = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $v));
    return mb_substr($v, 0, $max);
};

$email = $clean($data['email'] ?? '', 200);
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['ok' => false, 'error' => 'Enter a valid email address', 'field' => 'email']);
}

$record = [
    'type' => $type,
    'at' => gmdate('c'),
    'ip_hash' => hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'eatdanville'),
    'name' => $clean($data['name'] ?? '', 120),
    'email' => $email,
    'phone' => $clean($data['phone'] ?? '', 40),
    'business' => $clean($data['business'] ?? '', 160),
    'restaurant' => $clean($data['restaurant'] ?? '', 160),
    'role' => $clean($data['role'] ?? '', 80),
    'interest' => $clean($data['interest'] ?? '', 80),
    'message' => $clean($data['message'] ?? '', 2000),
    'consent' => !empty($data['consent']),
    'page' => $clean($data['page'] ?? '', 200),
];

if ($type === 'industry' && ($record['name'] === '' || $record['restaurant'] === '')) {
    respond(422, ['ok' => false, 'error' => 'Name and restaurant are required', 'field' => $record['name'] === '' ? 'name' : 'restaurant']);
}
if ($type === 'partner' && $record['business'] === '') {
    respond(422, ['ok' => false, 'error' => 'Business name is required', 'field' => 'business']);
}

// Light rate limit: max 10 submissions per hashed IP per hour.
$dir = dirname($STORE);
if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
$limitFile = $dir . '/rate-' . substr($record['ip_hash'], 0, 16) . '.json';
$bucket = is_file($limitFile) ? (json_decode((string)file_get_contents($limitFile), true) ?: []) : [];
$bucket = array_values(array_filter($bucket, static fn($t) => $t > time() - 3600));
if (count($bucket) >= 10) {
    respond(429, ['ok' => false, 'error' => 'Too many submissions. Try again in an hour.']);
}
$bucket[] = time();
@file_put_contents($limitFile, json_encode($bucket));

$line = json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
if (@file_put_contents($STORE, $line, FILE_APPEND | LOCK_EX) === false) {
    respond(500, ['ok' => false, 'error' => 'Could not save your submission. Email us instead.']);
}

if ($NOTIFY_EMAIL !== '') {
    $subject = '[EatDanville] New ' . $type . ' submission';
    $body = "Type: {$record['type']}\nName: {$record['name']}\nEmail: {$record['email']}\nPhone: {$record['phone']}\n"
        . "Business: {$record['business']}\nRestaurant: {$record['restaurant']}\nRole: {$record['role']}\nInterest: {$record['interest']}\n\n{$record['message']}\n";
    @mail($NOTIFY_EMAIL, $subject, $body, "From: {$FROM_EMAIL}\r\nReply-To: {$record['email']}\r\n");
}

respond(200, ['ok' => true]);
