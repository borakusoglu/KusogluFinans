<?php
/**
 * FirebaseWriter — Firebase Realtime Database'e ödeme logları yazar.
 *
 * Google Service Account JSON + JWT ile OAuth2 access token alır,
 * ardından Firebase REST API üzerinden veri yazar.
 *
 * Composer gerektirmez, sadece cURL + openssl yeterlidir.
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class FirebaseWriter
{
    /** @var string Firebase Realtime Database URL */
    private $databaseUrl;

    /** @var string Google Service Account client_email */
    private $clientEmail;

    /** @var string Google Service Account private_key */
    private $privateKey;

    /** @var string|null Cached access token */
    private $accessToken;

    /** @var int Token expiry timestamp */
    private $tokenExpiry = 0;

    /** @var string HMAC secret key — veri bütünlüğü doğrulaması için */
    private $hmacSecret;

    /**
     * @param string|null $configPath Service account JSON dosya yolu (opsiyonel)
     */
    public function __construct(?string $configPath = null)
    {
        if ($configPath === null) {
            $configPath = _PS_MODULE_DIR_ . 'kdepo_tahsilat/config/firebase-service-account.json';
        }

        if (!file_exists($configPath)) {
            throw new \RuntimeException(
                'Firebase service account dosyası bulunamadı: ' . $configPath
            );
        }

        $config = json_decode(file_get_contents($configPath), true);

        if (empty($config['client_email']) || empty($config['private_key'])) {
            throw new \RuntimeException(
                'Firebase service account dosyası geçersiz: client_email veya private_key eksik.'
            );
        }

        $this->databaseUrl = 'https://kusoglufinans-default-rtdb.europe-west1.firebasedatabase.app';
        $this->clientEmail = $config['client_email'];
        $this->privateKey  = $config['private_key'];
        $this->hmacSecret  = Configuration::get('KDEPO_INTERNAL_3D_SECRET') ?: 'kdepo-default-hmac-key';
    }

    /**
     * Ödeme log verisini Firebase Realtime Database'e yazar.
     *
     * Yol: /payment_logs/{orderId}.json
     *
     * @param array $data Yazılacak veri
     * @return bool Başarılı ise true
     */
    public function writePaymentLog(array $data): bool
    {
        $orderId = $data['orderId'] ?? '';
        if (empty($orderId)) {
            throw new \InvalidArgumentException('orderId boş olamaz.');
        }

        $data['createdAt'] = gmdate('Y-m-d\TH:i:s\Z');
        $data['updatedAt'] = $data['createdAt'];

        // SHA-256 HMAC imza — veri bütünlüğü doğrulaması
        $data['_signature'] = $this->signData($data);

        $path = '/payment_logs/' . urlencode($orderId) . '.json';

        return $this->put($path, $data);
    }

    /**
     * Mevcut ödeme kaydını günceller (PATCH).
     * Sadece verilen alanlar güncellenir, diğerleri korunur.
     *
     * @param string $orderId Sipariş ID
     * @param array $updates Güncellenecek alanlar
     * @return bool
     */
    public function updatePaymentLog(string $orderId, array $updates): bool
    {
        if (empty($orderId)) {
            throw new \InvalidArgumentException('orderId boş olamaz.');
        }

        $updates['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
        $updates['_signature'] = $this->signData($updates);

        $path = '/payment_logs/' . urlencode($orderId) . '.json';

        return $this->patch($path, $updates);
    }

    /**
     * SHA-256 HMAC imza oluşturur.
     */
    private function signData(array $data): string
    {
        // İmza hesaplanırken _signature alanı hariç tutulur
        $signableData = $data;
        unset($signableData['_signature']);
        ksort($signableData);
        $payload = json_encode($signableData, JSON_UNESCAPED_UNICODE);
        return hash_hmac('sha256', $payload, $this->hmacSecret);
    }

    private function put(string $path, array $data): bool
    {
        return $this->request('PUT', $path, $data);
    }

    /**
     * Firebase REST API'ye PATCH isteği gönderir (kısmi güncelleme).
     */
    private function patch(string $path, array $data): bool
    {
        return $this->request('PATCH', $path, $data);
    }

    /**
     * Firebase REST API'ye istek gönderir.
     */
    private function request(string $method, string $path, array $data): bool
    {
        $token = $this->getAccessToken();
        $url   = rtrim($this->databaseUrl, '/') . $path . '?auth=' . $token;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_POSTFIELDS     => json_encode($data, JSON_UNESCAPED_UNICODE),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if (!empty($error)) {
            throw new \RuntimeException('Firebase bağlantı hatası: ' . $error);
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException(
                'Firebase yazma hatası (HTTP ' . $httpCode . '): ' . ($response ?: 'Yanıt yok')
            );
        }

        return true;
    }

    /**
     * Google OAuth2 access token alır (JWT ile).
     * Token 1 saat geçerlidir, cache'lenir.
     */
    private function getAccessToken(): string
    {
        // Cache kontrolü (5 dk erken yenile)
        if ($this->accessToken && time() < ($this->tokenExpiry - 300)) {
            return $this->accessToken;
        }

        $now = time();

        // JWT Header
        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ]));

        // JWT Payload
        $payload = $this->base64UrlEncode(json_encode([
            'iss'   => $this->clientEmail,
            'sub'   => $this->clientEmail,
            'aud'   => 'https://oauth2.googleapis.com/token',
            'iat'   => $now,
            'exp'   => $now + 3600,
            'scope' => 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
        ]));

        // İmzala
        $signatureInput = $header . '.' . $payload;
        $signature = '';
        $privateKey = openssl_pkey_get_private($this->privateKey);

        if ($privateKey === false) {
            throw new \RuntimeException('Firebase private key okunamadı: ' . openssl_error_string());
        }

        if (!openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('JWT imzalama hatası: ' . openssl_error_string());
        }

        $jwt = $signatureInput . '.' . $this->base64UrlEncode($signature);

        // Google OAuth2 token endpoint'ine POST
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/x-www-form-urlencoded',
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $error    = curl_error($ch);
        curl_close($ch);

        if (!empty($error)) {
            throw new \RuntimeException('Google OAuth2 bağlantı hatası: ' . $error);
        }

        $result = json_decode($response, true);

        if (empty($result['access_token'])) {
            $errDesc = $result['error_description'] ?? $result['error'] ?? 'Bilinmeyen hata';
            throw new \RuntimeException('Google OAuth2 token alınamadı: ' . $errDesc);
        }

        $this->accessToken = $result['access_token'];
        $this->tokenExpiry = $now + ($result['expires_in'] ?? 3600);

        return $this->accessToken;
    }

    /**
     * Base64 URL-safe encode.
     */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
