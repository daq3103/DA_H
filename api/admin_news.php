<?php
/**
 * admin_news.php
 * CRUD API cho quản lý tin tức — schema mới (author_id liên kết users).
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("
                SELECT n.*, u.full_name as author
                FROM news n
                LEFT JOIN users u ON n.author_id = u.id
                ORDER BY n.published_at DESC
            ")->fetchAll();
            echo json_encode($rows);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO news (title, slug, thumbnail_url, summary, content, author_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['title'],
                $data['slug'],
                $data['thumbnail_url'] ?? '',
                $data['summary'] ?? '',
                $data['content'] ?? '',
                $data['author_id'] ?? null
            ]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("UPDATE news SET title=?, slug=?, thumbnail_url=?, summary=?, content=?, author_id=? WHERE id=?");
            $stmt->execute([
                $data['title'],
                $data['slug'],
                $data['thumbnail_url'] ?? '',
                $data['summary'] ?? '',
                $data['content'] ?? '',
                $data['author_id'] ?? null,
                $data['id']
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("DELETE FROM news WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
