<?php
/**
 * 3D Secure Callback Controller (3d_pay modeli)
 *
 * Banka 3D doğrulamasından sonra bu controller'a POST yapar.
 * 3d_pay modelinde banka hem 3D doğrulamayı hem provizyonu kendisi yapar.
 * Callback'te sadece hash doğrulaması ve sonuç kontrolü yapılır.
 *
 * URL: http(s)://site.com/module/kdepo_tahsilat/payment3dcallback
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/EventLogger.php';

class Kdepo_TahsilatPayment3dcallbackModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirectToPaymentWithError('Geçersiz istek.');
            return;
        }

        $this->process3DCallback();
    }

    private function process3DCallback()
    {
        $debugMode = false; // Canlıda false yapın
        $debugLog = [];

        // 3D yanıt parametrelerini oku
        $mdStatus       = Tools::getValue('mdStatus');
        $md             = Tools::getValue('md');
        $eci            = Tools::getValue('eci');
        $cavv           = Tools::getValue('cavv');
        $oid            = Tools::getValue('oid');
        $authCode       = Tools::getValue('AuthCode');
        $procReturnCode = Tools::getValue('ProcReturnCode');
        $response       = Tools::getValue('Response');
        $errMsg         = Tools::getValue('ErrMsg');
        $transId        = Tools::getValue('TransId');
        $hostRefNum     = Tools::getValue('HostRefNum');
        $hashParams     = Tools::getValue('HASHPARAMS');
        $hashParamsVal  = Tools::getValue('HASHPARAMSVAL');
        $hash           = Tools::getValue('HASH');

        $debugLog[] = ['title' => 'Banka 3D_PAY Yanıt Parametreleri', 'data' => [
            'mdStatus' => $mdStatus,
            'Response' => $response,
            'ProcReturnCode' => $procReturnCode,
            'AuthCode' => $authCode,
            'TransId' => $transId,
            'HostRefNum' => $hostRefNum,
            'eci' => $eci,
            'cavv' => $cavv ? substr($cavv, 0, 20) . '...' : '(boş)',
            'md' => $md ? substr($md, 0, 20) . '...' : '(boş)',
            'oid' => $oid,
            'ErrMsg' => $errMsg,
            'HASHPARAMS' => $hashParams,
            'HASH' => $hash ? substr($hash, 0, 30) . '...' : '(boş)',
        ]];

        // Tüm POST parametrelerini logla
        $allPost = [];
        foreach ($_POST as $k => $v) {
            if (in_array(strtolower($k), ['pan', 'cv2', 'cardnumber'])) {
                $allPost[$k] = '***GİZLİ***';
            } else {
                $allPost[$k] = is_string($v) && strlen($v) > 60 ? substr($v, 0, 60) . '...' : $v;
            }
        }
        $debugLog[] = ['title' => 'Tüm POST Parametreleri', 'data' => $allPost];

        // Veritabanından sipariş verilerini al
        if (empty($oid)) {
            $oid = '';
        }

        $row = Db::getInstance()->getRow(
            'SELECT `order_data` FROM `' . _DB_PREFIX_ . 'kdepo_3d_temp` WHERE `order_id` = \'' . pSQL($oid) . '\''
        );

        $debugLog[] = ['title' => 'DB Sipariş Verisi Kontrolü', 'data' => [
            'oid' => $oid,
            'DB tablo' => _DB_PREFIX_ . 'kdepo_3d_temp',
            'Sonuç' => !empty($row) ? 'BULUNDU (' . strlen($row['order_data']) . ' byte)' : 'BULUNAMADI',
        ]];

        if (empty($row) || empty($row['order_data'])) {
            $debugLog[] = ['title' => '❌ HATA', 'data' => ['Mesaj' => 'Oturum bilgisi bulunamadı. oid=' . $oid]];
            if ($debugMode) { $this->renderDebugScreen($debugLog); return; }
            $this->redirectToPaymentWithError('Oturum bilgisi bulunamadı. Lütfen tekrar deneyiniz.');
            return;
        }
        $orderData = json_decode($row['order_data'], true);

        $debugLog[] = ['title' => 'Sipariş Verileri (JSON)', 'data' => [
            'firstName' => $orderData['firstName'] ?? '',
            'lastName' => $orderData['lastName'] ?? '',
            'email' => $orderData['email'] ?? '',
            'amount' => $orderData['amount'] ?? '',
            'orderId' => $orderData['orderId'] ?? '',
        ]];

        // Event log: 3D callback geldi
        EventLogger::log([
            'session_id'   => $oid,
            'event_type'   => '3d_callback',
            'card_last4'   => substr($orderData['maskedCard'] ?? '', -4),
            'card_holder'  => ($orderData['firstName'] ?? '') . ' ' . ($orderData['lastName'] ?? ''),
            'card_bank'    => $orderData['cardBank'] ?? '',
            'card_brand'   => $orderData['cardBrand'] ?? '',
            'amount'       => $orderData['amount'] ?? 0,
            'company_name' => $orderData['companyName'] ?? '',
            'payer_name'   => $orderData['payerName'] ?? '',
            'email'        => $orderData['email'] ?? '',
            'status'       => $response ?: $mdStatus,
            'extra_data'   => ['mdStatus' => $mdStatus, 'Response' => $response, 'ProcReturnCode' => $procReturnCode],
        ]);

        // Firebase: processing olarak güncelle
        try {
            require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/FirebaseWriter.php';
            $fb = new FirebaseWriter();
            $fb->updatePaymentLog($oid, [
                'status'    => 'processing',
                'mdStatus'  => $mdStatus,
                'response3d' => $response ?: '',
            ]);
        } catch (\Exception $e) { }

        // Debug modda kaydı silme
        if (!$debugMode) {
            Db::getInstance()->execute(
                'DELETE FROM `' . _DB_PREFIX_ . 'kdepo_3d_temp` WHERE `order_id` = \'' . pSQL($oid) . '\''
            );
        }

        // Yapılandırmayı oku
        $storeKey = Configuration::get('KDEPO_NESTPAY_STORE_KEY');
        $clientId = Configuration::get('KDEPO_NESTPAY_CLIENT_ID');

        $debugLog[] = ['title' => 'NestPay Yapılandırma', 'data' => [
            'clientId' => $clientId ?: '(boş)',
            'storeKey' => $storeKey ? substr($storeKey, 0, 4) . '***' : '(boş)',
            'model' => '3d_pay (provizyon bankada otomatik)',
        ]];

        // 1. Banka hash doğrulaması (hash varsa kontrol et, yoksa atla)
        $hashValid = true;
        if (!empty($hashParams) && !empty($hash)) {
            $hashValid = $this->verifyBankHash($hashParams, $hashParamsVal, $hash, $storeKey);
        }

        $debugLog[] = ['title' => 'Hash Doğrulama', 'data' => [
            'HASHPARAMS' => $hashParams ?: '(boş — banka hash göndermedi, atlanıyor)',
            'Banka HASH' => $hash ? substr($hash, 0, 40) . '...' : '(boş)',
            'Eşleşme' => empty($hashParams) ? '⚠️ HASH YOK — ATLANDI' : ($hashValid ? '✅ BAŞARILI' : '❌ BAŞARISIZ'),
        ]];

        if (!$hashValid) {
            $debugLog[] = ['title' => '❌ HASH DOĞRULAMA BAŞARISIZ', 'data' => ['Aksiyon' => 'İşlem durduruldu']];
            if ($debugMode) { $this->renderDebugScreen($debugLog); return; }
            $this->logAndRedirect($orderData, 'HASH_MISMATCH', '3D Secure hash doğrulaması başarısız.');
            return;
        }

        // 2. mdStatus kontrolü
        $mdValid = in_array($mdStatus, ['1', '2', '3', '4']);
        $debugLog[] = ['title' => 'mdStatus Kontrolü', 'data' => [
            'mdStatus' => $mdStatus ?: '(boş)',
            'Sonuç' => $mdValid ? '✅ BAŞARILI' : '❌ BAŞARISIZ',
            'ErrMsg' => $errMsg ?: '(yok)',
        ]];

        if (!$mdValid) {
            $errorMsg2 = !empty($errMsg) ? $errMsg : '3D Secure doğrulaması başarısız (mdStatus: ' . $mdStatus . ').';
            $debugLog[] = ['title' => '❌ 3D DOĞRULAMA BAŞARISIZ', 'data' => ['Hata' => $errorMsg2]];
            if ($debugMode) { $this->renderDebugScreen($debugLog); return; }
            $this->logAndRedirect($orderData, '3D_AUTH_FAILED', $errorMsg2);
            return;
        }

        // 3. 3d_pay modelinde provizyon sonucu doğrudan callback'te gelir
        $paymentSuccess = ($response === 'Approved' && $procReturnCode === '00');

        $debugLog[] = ['title' => '3D_PAY Provizyon Sonucu (Banka Otomatik)', 'data' => [
            'Response' => $response ?: '(boş)',
            'ProcReturnCode' => $procReturnCode ?: '(boş)',
            'AuthCode' => $authCode ?: '(yok)',
            'TransId' => $transId ?: '(yok)',
            'HostRefNum' => $hostRefNum ?: '(yok)',
            'Sonuç' => $paymentSuccess ? '✅ BAŞARILI' : '❌ BAŞARISIZ',
            'ErrMsg' => $errMsg ?: '(yok)',
        ]];

        if ($debugMode) {
            $this->renderDebugScreen($debugLog);
            return;
        }

        if ($paymentSuccess) {
            $provisionResult = [
                'success'        => true,
                'transactionId'  => $transId,
                'authCode'       => $authCode,
                'hostRefNum'     => $hostRefNum,
                'procReturnCode' => $procReturnCode,
            ];
            $this->handleSuccessViaApi($orderData, $provisionResult);
        } else {
            $errorMessage = !empty($errMsg) ? $errMsg : 'Ödeme reddedildi (ProcReturnCode: ' . $procReturnCode . ').';
            $this->logAndRedirect($orderData, $procReturnCode ?: 'REJECTED', $errorMessage);
        }
    }

    /**
     * Debug bilgilerini ekrana render eder.
     */
    private function renderDebugScreen(array $debugLog)
    {
        $html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
        $html .= '<title>3D Callback Debug</title>';
        $html .= '<style>';
        $html .= 'body{font-family:monospace;background:#1e1e1e;color:#d4d4d4;padding:20px;font-size:13px;line-height:1.6;}';
        $html .= '.section{background:#2d2d2d;padding:15px;border-radius:5px;margin-bottom:15px;}';
        $html .= '.section h3{color:#c586c0;margin:0 0 10px 0;font-size:14px;}';
        $html .= '.ok{color:#4ec9b0;}.err{color:#f44747;}.info{color:#569cd6;}.warn{color:#dcdcaa;}';
        $html .= 'table{border-collapse:collapse;width:100%;}';
        $html .= 'td{padding:3px 10px;border-bottom:1px solid #3c3c3c;vertical-align:top;}';
        $html .= 'td:first-child{color:#9cdcfe;white-space:nowrap;width:200px;}';
        $html .= '</style></head><body>';
        $html .= '<h2 style="color:#c586c0;border-bottom:1px solid #444;padding-bottom:8px;">3D Callback Debug Ekrani (3d_pay modeli)</h2>';

        foreach ($debugLog as $section) {
            $html .= '<div class="section"><h3>' . htmlspecialchars($section['title']) . '</h3><table>';
            foreach ($section['data'] as $key => $value) {
                $valueStr = htmlspecialchars((string) $value);
                if (strpos($valueStr, '✅') !== false || strpos((string)$value, '✅') !== false) {
                    $valueStr = '<span class="ok">' . $valueStr . '</span>';
                } elseif (strpos($valueStr, '❌') !== false || strpos((string)$value, '❌') !== false) {
                    $valueStr = '<span class="err">' . $valueStr . '</span>';
                } elseif ($valueStr === '(boş)' || $valueStr === '(yok)') {
                    $valueStr = '<span class="warn">' . $valueStr . '</span>';
                }
                $html .= '<tr><td>' . htmlspecialchars($key) . '</td><td>' . $valueStr . '</td></tr>';
            }
            $html .= '</table></div>';
        }

        $html .= '<p style="color:#888;margin-top:20px;">Debug modu acik. Yonlendirme devre disi. Canliya gecerken $debugMode = false yapin.</p>';
        $html .= '</body></html>';

        echo $html;
        exit;
    }

    /**
     * Banka'dan dönen HASH'i doğrular (NestPay ver2 callback hash).
     */
    private function verifyBankHash($hashParams, $hashParamsVal, $hash, $storeKey)
    {
        if (empty($hashParams) || empty($hash)) {
            return false;
        }

        // NestPay ver2: HASHPARAMS'taki parametre isimlerini | ile ayır
        $paramsArr = explode('|', $hashParams);
        $hashVal = '';
        foreach ($paramsArr as $param) {
            $param = trim($param);
            if (!empty($param)) {
                $val = (string) Tools::getValue($param);
                $val = str_replace('|', '\\|', str_replace('\\', '\\\\', $val));
                $hashVal .= $val . '|';
            }
        }
        // Store key'i escape edip ekle (son | zaten var)
        $escapedStoreKey = str_replace('|', '\\|', str_replace('\\', '\\\\', $storeKey));
        $hashVal .= $escapedStoreKey;

        $calculatedHash = base64_encode(pack('H*', hash('sha512', $hashVal)));

        return ($calculatedHash === $hash);
    }

    /**
     * Başarılı ödemeyi paymentapi üzerinden logla ve kullanıcıyı yönlendir.
     */
    private function handleSuccessViaApi($orderData, $provisionResult)
    {
        $apiUrl = $this->context->link->getModuleLink('kdepo_tahsilat', 'paymentapi');

        // Internal secret — paymentapi'nin 3d_complete/3d_fail isteklerini doğrulaması için
        $internalSecret = Configuration::get('KDEPO_INTERNAL_3D_SECRET');

        // payerName'i de API'ye gönder
        $data = [
            'action'          => '3d_complete',
            '_internalSecret' => $internalSecret,
            'firstName'       => $orderData['firstName'],
            'lastName'        => $orderData['lastName'],
            'companyName'     => $orderData['companyName'],
            'address'         => $orderData['address'] ?? '',
            'email'           => $orderData['email'],
            'amount'          => $orderData['amount'],
            'description'     => $orderData['description'] ?? '',
            'instalment'      => $orderData['instalment'],
            'collectorUserId' => $orderData['collectorUserId'],
            'customerId'      => $orderData['customerId'],
            'orderId'         => $orderData['orderId'],
            'transactionId'   => $provisionResult['transactionId'],
            'authCode'        => $provisionResult['authCode'],
            'hostRefNum'      => $provisionResult['hostRefNum'],
            'procReturnCode'  => $provisionResult['procReturnCode'],
            'payerName'       => $orderData['payerName'] ?? '',
            'cardBank'        => $orderData['cardBank'] ?? '',
            'cardBrand'       => $orderData['cardBrand'] ?? '',
        ];

        // Maskelenmiş kart bilgisi (artık temp tabloda düz kart numarası saklanmıyor)
        $maskedCard = $orderData['maskedCard'] ?? '';
        $data['maskedCard'] = $maskedCard;
        $data['cardExpiryYear'] = $orderData['cardExpiryYear'] ?? '';

        // API'ye gönder — log + email burada tetiklenir
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
        ]);
        $response = curl_exec($ch);
        $curlErr = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);
        $reference = (is_array($result) && !empty($result['referenceNumber']))
            ? $result['referenceNumber']
            : $orderData['orderId'];

        // API çağrısı başarısız olduysa doğrudan DB'ye log yaz (fallback)
        if (!is_array($result) || empty($result['success'])) {
            PrestaShopLogger::addLog(
                'kdepo_tahsilat: 3d_complete API hatasi (HTTP ' . $httpCode . '): ' . ($curlErr ?: substr($response ?: '', 0, 200)),
                2, null, 'Kdepo_Tahsilat'
            );
            // Fallback: doğrudan veritabanına yaz (duplikat kontrolü)
            try {
                // Aynı orderId ile kayıt var mı kontrol et
                $existing = Db::getInstance()->getValue(
                    'SELECT id_payment_log FROM `' . _DB_PREFIX_ . 'kdepo_payment_log` WHERE `nestpay_order_id` = \'' . pSQL($orderData['orderId'] ?? '') . '\''
                );
                if (!$existing) {
                    $reference = 'KDP-' . time() . '-' . strtoupper(bin2hex(random_bytes(4)));
                    Db::getInstance()->insert('kdepo_payment_log', [
                        'date_add'            => date('Y-m-d H:i:s'),
                        'customer_firstname'  => pSQL($orderData['firstName'] ?? ''),
                        'customer_lastname'   => pSQL($orderData['lastName'] ?? ''),
                        'customer_email'      => pSQL($orderData['email'] ?? ''),
                        'company_name'        => pSQL($orderData['companyName'] ?? ''),
                        'amount'              => (float) ($orderData['amount'] ?? 0),
                        'status'              => 'success',
                        'reference_number'    => pSQL($reference),
                        'description'         => pSQL($orderData['description'] ?? ''),
                        'collector_user_id'   => (int) ($orderData['collectorUserId'] ?? 0),
                        'masked_card'         => pSQL($maskedCard),
                        'card_bank'           => pSQL($orderData['cardBank'] ?? ''),
                        'card_brand'          => pSQL($orderData['cardBrand'] ?? ''),
                        'auth_code'           => pSQL($provisionResult['authCode'] ?? ''),
                        'host_ref_num'        => pSQL($provisionResult['hostRefNum'] ?? ''),
                        'trans_id'            => pSQL($provisionResult['transactionId'] ?? ''),
                        'proc_return_code'    => pSQL($provisionResult['procReturnCode'] ?? ''),
                        'transaction_type'    => 'Auth',
                        'nestpay_order_id'    => pSQL($orderData['orderId'] ?? ''),
                    ]);
                } else {
                    // Kayıt zaten var — referans numarasını al
                    $reference = Db::getInstance()->getValue(
                        'SELECT reference_number FROM `' . _DB_PREFIX_ . 'kdepo_payment_log` WHERE `id_payment_log` = ' . (int) $existing
                    ) ?: $orderData['orderId'];
                }
            } catch (\Exception $e) {
                PrestaShopLogger::addLog(
                    'kdepo_tahsilat: Fallback log yazma hatasi — ' . $e->getMessage(),
                    3, null, 'Kdepo_Tahsilat'
                );
            }
        }

        // Event log: ödeme başarılı
        EventLogger::log([
            'session_id'       => $orderData['orderId'] ?? $oid ?? '',
            'event_type'       => 'payment_success',
            'card_last4'       => substr($maskedCard, -4),
            'card_holder'      => ($orderData['firstName'] ?? '') . ' ' . ($orderData['lastName'] ?? ''),
            'card_bank'        => $orderData['cardBank'] ?? '',
            'card_brand'       => $orderData['cardBrand'] ?? '',
            'amount'           => $orderData['amount'] ?? 0,
            'company_name'     => $orderData['companyName'] ?? '',
            'payer_name'       => $orderData['payerName'] ?? '',
            'email'            => $orderData['email'] ?? '',
            'status'           => 'success',
            'reference_number' => $reference,
        ]);

        // Firebase: success olarak güncelle
        try {
            $fb = new FirebaseWriter();
            $fb->updatePaymentLog($orderData['orderId'] ?? $oid, [
                'status'          => 'success',
                'referenceNumber' => $reference,
                'authCode'        => $provisionResult['authCode'] ?? '',
                'hostRefNum'      => $provisionResult['hostRefNum'] ?? '',
                'transId'         => $provisionResult['transactionId'] ?? '',
                'procReturnCode'  => $provisionResult['procReturnCode'] ?? '',
                'transactionType' => 'Auth',
            ]);
        } catch (\Exception $e) { }

        // Başarı sayfasına yönlendir — sadece ref parametresi, geri kalanı DB'den çekilecek
        $paymentUrl = $this->context->link->getModuleLink('kdepo_tahsilat', 'payment');
        Tools::redirect($paymentUrl . '?3d_result=success&ref=' . urlencode($reference));
    }

    /**
     * Hata durumunda log yaz ve kullanıcıyı hata sayfasına yönlendir.
     */
    private function logAndRedirect($orderData, $errorCode, $errorMessage)
    {
        $apiUrl = $this->context->link->getModuleLink('kdepo_tahsilat', 'paymentapi');

        // Internal secret — paymentapi'nin 3d_fail isteklerini doğrulaması için
        $internalSecret = Configuration::get('KDEPO_INTERNAL_3D_SECRET');

        $data = [
            'action'          => '3d_fail',
            '_internalSecret' => $internalSecret,
            'firstName'       => $orderData['firstName'] ?? '',
            'lastName'        => $orderData['lastName'] ?? '',
            'companyName'     => $orderData['companyName'] ?? '',
            'address'         => $orderData['address'] ?? '',
            'email'           => $orderData['email'] ?? '',
            'amount'          => $orderData['amount'] ?? '0',
            'description'     => $orderData['description'] ?? '',
            'instalment'      => $orderData['instalment'] ?? 0,
            'collectorUserId' => $orderData['collectorUserId'] ?? 0,
            'customerId'      => $orderData['customerId'] ?? 0,
            'orderId'         => $orderData['orderId'] ?? '',
            'errorCode'       => $errorCode,
            'errorMessage'    => $errorMessage,
            'maskedCard'      => '',
            'cardBank'        => $orderData['cardBank'] ?? '',
            'cardBrand'       => $orderData['cardBrand'] ?? '',
            'cardExpiryYear'  => $orderData['cardExpiryYear'] ?? '',
        ];

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
        ]);
        curl_exec($ch);
        curl_close($ch);

        // Event log: ödeme başarısız
        EventLogger::log([
            'session_id'    => $orderData['orderId'] ?? '',
            'event_type'    => 'payment_failed',
            'card_holder'   => ($orderData['firstName'] ?? '') . ' ' . ($orderData['lastName'] ?? ''),
            'card_bank'     => $orderData['cardBank'] ?? '',
            'card_brand'    => $orderData['cardBrand'] ?? '',
            'amount'        => $orderData['amount'] ?? 0,
            'company_name'  => $orderData['companyName'] ?? '',
            'payer_name'    => $orderData['payerName'] ?? '',
            'email'         => $orderData['email'] ?? '',
            'status'        => 'failed',
            'error_message' => $errorMessage,
        ]);

        // Firebase: failed olarak güncelle
        try {
            $fb = new FirebaseWriter();
            $fb->updatePaymentLog($orderData['orderId'] ?? '', [
                'status'       => 'failed',
                'errorCode'    => $errorCode,
                'errorMessage' => $errorMessage,
            ]);
        } catch (\Exception $e) { }

        $paymentUrl = $this->context->link->getModuleLink('kdepo_tahsilat', 'payment');
        Tools::redirect($paymentUrl . '?3d_result=fail&error=' . urlencode($errorMessage));
    }

    private function redirectToPaymentWithError($message)
    {
        $paymentUrl = $this->context->link->getModuleLink('kdepo_tahsilat', 'payment');
        Tools::redirect($paymentUrl . '?3d_result=fail&error=' . urlencode($message));
    }
}
