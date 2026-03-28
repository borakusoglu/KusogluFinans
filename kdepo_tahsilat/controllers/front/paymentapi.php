<?php
/**
 * PaymentApiController — Ödeme tahsilat API endpoint'i.
 *
 * POST /api/kdepo_tahsilat/payment
 *
 * Kart bilgilerini sanal POS'a iletir, sonucu loglar ve e-posta bildirimlerini gönderir.
 * Kart bilgileri işlem sonrası bellekten temizlenir.
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/NestpayXmlBuilder.php';
require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/NestpayXmlParser.php';
require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/PaymentPdfGenerator.php';

class Kdepo_TahsilatPaymentapiModuleFrontController extends ModuleFrontController
{
    /** @var bool JSON yanıt döndüreceğimizi belirtir */
    public $ajax = true;

    /** @var int Rate limit: dakika başına maksimum istek */
    private static $rateLimitPerMinute = 10;

    /** @var string[] Zorunlu istek alanları */
    private static $requiredFields = [
        'firstName',
        'lastName',
        'companyName',
        'address',
        'email',
        'amount',
        'cardNumber',
        'expiryDate',
        'ccv',
        'collectorUserId',
    ];

    /** @var string[] Internal (3D callback) action'ları — API key yerine internal secret ile doğrulanır */
    private static $internalActions = ['3d_complete', '3d_fail'];

    /** @var string[] Kritik action'lar — admin yetkisi gerektirir */
    private static $adminActions = ['void', 'credit', 'postauth', 'query', 'list'];

    /**
     * POST isteğini işler.
     */
    public function initContent()
    {
        parent::initContent();

        // CORS — Tauri desktop app ve diğer istemciler için
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');

        // OPTIONS preflight isteğine hemen yanıt ver
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        // Yalnızca POST kabul et
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(false, null, 'Yalnızca POST metodu kabul edilir.', 'METHOD_NOT_ALLOWED', 405);
            return;
        }

        // TLS kontrolü (test modunda atla)
        $testMode = Configuration::get('KDEPO_POS_TEST_MODE');
        if (!$testMode && !$this->isSecureConnection()) {
            $this->jsonResponse(false, null, 'TLS bağlantısı zorunludur.', 'TLS_REQUIRED', 403);
            return;
        }

        // Rate limiting kontrolü — list ve query action'ları muaf (read-only)
        $rawBody = file_get_contents('php://input');
        $data = json_decode($rawBody, true);

        if (!is_array($data)) {
            $this->jsonResponse(false, null, 'Geçersiz JSON gövdesi.', 'INVALID_JSON', 400);
            return;
        }

        $action = isset($data['action']) ? (string) $data['action'] : 'payment';

        if (!in_array($action, ['list', 'query'], true) && !$this->checkRateLimit()) {
            $this->jsonResponse(false, null, 'Çok fazla istek. Lütfen bekleyiniz.', 'RATE_LIMIT_EXCEEDED', 429);
            return;
        }

        // ── Authentication kontrolü ──────────────────────────
        if (in_array($action, self::$internalActions, true)) {
            // 3D callback'ten gelen internal istekler — internal secret ile doğrula
            if (!$this->verifyInternalSecret($data)) {
                $this->jsonResponse(false, null, 'Yetkisiz erişim.', 'UNAUTHORIZED', 401);
                return;
            }
        } elseif (in_array($action, self::$adminActions, true)) {
            // Kritik işlemler — API key + admin yetkisi gerektirir
            if (!$this->authenticateApiKey()) {
                $this->jsonResponse(false, null, 'Geçersiz veya eksik API anahtarı.', 'UNAUTHORIZED', 401);
                return;
            }
        } else {
            // payment, 3d_init — API key ile doğrula
            if (!$this->authenticateApiKey()) {
                $this->jsonResponse(false, null, 'Geçersiz veya eksik API anahtarı.', 'UNAUTHORIZED', 401);
                return;
            }
        }

        switch ($action) {
            case 'void':
                $this->handleVoid($data);
                return;
            case 'credit':
                $this->handleCredit($data);
                return;
            case 'postauth':
                $this->handlePostAuth($data);
                return;
            case 'query':
                $this->handleQuery($data);
                return;
            case '3d_complete':
                $this->handle3DComplete($data);
                return;
            case '3d_fail':
                $this->handle3DFail($data);
                return;
            case '3d_init':
                $this->handle3DInit($data);
                return;
            case 'list':
                $this->handleList($data);
                return;
            case 'payment':
            default:
                $this->handlePayment($data);
                return;
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Authentication & Rate Limiting
    // ═══════════════════════════════════════════════════════════

    /**
     * API key doğrulaması.
     * Header: X-Api-Key veya JSON body'de apiKey alanı.
     */
    private function authenticateApiKey(): bool
    {
        $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

        $validKey = Configuration::get('KDEPO_API_SECRET_KEY');

        // API key henüz tanımlanmamışsa güvenlik uyarısı logla ve reddet
        if (empty($validKey)) {
            PrestaShopLogger::addLog(
                'kdepo_tahsilat: KDEPO_API_SECRET_KEY tanımlanmamış! API istekleri reddediliyor.',
                3, null, 'Kdepo_Tahsilat'
            );
            return false;
        }

        if (empty($apiKey)) {
            return false;
        }

        return hash_equals($validKey, $apiKey);
    }

    /**
     * 3D callback'ten gelen internal istekleri doğrular.
     * İstek body'sinde _internalSecret alanı kontrol edilir.
     */
    private function verifyInternalSecret(array $data): bool
    {
        $secret = $data['_internalSecret'] ?? '';
        $validSecret = Configuration::get('KDEPO_INTERNAL_3D_SECRET');

        if (empty($validSecret) || empty($secret)) {
            return false;
        }

        return hash_equals($validSecret, $secret);
    }

    /**
     * IP bazlı rate limiting.
     * ps_kdepo_rate_limit tablosunu kullanır.
     */
    private function checkRateLimit(): bool
    {
        $db = Db::getInstance();
        $ip = pSQL($this->getClientIp());
        $table = _DB_PREFIX_ . 'kdepo_rate_limit';

        // Tablo yoksa oluştur
        $db->execute(
            'CREATE TABLE IF NOT EXISTS `' . $table . '` (
                `ip_address` VARCHAR(45) NOT NULL,
                `request_time` DATETIME NOT NULL,
                INDEX `idx_ip_time` (`ip_address`, `request_time`)
            ) ENGINE=' . _MYSQL_ENGINE_ . ' DEFAULT CHARSET=utf8mb4'
        );

        // 1 dakikadan eski kayıtları temizle
        $db->execute(
            'DELETE FROM `' . $table . '` WHERE `request_time` < DATE_SUB(NOW(), INTERVAL 1 MINUTE)'
        );

        // Son 1 dakikadaki istek sayısını kontrol et
        $count = (int) $db->getValue(
            'SELECT COUNT(*) FROM `' . $table . '` WHERE `ip_address` = \'' . $ip . '\' AND `request_time` > DATE_SUB(NOW(), INTERVAL 1 MINUTE)'
        );

        if ($count >= self::$rateLimitPerMinute) {
            PrestaShopLogger::addLog(
                'kdepo_tahsilat: Rate limit aşıldı — IP: ' . $ip . ' (' . $count . ' istek/dk)',
                2, null, 'Kdepo_Tahsilat'
            );
            return false;
        }

        // Yeni istek kaydı ekle
        $db->insert('kdepo_rate_limit', [
            'ip_address'   => $ip,
            'request_time' => date('Y-m-d H:i:s'),
        ]);

        return true;
    }

    /**
     * İstemci IP adresini döndürür (proxy arkası desteği).
     */
    private function getClientIp(): string
    {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Standart ödeme (Auth) akışını işler.
     */
    private function handlePayment(array $data): void
    {
        // ── 1. İstek doğrulama ──────────────────────────────
        $validationErrors = $this->validateRequest($data);
        if (!empty($validationErrors)) {
            $this->jsonResponse(false, null, implode('; ', $validationErrors), 'VALIDATION_ERROR', 400);
            return;
        }

        // Kart bilgilerini geçici değişkenlere al
        $cardNumber  = (string) $data['cardNumber'];
        $expiryDate  = (string) $data['expiryDate'];
        $ccv         = (string) $data['ccv'];
        $amount      = (float)  $data['amount'];

        // ── 2. Sanal POS entegrasyonu ────────────────────────
        $posResult = $this->sendToVirtualPos($cardNumber, $expiryDate, $ccv, $amount);

        // Maskeli kart ve SKT yılını unset'ten önce hesapla
        $cleanCard = preg_replace('/[\s\-]/', '', $cardNumber);
        if (strlen($cleanCard) >= 10) {
            $data['maskedCard'] = substr($cleanCard, 0, 4) . ' ' . substr($cleanCard, 4, 2) . '** **** ' . substr($cleanCard, -4);
        } else {
            $data['maskedCard'] = '';
        }
        $expParts = explode('/', $expiryDate);
        if (count($expParts) >= 2) {
            $yr = trim($expParts[1]);
            $data['cardExpiryYear'] = strlen($yr) === 2 ? '20' . $yr : $yr;
        } else {
            $data['cardExpiryYear'] = '';
        }

        // Kart bilgilerini bellekten temizle
        unset($cardNumber, $expiryDate, $ccv);
        unset($data['cardNumber'], $data['expiryDate'], $data['ccv']);

        // ── 3. Sonucu işle ───────────────────────────────────
        if ($posResult['success']) {
            $this->handleSuccess($data, $amount, $posResult);
        } else {
            $this->handleFailure($data, $amount, $posResult);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Doğrulama
    // ═══════════════════════════════════════════════════════════

    /**
     * İstek gövdesini doğrular.
     *
     * @param array $data JSON gövdesi
     * @return string[] Hata mesajları (boş ise geçerli)
     */
    private function validateRequest(array $data): array
    {
        $errors = [];

        // Zorunlu alan kontrolü
        foreach (self::$requiredFields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $errors[] = "$field alanı zorunludur.";
            }
        }

        if (!empty($errors)) {
            return $errors;
        }

        // Kart numarası: 13-19 haneli sayısal + Luhn doğrulaması
        $cardNumber = (string) $data['cardNumber'];
        if (!preg_match('/^\d{13,19}$/', $cardNumber)) {
            $errors[] = 'Kart numarası 13-19 hane arasında sayısal olmalıdır.';
        } elseif (!$this->isValidLuhn($cardNumber)) {
            $errors[] = 'Kart numarası Luhn doğrulamasını geçemedi.';
        }

        // CCV: 3 veya 4 haneli sayısal (AMEX desteği)
        if (!preg_match('/^\d{3,4}$/', (string) $data['ccv'])) {
            $errors[] = 'CCV 3 veya 4 haneli sayısal olmalıdır.';
        }

        // Son kullanma tarihi: AA/YY formatı, ay 01-12
        $expiry = (string) $data['expiryDate'];
        if (!preg_match('/^(0[1-9]|1[0-2])\/\d{2}$/', $expiry)) {
            $errors[] = 'Son kullanma tarihi AA/YY formatında olmalıdır.';
        } else {
            // Format geçerli — ek tarih kontrolleri
            $parts       = explode('/', $expiry);
            $expiryMonth = (int) $parts[0];
            $expiryYear  = 2000 + (int) $parts[1]; // YY → 20YY

            // Süresi dolmuş kart kontrolü
            $currentMonth = (int) date('n');
            $currentYear  = (int) date('Y');
            if ($expiryYear < $currentYear || ($expiryYear === $currentYear && $expiryMonth < $currentMonth)) {
                $errors[] = 'Kartın son kullanma tarihi geçmiş';
            }

            // Üst limit kontrolü: 12/2060
            if ($expiryYear > 2060 || ($expiryYear === 2060 && $expiryMonth > 12)) {
                $errors[] = 'Son kullanma tarihi 12/2060\'ı geçemez';
            }
        }

        // Tutar: pozitif sayısal
        $amount = $data['amount'];
        if (!is_numeric($amount) || (float) $amount <= 0) {
            $errors[] = 'Tutar pozitif bir sayısal değer olmalıdır.';
        }

        // Tahsilat yapan kullanıcı ID: pozitif tam sayı
        if (!is_numeric($data['collectorUserId']) || (int) $data['collectorUserId'] <= 0) {
            $errors[] = 'Geçerli bir tahsilat yapan kullanıcı ID gereklidir.';
        }

        // Taksit: isteğe bağlı, varsa 0, 1 veya 2-12 arası tam sayı
        if (isset($data['instalment'])) {
            $instalment = $data['instalment'];
            if (!is_numeric($instalment) || (int) $instalment != $instalment || (int) $instalment < 0) {
                $errors[] = 'Taksit sayısı geçerli bir pozitif tam sayı olmalıdır.';
            } else {
                $instalmentInt = (int) $instalment;
                if ($instalmentInt !== 0 && $instalmentInt !== 1 && ($instalmentInt < 2 || $instalmentInt > 12)) {
                    $errors[] = 'Taksit sayısı 0, 1 veya 2-12 arasında olmalıdır.';
                }
            }
        }

        return $errors;
    }

    // ═══════════════════════════════════════════════════════════
    //  Luhn Doğrulama
    // ═══════════════════════════════════════════════════════════

    /**
     * Luhn algoritması ile kart numarasını doğrular.
     *
     * @param string $number Yalnızca rakamlardan oluşan kart numarası
     * @return bool Luhn doğrulaması geçtiyse true
     */
    private function isValidLuhn(string $number): bool
    {
        $sum = 0;
        $length = strlen($number);
        $parity = $length % 2;

        for ($i = 0; $i < $length; $i++) {
            $digit = (int) $number[$i];

            if ($i % 2 === $parity) {
                $digit *= 2;
                if ($digit > 9) {
                    $digit -= 9;
                }
            }

            $sum += $digit;
        }

        return $sum % 10 === 0;
    }

    // ═══════════════════════════════════════════════════════════
    //  Sanal POS
    // ═══════════════════════════════════════════════════════════

    /**
     * Kart bilgilerini Nestpay CC5AS XML API üzerinden sanal POS'a gönderir.
     *
     * @param string $cardNumber    13-19 haneli kart numarası
     * @param string $expiryDate    AA/YY
     * @param string $ccv           3-4 haneli CCV
     * @param float  $amount        Tutar
     * @param int|null $instalment  Taksit sayısı (2-12, null=tek çekim)
     * @param string $transactionType İşlem tipi (Auth, PreAuth)
     * @return array{success: bool, transactionId: string|null, authCode: string|null, hostRefNum: string|null, procReturnCode: string|null, errorCode: string|null, errorMessage: string|null}
     */
    private function sendToVirtualPos(
        string $cardNumber,
        string $expiryDate,
        string $ccv,
        float  $amount,
        ?int   $instalment = null,
        string $transactionType = 'Auth'
    ): array {
        // 1. Nestpay yapılandırmasını oku
        $nestpayName     = Configuration::get('KDEPO_NESTPAY_NAME');
        $nestpayPassword = Configuration::get('KDEPO_NESTPAY_PASSWORD');
        $nestpayClientId = Configuration::get('KDEPO_NESTPAY_CLIENT_ID');
        $testMode        = (bool) Configuration::get('KDEPO_POS_TEST_MODE');
        $urlTest         = Configuration::get('KDEPO_NESTPAY_API_URL_TEST');
        $urlProd         = Configuration::get('KDEPO_NESTPAY_API_URL_PROD');

        if (empty($nestpayName) || empty($nestpayPassword) || empty($nestpayClientId)) {
            return [
                'success'        => false,
                'transactionId'  => null,
                'authCode'       => null,
                'hostRefNum'     => null,
                'procReturnCode' => null,
                'errorCode'      => 'NESTPAY_NOT_CONFIGURED',
                'errorMessage'   => 'Nestpay yapılandırması eksik.',
            ];
        }

        // 2. Test moduna göre doğru URL'yi seç
        $apiUrl = $testMode ? $urlTest : $urlProd;

        if (empty($apiUrl)) {
            return [
                'success'        => false,
                'transactionId'  => null,
                'authCode'       => null,
                'hostRefNum'     => null,
                'procReturnCode' => null,
                'errorCode'      => 'NESTPAY_NOT_CONFIGURED',
                'errorMessage'   => 'Nestpay API URL yapılandırması bulunamadı.',
            ];
        }

        // 3. Son kullanma tarihini MM/YYYY formatına dönüştür
        try {
            $expiresFormatted = NestpayXmlBuilder::convertExpiryDate($expiryDate);
        } catch (\InvalidArgumentException $e) {
            return [
                'success'        => false,
                'transactionId'  => null,
                'authCode'       => null,
                'hostRefNum'     => null,
                'procReturnCode' => null,
                'errorCode'      => 'VALIDATION_ERROR',
                'errorMessage'   => $e->getMessage(),
            ];
        }

        // 4. CC5Request XML oluştur
        $orderId = NestpayXmlBuilder::generateOrderId();
        $builder = new NestpayXmlBuilder($nestpayName, $nestpayPassword, $nestpayClientId);
        $xmlContent = $builder->buildAuthRequest(
            $transactionType,
            $orderId,
            $amount,
            '949', // TRY
            $cardNumber,
            $expiresFormatted,
            $ccv,
            $instalment
        );

        // 5. cURL ile Nestpay API'ye XML POST gönder
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => 'DATA=' . urlencode($xmlContent),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/x-www-form-urlencoded',
            ],
            CURLOPT_SSLVERSION     => CURL_SSLVERSION_TLSv1_2,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response  = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError)) {
            return [
                'success'        => false,
                'transactionId'  => null,
                'authCode'       => null,
                'hostRefNum'     => null,
                'procReturnCode' => null,
                'errorCode'      => 'NESTPAY_CONNECTION_ERROR',
                'errorMessage'   => 'Nestpay bağlantı hatası: ' . $curlError,
            ];
        }

        // 6. CC5Response XML'i ayrıştır
        try {
            $parsed = NestpayXmlParser::parse($response);
        } catch (\InvalidArgumentException $e) {
            return [
                'success'        => false,
                'transactionId'  => null,
                'authCode'       => null,
                'hostRefNum'     => null,
                'procReturnCode' => null,
                'errorCode'      => 'NESTPAY_INVALID_RESPONSE',
                'errorMessage'   => 'Nestpay yanıtı ayrıştırılamadı: ' . $e->getMessage(),
            ];
        }

        // 7. Standart sonuç dizisi döndür
        return [
            'success'         => $parsed['success'],
            'transactionId'   => $parsed['transId'],
            'authCode'        => $parsed['authCode'],
            'hostRefNum'      => $parsed['hostRefNum'],
            'procReturnCode'  => $parsed['procReturnCode'],
            'transactionType' => $transactionType,
            'nestpayOrderId'  => $orderId,
            'errorCode'       => $parsed['success'] ? null : ($parsed['procReturnCode'] ?? 'NESTPAY_REJECTED'),
            'errorMessage'    => $parsed['success'] ? null : ($parsed['errMsg'] ?? 'Ödeme Nestpay tarafından reddedildi.'),
        ];
    }

    // ═══════════════════════════════════════════════════════════
    //  Başarılı / Başarısız İşlem
    // ═══════════════════════════════════════════════════════════

    /**
     * Başarılı ödeme: referans no oluştur, log yaz, e-posta gönder.
     */
    private function handleSuccess(array $data, float $amount, array $posResult): void
    {
        $referenceNumber = $this->generateReferenceNumber();

        // Log kaydı (Nestpay alanları dahil)
        $this->writeLog($data, $amount, 'success', $referenceNumber, null, null, $posResult);

        // PDF makbuzu oluştur
        $pdfData = [
            'status'            => 'success',
            'firstname'         => $data['firstName'] ?? '',
            'lastname'          => $data['lastName'] ?? '',
            'company_name'      => $data['companyName'] ?? '',
            'email'             => $data['email'] ?? '',
            'amount'            => number_format($amount, 2, ',', '.') . ' TL',
            'date'              => date('Y-m-d H:i:s'),
            'reference_number'  => $referenceNumber,
            'description'       => $data['description'] ?? '',
            'payer_name'        => $data['payerName'] ?? '',
            'payer_title'       => $data['payerTitle'] ?? '',
            'masked_card'       => $data['maskedCard'] ?? '',
            'card_bank'         => $data['cardBank'] ?? '',
            'card_brand'        => $data['cardBrand'] ?? '',
            'collector_user_id' => (string) ($data['collectorUserId'] ?? ''),
            'collector_name'    => ($data['collectorFirstName'] ?? '') . ' ' . ($data['collectorLastName'] ?? ''),
        ];
        $pdfInfo = PaymentPdfGenerator::generate($pdfData);

        // Müşteri e-postası (admin template + PDF ekli — aynı içerik)
        $customerEmail = $data['email'] ?? '';
        if (!empty($customerEmail)) {
            $pdfInfoCustomer = PaymentPdfGenerator::generate($pdfData);
            $this->sendAdminSuccessEmail($data, $amount, $referenceNumber, $pdfInfoCustomer, $customerEmail);
        }

        // Yönetici e-postası (PDF ekli)
        $pdfInfo2 = PaymentPdfGenerator::generate($pdfData);
        $this->sendAdminSuccessEmail($data, $amount, $referenceNumber, $pdfInfo2);

        $this->jsonResponse(true, $referenceNumber, null, null, 200, $posResult);
    }

    /**
     * Başarısız ödeme: log yaz, yönetici bildirim e-postası gönder, hata yanıtı dön.
     */
    private function handleFailure(array $data, float $amount, array $posResult): void
    {
        $errorCode    = $posResult['errorCode'] ?? 'UNKNOWN';
        $errorMessage = $posResult['errorMessage'] ?? 'Bilinmeyen hata.';

        // Log kaydı (Nestpay alanları dahil)
        $this->writeLog($data, $amount, 'failed', null, $errorCode, $errorMessage, $posResult);

        // PDF makbuzu oluştur
        $pdfData = [
            'status'            => 'failed',
            'firstname'         => $data['firstName'] ?? '',
            'lastname'          => $data['lastName'] ?? '',
            'company_name'      => $data['companyName'] ?? '',
            'email'             => $data['email'] ?? '',
            'amount'            => number_format($amount, 2, ',', '.') . ' TL',
            'date'              => date('Y-m-d H:i:s'),
            'reference_number'  => '',
            'description'       => $data['description'] ?? '',
            'error_code'        => $errorCode,
            'error_message'     => $errorMessage,
            'payer_name'        => $data['payerName'] ?? '',
            'payer_title'       => $data['payerTitle'] ?? '',
            'masked_card'       => $data['maskedCard'] ?? '',
            'card_bank'         => $data['cardBank'] ?? '',
            'card_brand'        => $data['cardBrand'] ?? '',
            'collector_user_id' => (string) ($data['collectorUserId'] ?? ''),
            'collector_name'    => ($data['collectorFirstName'] ?? '') . ' ' . ($data['collectorLastName'] ?? ''),
        ];
        $pdfInfo = PaymentPdfGenerator::generate($pdfData);

        // Yönetici bildirim e-postası (PDF ekli)
        $this->sendAdminFailureEmail($data, $amount, $errorCode, $errorMessage, $pdfInfo);

        $this->jsonResponse(false, null, $errorMessage, $errorCode, 400, $posResult);
    }

    // ═══════════════════════════════════════════════════════════
    //  Referans Numarası
    // ═══════════════════════════════════════════════════════════

    /**
     * Benzersiz referans numarası üretir.
     * Format: KDP-{timestamp}-{random}
     */
    private function generateReferenceNumber(): string
    {
        return 'KDP-' . time() . '-' . strtoupper(bin2hex(random_bytes(4)));
    }

    // ═══════════════════════════════════════════════════════════
    //  Log Kaydı
    // ═══════════════════════════════════════════════════════════

    /**
     * İşlem detaylarını ps_kdepo_payment_log tablosuna yazar.
     *
     * @param array       $data            İstek verileri
     * @param float       $amount          Tutar
     * @param string      $status          İşlem durumu (success, failed, voided, refunded)
     * @param string|null $referenceNumber Referans numarası
     * @param string|null $errorCode       Hata kodu
     * @param string|null $errorMessage    Hata mesajı
     * @param array       $posResult       Nestpay POS yanıt dizisi
     */
    private function writeLog(
        array   $data,
        float   $amount,
        string  $status,
        ?string $referenceNumber,
        ?string $errorCode,
        ?string $errorMessage,
        array   $posResult = []
    ): void {
        $db = Db::getInstance();

        // Duplikat kontrolü — aynı orderId ile kayıt varsa yazma
        $orderId = !empty($posResult['nestpayOrderId']) ? $posResult['nestpayOrderId'] : '';
        if ($orderId) {
            $existing = $db->getValue(
                'SELECT id_payment_log FROM `' . _DB_PREFIX_ . 'kdepo_payment_log` WHERE `nestpay_order_id` = \'' . pSQL($orderId) . '\''
            );
            if ($existing) return;
        }

        try {
            $db->insert('kdepo_payment_log', [
                'date_add'            => date('Y-m-d H:i:s'),
                'customer_firstname'  => pSQL($data['firstName'] ?? ''),
                'customer_lastname'   => pSQL($data['lastName'] ?? ''),
                'customer_email'      => pSQL($data['email'] ?? ''),
                'company_name'        => pSQL($data['companyName'] ?? ''),
                'amount'              => (float) $amount,
                'status'              => pSQL($status),
                'error_code'          => $errorCode ? pSQL($errorCode) : null,
                'error_message'       => $errorMessage ? pSQL($errorMessage) : null,
                'collector_user_id'   => (int) ($data['collectorUserId'] ?? 0),
                'collector_firstname' => pSQL($data['collectorFirstName'] ?? ''),
                'collector_lastname'  => pSQL($data['collectorLastName'] ?? ''),
                'reference_number'    => $referenceNumber ? pSQL($referenceNumber) : null,
                'description'         => pSQL($data['description'] ?? ''),
                'id_customer'         => isset($data['customerId']) ? (int) $data['customerId'] : null,
                // Nestpay alanları
                'auth_code'           => !empty($posResult['authCode']) ? pSQL($posResult['authCode']) : null,
                'host_ref_num'        => !empty($posResult['hostRefNum']) ? pSQL($posResult['hostRefNum']) : null,
                'trans_id'            => !empty($posResult['transactionId']) ? pSQL($posResult['transactionId']) : null,
                'proc_return_code'    => !empty($posResult['procReturnCode']) ? pSQL($posResult['procReturnCode']) : null,
                'transaction_type'    => !empty($posResult['transactionType']) ? pSQL($posResult['transactionType']) : null,
                'nestpay_order_id'    => !empty($posResult['nestpayOrderId']) ? pSQL($posResult['nestpayOrderId']) : null,
                'masked_card'         => !empty($data['maskedCard']) ? pSQL($data['maskedCard']) : null,
                'card_brand'          => !empty($data['cardBrand']) ? pSQL($data['cardBrand']) : null,
                'card_bank'           => !empty($data['cardBank']) ? pSQL($data['cardBank']) : null,
                'card_expiry_year'    => !empty($data['cardExpiryYear']) ? pSQL($data['cardExpiryYear']) : null,
            ]);
        } catch (\Exception $e) {
            PrestaShopLogger::addLog(
                'kdepo_tahsilat: Log yazma hatası — ' . $e->getMessage(),
                3,
                null,
                'Kdepo_Tahsilat'
            );
        }

        // Firebase Realtime Database'e yaz
        try {
            require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/FirebaseWriter.php';

            $firebase = new FirebaseWriter();
            $firebase->writePaymentLog([
                'orderId'           => $posResult['nestpayOrderId'] ?? '',
                'transId'           => $posResult['transactionId'] ?? '',
                'status'            => $status,
                'dateAdd'           => date('c'),
                'maskedCard'        => $data['maskedCard'] ?? '',
                'cardBrand'         => $data['cardBrand'] ?? '',
                'amount'            => (float) $amount,
                'authCode'          => $posResult['authCode'] ?? '',
                'customerEmail'     => $data['email'] ?? '',
                'cardBank'          => $data['cardBank'] ?? '',
                'cardExpiryYear'    => $data['cardExpiryYear'] ?? '',
                'customerFirstname' => $data['firstName'] ?? '',
                'customerLastname'  => $data['lastName'] ?? '',
                'companyName'       => $data['companyName'] ?? '',
                'referenceNumber'   => $referenceNumber ?? '',
                'description'       => $data['description'] ?? '',
                'procReturnCode'    => $posResult['procReturnCode'] ?? '',
                'hostRefNum'        => $posResult['hostRefNum'] ?? '',
                'transactionType'   => $posResult['transactionType'] ?? '',
                'errorCode'         => $errorCode ?? '',
                'errorMessage'      => $errorMessage ?? '',
                'collectorUserId'   => (int) ($data['collectorUserId'] ?? 0),
                'instalment'        => (int) ($data['instalment'] ?? 0),
            ]);
        } catch (\Exception $e) {
            PrestaShopLogger::addLog(
                'kdepo_tahsilat: Firebase yazma hatası — ' . $e->getMessage(),
                2,
                null,
                'Kdepo_Tahsilat'
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  İptal (Void), İade (Credit), PostAuth İşlemleri
    // ═══════════════════════════════════════════════════════════

    /**
     * İptal (Void) işlemini gerçekleştirir.
     * Orijinal OrderId ile Void CC5Request oluşturur ve Nestpay'e gönderir.
     */
    private function handleVoid(array $data): void
    {
        if (empty($data['orderId'])) {
            $this->jsonResponse(false, null, 'orderId alanı zorunludur.', 'VALIDATION_ERROR', 400);
            return;
        }

        $orderId = (string) $data['orderId'];
        $posResult = $this->sendOrderRequest('Void', $orderId);

        if ($posResult['success']) {
            $this->writeLog($data, 0, 'voided', null, null, null, $posResult);
            $this->jsonResponse(true, null, null, null, 200, $posResult);
        } else {
            $errorCode    = $posResult['errorCode'] ?? 'VOID_FAILED';
            $errorMessage = $posResult['errorMessage'] ?? 'İptal işlemi başarısız.';
            $this->writeLog($data, 0, 'failed', null, $errorCode, $errorMessage, $posResult);
            $this->jsonResponse(false, null, $errorMessage, $errorCode, 400, $posResult);
        }
    }

    /**
     * İade (Credit) işlemini gerçekleştirir.
     * Orijinal OrderId ve tutar ile Credit CC5Request oluşturur ve Nestpay'e gönderir.
     */
    private function handleCredit(array $data): void
    {
        if (empty($data['orderId'])) {
            $this->jsonResponse(false, null, 'orderId alanı zorunludur.', 'VALIDATION_ERROR', 400);
            return;
        }
        if (!isset($data['amount']) || !is_numeric($data['amount']) || (float) $data['amount'] <= 0) {
            $this->jsonResponse(false, null, 'Tutar pozitif bir sayısal değer olmalıdır.', 'VALIDATION_ERROR', 400);
            return;
        }

        $orderId = (string) $data['orderId'];
        $amount  = (float) $data['amount'];

        // Orijinal tutarı aşma kontrolü
        if (isset($data['originalAmount'])) {
            $originalAmount = (float) $data['originalAmount'];
            if ($amount > $originalAmount) {
                $this->jsonResponse(false, null, 'İade tutarı orijinal işlem tutarını aşamaz.', 'AMOUNT_EXCEEDED', 400);
                return;
            }
        }

        $posResult = $this->sendOrderRequest('Credit', $orderId, $amount);

        if ($posResult['success']) {
            $this->writeLog($data, $amount, 'refunded', null, null, null, $posResult);
            $this->jsonResponse(true, null, null, null, 200, $posResult);
        } else {
            $errorCode    = $posResult['errorCode'] ?? 'CREDIT_FAILED';
            $errorMessage = $posResult['errorMessage'] ?? 'İade işlemi başarısız.';
            $this->writeLog($data, $amount, 'failed', null, $errorCode, $errorMessage, $posResult);
            $this->jsonResponse(false, null, $errorMessage, $errorCode, 400, $posResult);
        }
    }

    /**
     * Ön otorizasyon kapama (PostAuth) işlemini gerçekleştirir.
     * Orijinal OrderId ve tutar ile PostAuth CC5Request oluşturur ve Nestpay'e gönderir.
     */
    private function handlePostAuth(array $data): void
    {
        if (empty($data['orderId'])) {
            $this->jsonResponse(false, null, 'orderId alanı zorunludur.', 'VALIDATION_ERROR', 400);
            return;
        }
        if (!isset($data['amount']) || !is_numeric($data['amount']) || (float) $data['amount'] <= 0) {
            $this->jsonResponse(false, null, 'Tutar pozitif bir sayısal değer olmalıdır.', 'VALIDATION_ERROR', 400);
            return;
        }

        $orderId = (string) $data['orderId'];
        $amount  = (float) $data['amount'];

        // Orijinal tutarı aşma kontrolü
        if (isset($data['originalAmount'])) {
            $originalAmount = (float) $data['originalAmount'];
            if ($amount > $originalAmount) {
                $this->jsonResponse(false, null, 'PostAuth tutarı orijinal işlem tutarını aşamaz.', 'AMOUNT_EXCEEDED', 400);
                return;
            }
        }

        $posResult = $this->sendOrderRequest('PostAuth', $orderId, $amount);

        if ($posResult['success']) {
            $this->writeLog($data, $amount, 'success', null, null, null, $posResult);
            $this->jsonResponse(true, null, null, null, 200, $posResult);
        } else {
            $errorCode    = $posResult['errorCode'] ?? 'POSTAUTH_FAILED';
            $errorMessage = $posResult['errorMessage'] ?? 'PostAuth işlemi başarısız.';
            $this->writeLog($data, $amount, 'failed', null, $errorCode, $errorMessage, $posResult);
            $this->jsonResponse(false, null, $errorMessage, $errorCode, 400, $posResult);
        }
    }

    /**
     * Kart bilgisi gerektirmeyen sipariş işlemlerini (Void, Credit, PostAuth) Nestpay'e gönderir.
     *
     * @param string     $type    İşlem tipi (Void, Credit, PostAuth)
     * @param string     $orderId Orijinal Nestpay OrderId
     * @param float|null $total   Tutar (Credit ve PostAuth için gerekli)
     * @return array Standart posResult dizisi
     */
    private function sendOrderRequest(string $type, string $orderId, ?float $total = null): array
    {
        // 1. Nestpay yapılandırmasını oku
        $nestpayName     = Configuration::get('KDEPO_NESTPAY_NAME');
        $nestpayPassword = Configuration::get('KDEPO_NESTPAY_PASSWORD');
        $nestpayClientId = Configuration::get('KDEPO_NESTPAY_CLIENT_ID');
        $testMode        = (bool) Configuration::get('KDEPO_POS_TEST_MODE');
        $urlTest         = Configuration::get('KDEPO_NESTPAY_API_URL_TEST');
        $urlProd         = Configuration::get('KDEPO_NESTPAY_API_URL_PROD');

        if (empty($nestpayName) || empty($nestpayPassword) || empty($nestpayClientId)) {
            return [
                'success'         => false,
                'transactionId'   => null,
                'authCode'        => null,
                'hostRefNum'      => null,
                'procReturnCode'  => null,
                'transactionType' => $type,
                'nestpayOrderId'  => $orderId,
                'errorCode'       => 'NESTPAY_NOT_CONFIGURED',
                'errorMessage'    => 'Nestpay yapılandırması eksik.',
            ];
        }

        // 2. Test moduna göre doğru URL'yi seç
        $apiUrl = $testMode ? $urlTest : $urlProd;

        if (empty($apiUrl)) {
            return [
                'success'         => false,
                'transactionId'   => null,
                'authCode'        => null,
                'hostRefNum'      => null,
                'procReturnCode'  => null,
                'transactionType' => $type,
                'nestpayOrderId'  => $orderId,
                'errorCode'       => 'NESTPAY_NOT_CONFIGURED',
                'errorMessage'    => 'Nestpay API URL yapılandırması bulunamadı.',
            ];
        }

        // 3. CC5Request XML oluştur (kart bilgisi gerektirmez)
        $builder = new NestpayXmlBuilder($nestpayName, $nestpayPassword, $nestpayClientId);
        $xmlContent = $builder->buildOrderRequest($type, $orderId, $total);

        // 4. cURL ile Nestpay API'ye XML POST gönder
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => 'DATA=' . urlencode($xmlContent),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/x-www-form-urlencoded',
            ],
            CURLOPT_SSLVERSION     => CURL_SSLVERSION_TLSv1_2,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response  = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError)) {
            return [
                'success'         => false,
                'transactionId'   => null,
                'authCode'        => null,
                'hostRefNum'      => null,
                'procReturnCode'  => null,
                'transactionType' => $type,
                'nestpayOrderId'  => $orderId,
                'errorCode'       => 'NESTPAY_CONNECTION_ERROR',
                'errorMessage'    => 'Nestpay bağlantı hatası: ' . $curlError,
            ];
        }

        // 5. CC5Response XML'i ayrıştır
        try {
            $parsed = NestpayXmlParser::parse($response);
        } catch (\InvalidArgumentException $e) {
            return [
                'success'         => false,
                'transactionId'   => null,
                'authCode'        => null,
                'hostRefNum'      => null,
                'procReturnCode'  => null,
                'transactionType' => $type,
                'nestpayOrderId'  => $orderId,
                'errorCode'       => 'NESTPAY_INVALID_RESPONSE',
                'errorMessage'    => 'Nestpay yanıtı ayrıştırılamadı: ' . $e->getMessage(),
            ];
        }

        // 6. Standart sonuç dizisi döndür
        return [
            'success'         => $parsed['success'],
            'transactionId'   => $parsed['transId'],
            'authCode'        => $parsed['authCode'],
            'hostRefNum'      => $parsed['hostRefNum'],
            'procReturnCode'  => $parsed['procReturnCode'],
            'transactionType' => $type,
            'nestpayOrderId'  => $orderId,
            'errorCode'       => $parsed['success'] ? null : ($parsed['procReturnCode'] ?? 'NESTPAY_REJECTED'),
            'errorMessage'    => $parsed['success'] ? null : ($parsed['errMsg'] ?? 'İşlem Nestpay tarafından reddedildi.'),
        ];
    }

    // ═══════════════════════════════════════════════════════════
    //  Sipariş Sorgulama
    // ═══════════════════════════════════════════════════════════

    /**
     * Sipariş durumu ve tarihçe sorgulama işlemini gerçekleştirir.
     * NestpayXmlBuilder::buildQueryRequest() ile sorgu XML'i oluşturur.
     */
    private function handleQuery(array $data): void
    {
        if (empty($data['orderId'])) {
            $this->jsonResponse(false, null, 'orderId alanı zorunludur.', 'VALIDATION_ERROR', 400);
            return;
        }

        $orderId     = (string) $data['orderId'];
        $withHistory = !empty($data['withHistory']);

        // 1. Nestpay yapılandırmasını oku
        $nestpayName     = Configuration::get('KDEPO_NESTPAY_NAME');
        $nestpayPassword = Configuration::get('KDEPO_NESTPAY_PASSWORD');
        $nestpayClientId = Configuration::get('KDEPO_NESTPAY_CLIENT_ID');
        $testMode        = (bool) Configuration::get('KDEPO_POS_TEST_MODE');
        $urlTest         = Configuration::get('KDEPO_NESTPAY_API_URL_TEST');
        $urlProd         = Configuration::get('KDEPO_NESTPAY_API_URL_PROD');

        if (empty($nestpayName) || empty($nestpayPassword) || empty($nestpayClientId)) {
            $this->jsonResponse(false, null, 'Nestpay yapılandırması eksik.', 'NESTPAY_NOT_CONFIGURED', 500);
            return;
        }

        $apiUrl = $testMode ? $urlTest : $urlProd;

        if (empty($apiUrl)) {
            $this->jsonResponse(false, null, 'Nestpay API URL yapılandırması bulunamadı.', 'NESTPAY_NOT_CONFIGURED', 500);
            return;
        }

        // 2. Sorgu XML'i oluştur
        $builder = new NestpayXmlBuilder($nestpayName, $nestpayPassword, $nestpayClientId);
        $xmlContent = $builder->buildQueryRequest($orderId, $withHistory);

        // 3. cURL ile Nestpay API'ye gönder
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => 'DATA=' . urlencode($xmlContent),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/x-www-form-urlencoded',
            ],
            CURLOPT_SSLVERSION     => CURL_SSLVERSION_TLSv1_2,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response  = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError)) {
            $this->jsonResponse(false, null, 'Nestpay bağlantı hatası: ' . $curlError, 'NESTPAY_CONNECTION_ERROR', 500);
            return;
        }

        // 4. Yanıtı ayrıştır
        try {
            $parsed = NestpayXmlParser::parse($response);
        } catch (\InvalidArgumentException $e) {
            $this->jsonResponse(false, null, 'Nestpay yanıtı ayrıştırılamadı: ' . $e->getMessage(), 'NESTPAY_INVALID_RESPONSE', 500);
            return;
        }

        // 5. Yapılandırılmış JSON yanıt döndür
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');

        $body = [
            'success'        => true,
            'orderId'        => $parsed['orderId'],
            'response'       => $parsed['response'],
            'procReturnCode' => $parsed['procReturnCode'],
            'authCode'       => $parsed['authCode'],
            'hostRefNum'     => $parsed['hostRefNum'],
            'transId'        => $parsed['transId'],
            'errMsg'         => $parsed['errMsg'],
        ];

        echo json_encode($body, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ═══════════════════════════════════════════════════════════
    //  E-posta Gönderimi
    // ═══════════════════════════════════════════════════════════

    /**
     * Müşteriye başarılı ödeme onay e-postası gönderir.
     */
    private function sendCustomerSuccessEmail(array $data, float $amount, string $referenceNumber, ?array $pdfInfo = null): void
    {
        $customerEmail = $data['email'] ?? null;
        if (empty($customerEmail)) {
            return;
        }

        $templateVars = [
            '{firstname}'        => $data['firstName'],
            '{lastname}'         => $data['lastName'],
            '{amount}'           => number_format($amount, 2, ',', '.') . ' TL',
            '{reference_number}' => $referenceNumber,
            '{date}'             => date('d.m.Y H:i'),
        ];

        $this->sendModuleEmail(
            $customerEmail,
            $data['firstName'] . ' ' . $data['lastName'],
            'payment_success_customer',
            'Kuşoğlu Gıda — Ödeme Onayı',
            $templateVars,
            $pdfInfo
        );
    }

    /**
     * Yöneticiye başarılı ödeme bilgi e-postası gönderir.
     */
    private function sendAdminSuccessEmail(array $data, float $amount, string $referenceNumber, ?array $pdfInfo = null, ?string $overrideTo = null): void
    {
        $templateVars = [
            '{firstname}'          => $data['firstName'],
            '{lastname}'           => $data['lastName'],
            '{company_name}'       => $data['companyName'],
            '{amount}'             => number_format($amount, 2, ',', '.') . ' TL',
            '{reference_number}'   => $referenceNumber,
            '{date}'               => date('d.m.Y H:i'),
            '{collector_user_id}'  => (string) $data['collectorUserId'],
            '{collector_name}'     => ($data['collectorFirstName'] ?? '') . ' ' . ($data['collectorLastName'] ?? ''),
        ];

        $toEmail = $overrideTo ?: $this->getNotificationEmail();
        $toName  = $overrideTo ? ($data['firstName'] . ' ' . $data['lastName']) : 'Kuşoğlu Gıda';
        $subject = $overrideTo ? 'Kuşoğlu Gıda — Ödeme Onayı' : 'Kuşoğlu Gıda — Başarılı Tahsilat Bildirimi';

        $this->sendModuleEmail(
            $toEmail,
            $toName,
            'payment_success_admin',
            $subject,
            $templateVars,
            $pdfInfo
        );
    }

    /**
     * Yöneticiye başarısız ödeme bildirim e-postası gönderir.
     */
    private function sendAdminFailureEmail(array $data, float $amount, string $errorCode, string $errorMessage, ?array $pdfInfo = null): void
    {
        $templateVars = [
            '{firstname}'          => $data['firstName'],
            '{lastname}'           => $data['lastName'],
            '{company_name}'       => $data['companyName'],
            '{amount}'             => number_format($amount, 2, ',', '.') . ' TL',
            '{date}'               => date('d.m.Y H:i'),
            '{error_code}'         => $errorCode,
            '{error_message}'      => $errorMessage,
            '{collector_user_id}'  => (string) $data['collectorUserId'],
            '{collector_name}'     => ($data['collectorFirstName'] ?? '') . ' ' . ($data['collectorLastName'] ?? ''),
        ];

        $adminEmail = $this->getNotificationEmail();

        $this->sendModuleEmail(
            $adminEmail,
            'Kuşoğlu Gıda',
            'payment_failed_admin',
            'Kuşoğlu Gıda — Başarısız Tahsilat Bildirimi',
            $templateVars,
            $pdfInfo
        );
    }

    /**
     * Bildirim e-posta adresini döndürür.
     * Yapılandırmada özel adres varsa onu, yoksa mağaza e-postasını kullanır.
     */
    private function getNotificationEmail(): string
    {
        $email = Configuration::get('KDEPO_NOTIFICATION_EMAIL');

        if (!empty($email) && Validate::isEmail($email)) {
            return $email;
        }

        return Configuration::get('PS_SHOP_EMAIL');
    }

    /**
     * Modül e-posta şablonu ile e-posta gönderir.
     * Gönderim hatası oluşursa ayrı log kaydı oluşturur.
     */
    private function sendModuleEmail(
        string $to,
        string $toName,
        string $template,
        string $subject,
        array  $templateVars,
        ?array $pdfAttachment = null
    ): void {
        try {
            if (!isset($templateVars['{shop_name}'])) {
                $templateVars['{shop_name}'] = 'Kuşoğlu Gıda';
            }

            $mailDir = _PS_MODULE_DIR_ . 'kdepo_tahsilat/mails/';
            $ccRaw   = Configuration::get('KDEPO_NOTIFICATION_CC');
            $bccRaw  = Configuration::get('KDEPO_NOTIFICATION_BCC');

            // Dosya eki hazırla
            $fileAttachment = null;
            if ($pdfAttachment && !empty($pdfAttachment['path']) && file_exists($pdfAttachment['path'])) {
                $fileAttachment = [
                    'content' => file_get_contents($pdfAttachment['path']),
                    'name'    => $pdfAttachment['name'] ?? 'tahsilat-makbuzu.pdf',
                    'mime'    => $pdfAttachment['mime'] ?? 'application/pdf',
                ];
            }

            // Template HTML'ini oku ve değişkenleri yerleştir
            $htmlTemplate = Tools::file_get_contents($mailDir . 'tr/' . $template . '.html');
            foreach ($templateVars as $key => $val) {
                $htmlTemplate = str_replace($key, (string) $val, $htmlTemplate);
            }

            // SwiftMailer ile doğrudan gönder
            $smtpServer = Configuration::get('PS_MAIL_SERVER');
            $smtpPort   = Configuration::get('PS_MAIL_SMTP_PORT');
            $smtpEnc    = Configuration::get('PS_MAIL_SMTP_ENCRYPTION');
            $smtpUser   = Configuration::get('PS_MAIL_USER');
            $smtpPass   = Configuration::get('PS_MAIL_PASSWD');
            $fromEmail  = Configuration::get('PS_SHOP_EMAIL');
            $shopName   = 'Kuşoğlu Gıda';

            if (strtolower($smtpEnc ?: '') === 'off') $smtpEnc = false;

            if ($smtpServer && $smtpPort) {
                $transport = (new \Swift_SmtpTransport($smtpServer, (int)$smtpPort, $smtpEnc ?: null))
                    ->setUsername($smtpUser)
                    ->setPassword($smtpPass);
            } else {
                $transport = new \Swift_SendmailTransport();
            }

            $mailer  = new \Swift_Mailer($transport);
            $message = (new \Swift_Message())
                ->setSubject($subject)
                ->setFrom([$fromEmail => $shopName])
                ->setTo([$to => $toName])
                ->setBody($htmlTemplate, 'text/html', 'utf-8');

            if (!empty($bccRaw)) {
                foreach (array_map('trim', explode(',', $bccRaw)) as $bccAddr) {
                    if (Validate::isEmail($bccAddr)) {
                        $message->addBcc($bccAddr);
                    }
                }
            }

            // CC adresleri ana mesaja ekle (ayrı gönderim yerine)
            if (!empty($ccRaw)) {
                foreach (array_map('trim', explode(',', $ccRaw)) as $ccAddr) {
                    if (Validate::isEmail($ccAddr)) {
                        $message->addCc($ccAddr);
                    }
                }
            }

            // PDF eki ekle
            if ($fileAttachment) {
                $message->attach(
                    (new \Swift_Attachment())
                        ->setFilename($fileAttachment['name'])
                        ->setContentType($fileAttachment['mime'])
                        ->setBody($fileAttachment['content'])
                );
            }

            $sent = $mailer->send($message);

            // Geçici dosyayı temizle
            if ($pdfAttachment && !empty($pdfAttachment['path'])) {
                @unlink($pdfAttachment['path']);
            }

            if (!$sent) {
                $this->logEmailError($template, $to, 'SwiftMailer gönderim başarısız.');
            }
        } catch (\Exception $e) {
            $this->logEmailError($template, $to, $e->getMessage());
        }
    }

    /**
     * E-posta gönderim hatasını ayrı log kaydı olarak yazar.
     */
    private function logEmailError(string $template, string $to, string $error): void
    {
        PrestaShopLogger::addLog(
            sprintf('kdepo_tahsilat: E-posta gönderim hatası [%s → %s] — %s', $template, $to, $error),
            3,
            null,
            'Kdepo_Tahsilat'
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  3D Secure Callback İşleyicileri
    // ═══════════════════════════════════════════════════════════

    /**
     * 3D Secure başarılı ödeme sonrası log ve e-posta işlemleri.
     */
    private function handle3DComplete(array $data): void
    {
        $amount = (float) ($data['amount'] ?? 0);

        $posResult = [
            'success'         => true,
            'transactionId'   => $data['transactionId'] ?? null,
            'authCode'        => $data['authCode'] ?? null,
            'hostRefNum'      => $data['hostRefNum'] ?? null,
            'procReturnCode'  => $data['procReturnCode'] ?? null,
            'transactionType' => 'Auth',
            'nestpayOrderId'  => $data['orderId'] ?? null,
            'errorCode'       => null,
            'errorMessage'    => null,
        ];

        $this->handleSuccess($data, $amount, $posResult);
    }

    /**
     * 3D Secure başarısız ödeme log kaydı.
     */
    private function handle3DFail(array $data): void
    {
        $amount = (float) ($data['amount'] ?? 0);

        $posResult = [
            'success'         => false,
            'transactionId'   => null,
            'authCode'        => null,
            'hostRefNum'      => null,
            'procReturnCode'  => null,
            'transactionType' => 'Auth',
            'nestpayOrderId'  => $data['orderId'] ?? null,
            'errorCode'       => $data['errorCode'] ?? 'UNKNOWN',
            'errorMessage'    => $data['errorMessage'] ?? 'Bilinmeyen hata.',
        ];

        $this->handleFailure($data, $amount, $posResult);
    }

    /**
     * 3D Secure başlatma — Android ve diğer API istemcileri için.
     * Kart bilgilerini alır, 3D gate parametrelerini ve hash'i döner.
     */
    private function handle3DInit(array $data): void
    {
        // Doğrulama
        $errors = $this->validateRequest($data);
        if (!empty($errors)) {
            $this->jsonResponse(false, null, implode(' ', $errors), 'VALIDATION_ERROR', 400);
            return;
        }

        $clientId  = Configuration::get('KDEPO_NESTPAY_CLIENT_ID');
        $storeKey  = Configuration::get('KDEPO_NESTPAY_STORE_KEY');
        $gateUrl   = Configuration::get('KDEPO_NESTPAY_3D_GATE_URL');

        if (empty($clientId) || empty($storeKey) || empty($gateUrl)) {
            $this->jsonResponse(false, null, '3D Secure yapılandırması eksik.', 'CONFIG_ERROR', 500);
            return;
        }

        require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/NestpayXmlBuilder.php';

        $orderId    = NestpayXmlBuilder::generateOrderId();
        $rnd        = microtime(true) . mt_rand();
        $amount     = number_format((float) $data['amount'], 2, '.', '');
        $currency   = '949';
        $type       = 'Auth';
        $instalment = isset($data['instalment']) && (int) $data['instalment'] >= 2
            ? (string) (int) $data['instalment'] : '';

        $cardNumber = preg_replace('/[\s\-]/', '', $data['cardNumber']);
        $expiryDate = $data['expiryDate'];
        $expiryParts = explode('/', $expiryDate);
        $expMonth = $expiryParts[0];
        $expYear  = $expiryParts[1];
        $fullExpiryYear = strlen($expYear) === 2 ? '20' . $expYear : $expYear;
        $ccv      = $data['ccv'];

        $okUrl  = $this->context->link->getModuleLink('kdepo_tahsilat', 'payment3dcallback');
        $failUrl = $okUrl;

        $hash = NestpayXmlBuilder::calculate3DHash(
            $clientId, $orderId, $amount,
            $okUrl, $failUrl, $type, $instalment,
            $rnd, $storeKey, $currency
        );

        // Sipariş verilerini veritabanına kaydet (callback'te kullanmak için)
        // PCI-DSS: Kart numarası maskelenerek saklanır, tam numara DB'de tutulmaz
        $maskedCard = '';
        if (strlen($cardNumber) >= 10) {
            $maskedCard = substr($cardNumber, 0, 4) . ' ' . substr($cardNumber, 4, 2) . '** **** ' . substr($cardNumber, -4);
        }
        $orderDataJson = json_encode([
            'firstName'       => $data['firstName'] ?? '',
            'lastName'        => $data['lastName'] ?? '',
            'companyName'     => $data['companyName'] ?? '',
            'address'         => $data['address'] ?? '',
            'email'           => $data['email'] ?? '',
            'amount'          => $amount,
            'description'     => $data['description'] ?? '',
            'instalment'      => (int) ($data['instalment'] ?? 0),
            'collectorUserId' => (int) ($data['collectorUserId'] ?? 0),
            'customerId'      => (int) ($data['customerId'] ?? 0),
            'orderId'         => $orderId,
            'payerName'       => $data['payerName'] ?? '',
            'payerTitle'      => $data['payerTitle'] ?? '',
            'maskedCard'      => $maskedCard,
            'cardBank'        => $data['cardBank'] ?? '',
            'cardBrand'       => $data['cardBrand'] ?? '',
            'cardExpiryYear'  => $fullExpiryYear,
        ]);
        $this->save3DOrderData($orderId, $orderDataJson);

        // 3D gate parametrelerini döndür
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success'  => true,
            'gateUrl'  => $gateUrl,
            'orderId'  => $orderId,
            'formFields' => [
                'clientid'        => $clientId,
                'storetype'       => '3d_pay',
                'hash'            => $hash,
                'hashAlgorithm'   => 'ver2',
                'islemtipi'       => $type,
                'amount'          => $amount,
                'currency'        => $currency,
                'oid'             => $orderId,
                'okUrl'           => $okUrl,
                'failUrl'         => $failUrl,
                'lang'            => 'tr',
                'rnd'             => $rnd,
                'pan'             => $cardNumber,
                'Ecom_Payment_Card_ExpDate_Month' => $expMonth,
                'Ecom_Payment_Card_ExpDate_Year'  => $expYear,
                'cv2'             => $ccv,
                'firmaadi'        => $data['companyName'] ?? '',
                'Email'           => $data['email'] ?? '',
                'taksit'          => $instalment,
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ═══════════════════════════════════════════════════════════
    //  Yardımcılar
    // ═══════════════════════════════════════════════════════════

    /**
     * 3D sipariş verilerini veritabanına kaydet.
     */
    private function save3DOrderData($orderId, $jsonData)
    {
        // Tablo yoksa oluştur
        $sql = 'CREATE TABLE IF NOT EXISTS `' . _DB_PREFIX_ . 'kdepo_3d_temp` (
            `order_id` VARCHAR(64) NOT NULL,
            `order_data` TEXT NOT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`order_id`)
        ) ENGINE=' . _MYSQL_ENGINE_ . ' DEFAULT CHARSET=utf8mb4';
        Db::getInstance()->execute($sql);

        // Eski kayıtları temizle (15 dakikadan eski)
        Db::getInstance()->execute(
            'DELETE FROM `' . _DB_PREFIX_ . 'kdepo_3d_temp` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 15 MINUTE)'
        );

        // Kaydet
        Db::getInstance()->insert('kdepo_3d_temp', [
            'order_id'   => pSQL($orderId),
            'order_data' => pSQL($jsonData),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * TLS bağlantısı kontrolü.
     */
    private function isSecureConnection(): bool
    {
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }
        // Reverse proxy / load balancer arkasında
        if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
            return true;
        }
        return false;
    }

    /**
     * Ödeme loglarını listeler.
     * Opsiyonel filtreler: limit, offset, status, search
     */
    private function handleList(array $data): void
    {
        $limit  = isset($data['limit']) ? min((int) $data['limit'], 500) : 100;
        $offset = isset($data['offset']) ? (int) $data['offset'] : 0;
        $status = isset($data['status']) ? pSQL($data['status']) : '';
        $search = isset($data['search']) ? pSQL($data['search']) : '';

        $where = '1=1';
        if ($status && in_array($status, ['success', 'failed', 'voided', 'refunded'])) {
            $where .= " AND a.`status` = '" . $status . "'";
        }
        if ($search) {
            $where .= " AND (a.`customer_firstname` LIKE '%" . $search . "%'"
                . " OR a.`customer_lastname` LIKE '%" . $search . "%'"
                . " OR a.`company_name` LIKE '%" . $search . "%'"
                . " OR a.`reference_number` LIKE '%" . $search . "%'"
                . " OR a.`nestpay_order_id` LIKE '%" . $search . "%'"
                . " OR a.`masked_card` LIKE '%" . $search . "%'"
                . " OR a.`card_bank` LIKE '%" . $search . "%'"
                . " OR a.`description` LIKE '%" . $search . "%')";
        }

        $db = Db::getInstance();

        $total = (int) $db->getValue(
            'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'kdepo_payment_log` a WHERE ' . $where
        );

        $rows = $db->executeS(
            'SELECT * FROM `' . _DB_PREFIX_ . 'kdepo_payment_log` a WHERE ' . $where
            . ' ORDER BY a.`date_add` DESC LIMIT ' . (int) $offset . ', ' . (int) $limit
        );

        $logs = [];
        foreach ($rows as $row) {
            $logs[] = [
                'id'                => (int) $row['id_payment_log'],
                'orderId'           => $row['nestpay_order_id'] ?? '',
                'transId'           => $row['trans_id'] ?? '',
                'status'            => $row['status'],
                'dateAdd'           => $row['date_add'],
                'maskedCard'        => $row['masked_card'] ?? '',
                'cardBrand'         => $row['card_brand'] ?? '',
                'cardBank'          => $row['card_bank'] ?? '',
                'cardExpiryYear'    => $row['card_expiry_year'] ?? '',
                'amount'            => (float) $row['amount'],
                'authCode'          => $row['auth_code'] ?? '',
                'hostRefNum'        => $row['host_ref_num'] ?? '',
                'procReturnCode'    => $row['proc_return_code'] ?? '',
                'transactionType'   => $row['transaction_type'] ?? '',
                'customerEmail'     => $row['customer_email'] ?? '',
                'customerFirstname' => $row['customer_firstname'],
                'customerLastname'  => $row['customer_lastname'],
                'companyName'       => $row['company_name'],
                'referenceNumber'   => $row['reference_number'] ?? '',
                'description'       => $row['description'] ?? '',
                'errorCode'         => $row['error_code'] ?? '',
                'errorMessage'      => $row['error_message'] ?? '',
                'collectorUserId'   => (int) ($row['collector_user_id'] ?? 0),
                'instalment'        => 0,
            ];
        }

        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'total'   => $total,
            'logs'    => $logs,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Standart JSON yanıt döndürür ve çalışmayı sonlandırır.
     *
     * @param bool        $success         İşlem başarılı mı
     * @param string|null $referenceNumber Referans numarası
     * @param string|null $errorMessage    Hata mesajı
     * @param string|null $errorCode       Hata kodu
     * @param int         $httpCode        HTTP durum kodu
     * @param array       $posResult       Nestpay POS yanıt dizisi (opsiyonel)
     */
    private function jsonResponse(
        bool    $success,
        ?string $referenceNumber,
        ?string $errorMessage,
        ?string $errorCode,
        int     $httpCode = 200,
        array   $posResult = []
    ): void {
        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');

        $body = ['success' => $success];

        if ($referenceNumber !== null) {
            $body['referenceNumber'] = $referenceNumber;
        }
        if ($errorMessage !== null) {
            $body['errorMessage'] = $errorMessage;
        }
        if ($errorCode !== null) {
            $body['errorCode'] = $errorCode;
        }

        // Nestpay'e özel alanlar (geriye dönük uyumluluk korunur)
        if (!empty($posResult['authCode'])) {
            $body['authCode'] = $posResult['authCode'];
        }
        if (!empty($posResult['hostRefNum'])) {
            $body['hostRefNum'] = $posResult['hostRefNum'];
        }
        if (!empty($posResult['transactionId'])) {
            $body['transId'] = $posResult['transactionId'];
        }
        if (!empty($posResult['procReturnCode'])) {
            $body['procReturnCode'] = $posResult['procReturnCode'];
        }

        echo json_encode($body, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
