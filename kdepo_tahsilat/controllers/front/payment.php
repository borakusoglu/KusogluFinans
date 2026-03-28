<?php
/**
 * Ödeme Tahsilat Formu — 3D Secure akışı ile ödeme sayfası.
 *
 * GET  → Formu gösterir
 * POST → Formu doğrular, 3D Secure gate'e yönlendirir
 *
 * URL: http(s)://site.com/module/kdepo_tahsilat/payment
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/NestpayXmlBuilder.php';
require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/EventLogger.php';

class Kdepo_TahsilatPaymentModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();

        // 3D Secure callback sonuçlarını kontrol et (query param ile gelir)
        $threeDResult = Tools::getValue('3d_result');
        if ($threeDResult === 'success') {
            $reference = strip_tags(Tools::getValue('ref'));

            // Ödeme bilgilerini DB'den çek
            $row = Db::getInstance()->getRow(
                'SELECT * FROM `' . _DB_PREFIX_ . 'kdepo_payment_log` WHERE `reference_number` = \'' . pSQL($reference) . '\''
            );

            if ($row) {
                $amount = number_format((float) $row['amount'], 2, ',', '.');
                $this->context->smarty->assign([
                    'firstname'        => $row['customer_firstname'],
                    'lastname'         => $row['customer_lastname'],
                    'email'            => $row['customer_email'] ?? '',
                    'company'          => $row['company_name'],
                    'payer_name'       => $row['customer_firstname'] . ' ' . $row['customer_lastname'],
                    'payment_url'      => $this->context->link->getModuleLink('kdepo_tahsilat', 'payment'),
                    'errors'           => [],
                    'success'          => true,
                    'reference'        => $reference,
                    'error_message'    => '',
                    'transaction_date' => $row['date_add'],
                    'amount'           => $amount,
                    'masked_card'      => $row['masked_card'] ?? '',
                    'card_bank'        => $row['card_bank'] ?? '',
                    'card_brand'       => $row['card_brand'] ?? '',
                ]);
            } else {
                // DB'de kayıt yoksa minimal bilgi göster
                $this->context->smarty->assign([
                    'firstname'        => '',
                    'lastname'         => '',
                    'email'            => '',
                    'company'          => '',
                    'payer_name'       => '',
                    'payment_url'      => $this->context->link->getModuleLink('kdepo_tahsilat', 'payment'),
                    'errors'           => [],
                    'success'          => true,
                    'reference'        => $reference ?: '',
                    'error_message'    => '',
                    'transaction_date' => date('Y-m-d H:i:s'),
                    'amount'           => '0,00',
                    'masked_card'      => '',
                    'card_bank'        => '',
                    'card_brand'       => '',
                ]);
            }
            $this->setTemplate('module:kdepo_tahsilat/views/templates/front/payment.tpl');
            return;
        }

        if ($threeDResult === 'fail') {
            $errorMsg = strip_tags(Tools::getValue('error'));

            $customer = $this->context->customer;
            $this->context->smarty->assign([
                'firstname'     => $customer && $customer->isLogged() ? $customer->firstname : '',
                'lastname'      => $customer && $customer->isLogged() ? $customer->lastname : '',
                'email'         => $customer && $customer->isLogged() ? $customer->email : '',
                'company'       => '',
                'payment_url'   => $this->context->link->getModuleLink('kdepo_tahsilat', 'payment'),
                'errors'        => [],
                'success'       => false,
                'reference'     => '',
                'error_message' => $errorMsg ?: 'Ödeme işlemi başarısız oldu.',
            ]);
            $this->setTemplate('module:kdepo_tahsilat/views/templates/front/payment.tpl');
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && Tools::isSubmit('submitKdepoPayment')) {
            $this->processPaymentForm();
            return;
        }

        $customer = $this->context->customer;

        $this->context->smarty->assign([
            'firstname'     => $customer && $customer->isLogged() ? $customer->firstname : '',
            'lastname'      => $customer && $customer->isLogged() ? $customer->lastname : '',
            'email'         => $customer && $customer->isLogged() ? $customer->email : '',
            'company'       => '',
            'payment_url'   => $this->context->link->getModuleLink('kdepo_tahsilat', 'payment'),
            'errors'        => [],
            'success'       => false,
            'reference'     => '',
            'error_message' => '',
            'token'         => $this->generateCsrfToken(),
        ]);

        $this->setTemplate('module:kdepo_tahsilat/views/templates/front/payment.tpl');
    }

    /**
     * CSRF token oluşturur ve PrestaShop cookie'sine kaydeder.
     */
    private function generateCsrfToken()
    {
        $token = bin2hex(random_bytes(32));
        $this->context->cookie->__set('kdepo_csrf_token', $token);
        $this->context->cookie->write();
        return $token;
    }

    /**
     * CSRF token doğrular.
     */
    private function validateCsrfToken()
    {
        $submittedToken = Tools::getValue('token');
        $sessionToken = $this->context->cookie->__get('kdepo_csrf_token');

        if (empty($submittedToken) || empty($sessionToken)) {
            return false;
        }

        // Token'ı kullandıktan sonra sil (replay attack önlemi)
        $this->context->cookie->__unset('kdepo_csrf_token');
        $this->context->cookie->write();

        return hash_equals($sessionToken, $submittedToken);
    }

    private function processPaymentForm()
    {
        // CSRF token doğrulaması
        if (!$this->validateCsrfToken()) {
            $this->context->smarty->assign([
                'firstname'     => '',
                'lastname'      => '',
                'email'         => '',
                'company'       => '',
                'payment_url'   => $this->context->link->getModuleLink('kdepo_tahsilat', 'payment'),
                'errors'        => [],
                'success'       => false,
                'reference'     => '',
                'error_message' => 'Güvenlik doğrulaması başarısız. Lütfen sayfayı yenileyip tekrar deneyiniz.',
                'token'         => $this->generateCsrfToken(),
            ]);
            $this->setTemplate('module:kdepo_tahsilat/views/templates/front/payment.tpl');
            return;
        }

        $errors = [];

        $firstName   = trim(Tools::getValue('firstname'));
        $lastName    = trim(Tools::getValue('lastname'));
        $companyName = trim(Tools::getValue('company'));
        $email       = trim(Tools::getValue('email'));
        $amount      = trim(Tools::getValue('amount'));
        $description = trim(Tools::getValue('description'));
        $payerName   = trim(Tools::getValue('payer_name'));
        $cardBank    = trim(Tools::getValue('card_bank'));
        $cardBrand   = trim(Tools::getValue('card_brand'));
        $cardNumber  = preg_replace('/[\s\-]/', '', Tools::getValue('cardNumber'));
        $expiryDate  = trim(Tools::getValue('expiryDate'));
        $ccv         = trim(Tools::getValue('ccv'));
        $instalment  = 1; // Tek çekim (default)

        if (empty($firstName)) $errors[] = 'Ad alanı zorunludur.';
        if (empty($lastName)) $errors[] = 'Soyad alanı zorunludur.';
        if (empty($companyName)) $errors[] = 'Şirket ismi zorunludur.';
        if (empty($email)) {
            $email = ''; // E-posta opsiyonel
        } elseif (!Validate::isEmail($email)) {
            $errors[] = 'Geçerli bir e-posta adresi giriniz.';
        }
        if (!is_numeric($amount) || (float) $amount <= 0) $errors[] = 'Geçerli bir tutar giriniz.';
        if (!preg_match('/^\d{13,19}$/', $cardNumber)) $errors[] = 'Kart numarası 13-19 haneli olmalıdır.';
        if (!preg_match('/^(0[1-9]|1[0-2])\/\d{2}$/', $expiryDate)) $errors[] = 'Son kullanma tarihi AA/YY formatında olmalıdır.';
        if (!preg_match('/^\d{3,4}$/', $ccv)) $errors[] = 'CCV 3 veya 4 haneli olmalıdır.';

        if (!empty($errors)) {
            $this->context->smarty->assign([
                'firstname'     => $firstName,
                'lastname'      => $lastName,
                'email'         => $email,
                'company'       => $companyName,
                'amount'        => $amount,
                'description'   => $description,
                'payment_url'   => $this->context->link->getModuleLink('kdepo_tahsilat', 'payment'),
                'errors'        => $errors,
                'success'       => false,
                'reference'     => '',
                'error_message' => '',
                'token'         => $this->generateCsrfToken(),
            ]);
            $this->setTemplate('module:kdepo_tahsilat/views/templates/front/payment.tpl');
            return;
        }

        // 3D Secure yapılandırmasını oku
        $clientId  = Configuration::get('KDEPO_NESTPAY_CLIENT_ID');
        $storeKey  = Configuration::get('KDEPO_NESTPAY_STORE_KEY');
        $nestpayName = Configuration::get('KDEPO_NESTPAY_NAME');
        $nestpayPass = Configuration::get('KDEPO_NESTPAY_PASSWORD');
        $gateUrl   = Configuration::get('KDEPO_NESTPAY_3D_GATE_URL');

        if (empty($clientId) || empty($storeKey) || empty($gateUrl)) {
            $this->context->smarty->assign([
                'firstname'     => $firstName,
                'lastname'      => $lastName,
                'email'         => $email,
                'company'       => $companyName,
                'amount'        => $amount,
                'description'   => $description,
                'payment_url'   => $this->context->link->getModuleLink('kdepo_tahsilat', 'payment'),
                'errors'        => [],
                'success'       => false,
                'reference'     => '',
                'error_message' => '3D Secure yapılandırması eksik. Lütfen yöneticiyle iletişime geçin.',
                'token'         => $this->generateCsrfToken(),
            ]);
            $this->setTemplate('module:kdepo_tahsilat/views/templates/front/payment.tpl');
            return;
        }

        // 3D Secure parametrelerini hazırla
        $orderId    = NestpayXmlBuilder::generateOrderId();
        $rnd        = microtime(true) . mt_rand();
        $amountFormatted = number_format((float) $amount, 2, '.', '');
        $currency   = '949'; // TRY
        $type       = 'Auth';
        $instalmentStr = ''; // Tek çekim (taksit kaldırıldı)

        // Son kullanma tarihini MM/YY formatından dönüştür
        $expiryParts = explode('/', $expiryDate);
        $expMonth = $expiryParts[0];
        $expYear  = $expiryParts[1];

        // Callback URL'leri
        $okUrl   = $this->context->link->getModuleLink('kdepo_tahsilat', 'payment3dcallback');
        $failUrl = $this->context->link->getModuleLink('kdepo_tahsilat', 'payment3dcallback');

        // HASH hesapla
        $hash = NestpayXmlBuilder::calculate3DHash(
            $clientId, $orderId, $amountFormatted,
            $okUrl, $failUrl, $type, $instalmentStr,
            $rnd, $storeKey, $currency
        );

        // Müşteri bilgilerini veritabanına kaydet (callback'te kullanmak için)
        $customer = $this->context->customer;
        $collectorUserId = $customer && $customer->isLogged() ? (int) $customer->id : 0;

        // Kart numarasını maskele — PCI-DSS uyumluluğu: tam kart numarası DB'de saklanmaz
        $maskedCard = '';
        if (strlen($cardNumber) >= 10) {
            $maskedCard = substr($cardNumber, 0, 4) . ' ' . substr($cardNumber, 4, 2) . '** **** ' . substr($cardNumber, -4);
        }

        $orderDataJson = json_encode([
            'firstName'       => $firstName,
            'lastName'        => $lastName,
            'companyName'     => $companyName,
            'address'         => '',
            'email'           => $email,
            'amount'          => $amountFormatted,
            'description'     => $description,
            'instalment'      => $instalment,
            'collectorUserId' => $collectorUserId,
            'customerId'      => $collectorUserId,
            'orderId'         => $orderId,
            'payerName'       => $payerName,
            'maskedCard'      => $maskedCard,
            'cardBank'        => $cardBank,
            'cardBrand'       => $cardBrand,
        ]);

        // Geçici 3D veri tablosuna kaydet
        $this->save3DOrderData($orderId, $orderDataJson);

        // Event log: form submit + 3D yönlendirme
        EventLogger::log([
            'session_id'   => $orderId,
            'event_type'   => 'form_submit',
            'card_last4'   => substr($cardNumber, -4),
            'card_holder'  => $firstName . ' ' . $lastName,
            'card_bank'    => $cardBank,
            'card_brand'   => $cardBrand,
            'amount'       => $amountFormatted,
            'company_name' => $companyName,
            'payer_name'   => $payerName,
            'email'        => $email,
            'status'       => '3d_redirect',
        ]);

        // Firebase: pending status ile realtime kayıt oluştur
        try {
            require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/FirebaseWriter.php';
            $fb = new FirebaseWriter();
            $fb->writePaymentLog([
                'orderId'           => $orderId,
                'status'            => 'pending',
                'dateAdd'           => date('c'),
                'amount'            => (float) $amountFormatted,
                'maskedCard'        => $maskedCard,
                'cardBrand'         => $cardBrand,
                'cardBank'          => $cardBank,
                'customerFirstname' => $firstName,
                'customerLastname'  => $lastName,
                'companyName'       => $companyName,
                'customerEmail'     => $email,
                'description'       => $description,
                'collectorUserId'   => $collectorUserId,
            ]);
        } catch (\Exception $e) {
            // Firebase hatası ödemeyi engellemez
        }

        // 3D Gate'e yönlendirme formu oluştur (auto-submit)
        $formFields = [
            'clientid'        => $clientId,
            'storetype'       => '3d_pay',
            'hash'            => $hash,
            'hashAlgorithm'   => 'ver2',
            'islemtipi'       => $type,
            'amount'          => $amountFormatted,
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
            'firmaadi'        => $companyName,
            'Email'           => $email,
            'taksit'          => $instalmentStr,
        ];

        // Auto-submit HTML formu render et
        $html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
        $html .= '<title>3D Secure Yönlendirme</title></head><body>';
        $html .= '<div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">';
        $html .= '<h3>3D Secure doğrulamasına yönlendiriliyorsunuz...</h3>';
        $html .= '<p>Lütfen bekleyiniz. Otomatik yönlendirme yapılmazsa aşağıdaki butona tıklayınız.</p>';
        $html .= '<form id="threedForm" method="POST" action="' . htmlspecialchars($gateUrl) . '">';
        foreach ($formFields as $key => $value) {
            $html .= '<input type="hidden" name="' . htmlspecialchars($key) . '" value="' . htmlspecialchars($value) . '" />';
        }
        $html .= '<button type="submit" style="padding:12px 30px;font-size:16px;cursor:pointer;">Devam Et</button>';
        $html .= '</form>';
        $html .= '<script>document.getElementById("threedForm").submit();</script>';
        $html .= '</div></body></html>';

        echo $html;
        exit;
    }

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
}
