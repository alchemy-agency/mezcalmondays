<?php
// Stores listing and advertising requests as JSON lines outside the web root and emails a notice when $NOTIFY_EMAIL is set.
declare(strict_types=1);
header('Content-Type: application/json');
$NOTIFY_EMAIL = getenv('MM_NOTIFY_EMAIL') ?: '';
$STORE = dirname($_SERVER['DOCUMENT_ROOT']) . '/private/mezcal-monday-submissions.jsonl';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok' => false]); exit; }
if (!empty($_POST['website_url'])) { echo json_encode(['ok' => true]); exit; } // honeypot
$allowed = ['type', 'bar', 'address', 'name', 'email', 'special', 'mezcals', 'company', 'placement', 'message'];
$rec = ['at' => gmdate('c'), 'ip' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64)];
foreach ($allowed as $k) { if (isset($_POST[$k])) $rec[$k] = mb_substr(trim(strip_tags((string)$_POST[$k])), 0, 2000); }
if (empty($rec['email']) || !filter_var($rec['email'], FILTER_VALIDATE_EMAIL)) { http_response_code(422); echo json_encode(['ok' => false, 'error' => 'email']); exit; }
// crude rate limit: 20 per hour per IP
$dir = dirname($STORE); if (!is_dir($dir)) @mkdir($dir, 0700, true);
$rl = $dir . '/rl-' . md5($rec['ip']) . '.txt'; $n = is_file($rl) && filemtime($rl) > time() - 3600 ? (int)file_get_contents($rl) : 0;
if ($n >= 20) { http_response_code(429); echo json_encode(['ok' => false]); exit; }
file_put_contents($rl, (string)($n + 1));
file_put_contents($STORE, json_encode($rec, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
if ($NOTIFY_EMAIL) { @mail($NOTIFY_EMAIL, 'Mezcal Monday: ' . ($rec['type'] ?? 'form') . ' from ' . ($rec['bar'] ?? $rec['company'] ?? $rec['name']), print_r($rec, true), 'From: no-reply@mezcal-monday.com'); }
echo json_encode(['ok' => true]);
