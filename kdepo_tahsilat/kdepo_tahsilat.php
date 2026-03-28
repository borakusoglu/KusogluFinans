<?php
/**
 * K-Depo Tahsilat Modülü
 *
 * Ödeme tahsilat işlemlerini yöneten, loglayan ve e-posta bildirimi gönderen PrestaShop modülü.
 *
 * @author K-Depo
 * @version 1.0.0
 * @license MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class Kdepo_Tahsilat extends Module
{
    public function __construct()
    {
        $this->name = 'kdepo_tahsilat';
        $this->tab = 'payments_gateways';
        $this->version = '1.3.0';
        $this->author = 'K-Depo';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = ['min' => '1.7', 'max' => _PS_VERSION_];
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = $this->l('K-Depo Tahsilat');
        $this->description = $this->l('Ödeme tahsilat işlemlerini yönetir, loglar ve e-posta bildirimi gönderir.');
        $this->confirmUninstall = $this->l('Bu modülü kaldırmak istediğinizden emin misiniz? Tüm tahsilat logları silinecektir.');
    }

    /**
     * Modül kurulumu: tablo oluşturma, admin tab kaydı ve varsayılan yapılandırma.
     */
    public function install()
    {
        return parent::install()
            && $this->registerHook('moduleRoutes')
            && $this->registerHook('actionFrontControllerAfterInit')
            && $this->createPaymentLogTable()
            && $this->createEventLogTable()
            && $this->migratePaymentLogTable()
            && $this->installTab()
            && $this->installDefaultConfig();
    }

    /**
     * Modül sıfırlama: hook'ları yeniden kaydeder (upgrade senaryosu).
     */
    public function reset()
    {
        return parent::reset()
            && $this->registerHook('moduleRoutes')
            && $this->registerHook('actionFrontControllerAfterInit');
    }

    /**
     * Modül kaldırma: tablo silme, admin tab kaldırma ve yapılandırma temizleme.
     */
    public function uninstall()
    {
        return parent::uninstall()
            && $this->dropPaymentLogTable()
            && Db::getInstance()->execute('DROP TABLE IF EXISTS `' . _DB_PREFIX_ . 'kdepo_event_log`')
            && $this->uninstallTab()
            && $this->uninstallConfig();
    }

    /**
     * Varsayılan yapılandırma değerlerini kaydeder.
     */
    private function installDefaultConfig()
    {
        Configuration::updateValue('KDEPO_NESTPAY_NAME', '');
        Configuration::updateValue('KDEPO_NESTPAY_PASSWORD', '');
        Configuration::updateValue('KDEPO_NESTPAY_CLIENT_ID', '');
        Configuration::updateValue('KDEPO_NESTPAY_STORE_KEY', '');
        Configuration::updateValue('KDEPO_NESTPAY_API_URL_TEST', '');
        Configuration::updateValue('KDEPO_NESTPAY_API_URL_PROD', '');
        Configuration::updateValue('KDEPO_NESTPAY_3D_GATE_URL', '');
        Configuration::updateValue('KDEPO_POS_TEST_MODE', '1');
        Configuration::updateValue('KDEPO_NOTIFICATION_EMAIL', Configuration::get('PS_SHOP_EMAIL'));
        Configuration::updateValue('KDEPO_NOTIFICATION_CC', '');
        Configuration::updateValue('KDEPO_NOTIFICATION_BCC', '');

        // Güvenlik anahtarları — otomatik oluştur
        if (!Configuration::get('KDEPO_API_SECRET_KEY')) {
            Configuration::updateValue('KDEPO_API_SECRET_KEY', bin2hex(random_bytes(32)));
        }
        if (!Configuration::get('KDEPO_INTERNAL_3D_SECRET')) {
            Configuration::updateValue('KDEPO_INTERNAL_3D_SECRET', bin2hex(random_bytes(32)));
        }

        return true;
    }

    /**
     * Yapılandırma değerlerini siler.
     */
    private function uninstallConfig()
    {
        Configuration::deleteByName('KDEPO_NESTPAY_NAME');
        Configuration::deleteByName('KDEPO_NESTPAY_PASSWORD');
        Configuration::deleteByName('KDEPO_NESTPAY_CLIENT_ID');
        Configuration::deleteByName('KDEPO_NESTPAY_STORE_KEY');
        Configuration::deleteByName('KDEPO_NESTPAY_API_URL_TEST');
        Configuration::deleteByName('KDEPO_NESTPAY_API_URL_PROD');
        Configuration::deleteByName('KDEPO_NESTPAY_3D_GATE_URL');
        Configuration::deleteByName('KDEPO_POS_TEST_MODE');
        Configuration::deleteByName('KDEPO_NOTIFICATION_EMAIL');
        Configuration::deleteByName('KDEPO_NOTIFICATION_CC');
        Configuration::deleteByName('KDEPO_NOTIFICATION_BCC');
        Configuration::deleteByName('KDEPO_API_SECRET_KEY');
        Configuration::deleteByName('KDEPO_INTERNAL_3D_SECRET');

        return true;
    }

    // ═══════════════════════════════════════════════════════════
    //  URL Route (Friendly URL)
    // ═══════════════════════════════════════════════════════════

    /**
     * Site genelinde güvenlik header'larını ekler.
     * Strict-Transport-Security, Content-Security-Policy, X-Frame-Options vb.
     */
    public function hookActionFrontControllerAfterInit($params = [])
    {
        // Header'lar zaten gönderildiyse tekrar gönderme
        if (headers_sent()) {
            return;
        }

        // HSTS — 1 yıl, subdomain dahil
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');

        // Clickjacking koruması
        header('X-Frame-Options: SAMEORIGIN');

        // MIME sniffing koruması
        header('X-Content-Type-Options: nosniff');

        // XSS koruması (eski tarayıcılar için)
        header('X-XSS-Protection: 1; mode=block');

        // Referrer politikası
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Permissions Policy — gereksiz API'leri kapat
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)');

        // Content Security Policy
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://k-depo.com https://*.k-depo.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://k-depo.com https://static.cloudflareinsights.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://*.ziraatbank.com.tr https://*.asseco-see.com.tr; upgrade-insecure-requests;");

        // Cross-Origin politikaları
        header('Cross-Origin-Opener-Policy: same-origin');
        header('Cross-Origin-Resource-Policy: same-origin');

        // Cookie güvenliği — PHP session cookie'sine Secure + SameSite flag'leri ekle
        if (session_status() === PHP_SESSION_ACTIVE) {
            $cookieParams = session_get_cookie_params();
            if (!$cookieParams['secure'] || empty($cookieParams['samesite'])) {
                session_set_cookie_params([
                    'lifetime' => $cookieParams['lifetime'],
                    'path'     => $cookieParams['path'],
                    'domain'   => $cookieParams['domain'],
                    'secure'   => true,
                    'httponly'  => true,
                    'samesite'  => 'Lax',
                ]);
            }
        }
    }

    /**
     * /kusoglu-tahsilat → payment controller
     * /kusoglu-tahsilat-3d → payment3dcallback controller
     */
    public function hookModuleRoutes($params = [])
    {
        return [
            'module-kdepo_tahsilat-payment' => [
                'rule' => 'kusoglu-tahsilat',
                'keywords' => [],
                'controller' => 'payment',
                'params' => [
                    'fc' => 'module',
                    'module' => 'kdepo_tahsilat',
                ],
            ],
            'module-kdepo_tahsilat-payment3dcallback' => [
                'rule' => 'kusoglu-tahsilat-3d',
                'keywords' => [],
                'controller' => 'payment3dcallback',
                'params' => [
                    'fc' => 'module',
                    'module' => 'kdepo_tahsilat',
                ],
            ],
            'module-kdepo_tahsilat-receipt' => [
                'rule' => 'kusoglu-tahsilat-makbuz',
                'keywords' => [],
                'controller' => 'receipt',
                'params' => [
                    'fc' => 'module',
                    'module' => 'kdepo_tahsilat',
                ],
            ],
        ];
    }

    // ═══════════════════════════════════════════════════════════
    //  Yapılandırma Sayfası (Admin Panel)
    // ═══════════════════════════════════════════════════════════

    /**
     * Modül yapılandırma sayfası.
     * Admin panelde modülün yanındaki "Yapılandır" butonuna tıklayınca açılır.
     */
    public function getContent()
    {
        // moduleRoutes hook'u kayıtlı değilse otomatik kaydet
        if (!$this->isRegisteredInHook('moduleRoutes')) {
            try {
                $this->registerHook('moduleRoutes');
            } catch (\Exception $e) {
                // Hook zaten kayıtlı — sessizce atla
            }
        }
        // Security headers hook'u kayıtlı değilse otomatik kaydet
        if (!$this->isRegisteredInHook('actionFrontControllerAfterInit')) {
            try {
                $this->registerHook('actionFrontControllerAfterInit');
            } catch (\Exception $e) {
                // Hook zaten kayıtlı — sessizce atla
            }
        }

        // Event log tablosu ve tab'ı yoksa oluştur (upgrade senaryosu)
        $this->createEventLogTable();
        if (!(int) Tab::getIdFromClassName('AdminKdepoEventLog')) {
            $tab2 = new Tab();
            $tab2->active = 1;
            $tab2->class_name = 'AdminKdepoEventLog';
            $tab2->name = [];
            foreach (Language::getLanguages(true) as $lang) {
                $tab2->name[$lang['id_lang']] = 'Odeme Akis Loglari';
            }
            $tab2->id_parent = (int) Tab::getIdFromClassName('AdminParentPayment');
            $tab2->module = $this->name;
            try { $tab2->add(); } catch (\Exception $e) { }
        }

        $output = '<div class="alert alert-info">' . $this->l('Modül Versiyonu:') . ' <strong>' . $this->version . '</strong></div>';

        // POS ayarları formu gönderildi mi?
        if (Tools::isSubmit('submitKdepoTahsilatConfig')) {
            $nestpayName    = Tools::getValue('KDEPO_NESTPAY_NAME');
            $nestpayPass    = Tools::getValue('KDEPO_NESTPAY_PASSWORD');
            $nestpayClient  = Tools::getValue('KDEPO_NESTPAY_CLIENT_ID');
            $nestpayStoreKey = Tools::getValue('KDEPO_NESTPAY_STORE_KEY');
            $nestpayUrlTest = Tools::getValue('KDEPO_NESTPAY_API_URL_TEST');
            $nestpayUrlProd = Tools::getValue('KDEPO_NESTPAY_API_URL_PROD');
            $nestpay3dGate  = Tools::getValue('KDEPO_NESTPAY_3D_GATE_URL');
            $testMode       = Tools::getValue('KDEPO_POS_TEST_MODE');
            $notifEmail     = Tools::getValue('KDEPO_NOTIFICATION_EMAIL');
            $notifCc        = Tools::getValue('KDEPO_NOTIFICATION_CC');
            $notifBcc       = Tools::getValue('KDEPO_NOTIFICATION_BCC');

            if (!empty($notifEmail) && !Validate::isEmail($notifEmail)) {
                $output .= $this->displayError($this->l('Geçersiz e-posta adresi.'));
            } else {
                Configuration::updateValue('KDEPO_NESTPAY_NAME', $nestpayName);
                Configuration::updateValue('KDEPO_NESTPAY_PASSWORD', $nestpayPass);
                Configuration::updateValue('KDEPO_NESTPAY_CLIENT_ID', $nestpayClient);
                Configuration::updateValue('KDEPO_NESTPAY_STORE_KEY', $nestpayStoreKey);
                Configuration::updateValue('KDEPO_NESTPAY_API_URL_TEST', $nestpayUrlTest);
                Configuration::updateValue('KDEPO_NESTPAY_API_URL_PROD', $nestpayUrlProd);
                Configuration::updateValue('KDEPO_NESTPAY_3D_GATE_URL', $nestpay3dGate);
                Configuration::updateValue('KDEPO_POS_TEST_MODE', $testMode ? '1' : '0');
                Configuration::updateValue('KDEPO_NOTIFICATION_EMAIL', $notifEmail);
                Configuration::updateValue('KDEPO_NOTIFICATION_CC', $notifCc);
                Configuration::updateValue('KDEPO_NOTIFICATION_BCC', $notifBcc);

                $output .= $this->displayConfirmation($this->l('Ayarlar başarıyla kaydedildi.'));
            }
        }

        // E-posta şablonu kaydetme
        if (Tools::isSubmit('submitKdepoEmailTemplate')) {
            $output .= $this->saveEmailTemplate();
        }

        // Test e-posta gönderimi
        if (Tools::isSubmit('submitKdepoTestEmail')) {
            $output .= $this->sendTestEmail(Tools::getValue('test_email_type'));
        }

        // Logo yükleme
        if (Tools::isSubmit('submitKdepoLogo')) {
            $output .= $this->handleLogoUpload();
        }

        // Logo silme
        if (Tools::isSubmit('deleteKdepoLogo')) {
            $output .= $this->handleLogoDelete();
        }

        // API key yenileme
        if (Tools::isSubmit('regenerateKdepoApiKey')) {
            Configuration::updateValue('KDEPO_API_SECRET_KEY', bin2hex(random_bytes(32)));
            $output .= $this->displayConfirmation($this->l('API anahtarı yenilendi. Android uygulamasındaki anahtarı da güncellemeyi unutmayın.'));
        }
        if (Tools::isSubmit('regenerateKdepoInternalSecret')) {
            Configuration::updateValue('KDEPO_INTERNAL_3D_SECRET', bin2hex(random_bytes(32)));
            $output .= $this->displayConfirmation($this->l('Internal 3D secret yenilendi.'));
        }

        return $output . $this->renderConfigForm() . $this->renderSecurityPanel() . $this->renderLogoUploadPanel() . $this->renderTestEmailPanel() . $this->renderEmailPreviews() . $this->renderPasswordToggleScript();
    }


    /**
     * HelperForm ile yapılandırma formunu oluşturur.
     */
    private function renderConfigForm()
    {
        $fields_form = [
            'form' => [
                'legend' => [
                    'title' => $this->l('Nestpay Sanal POS Ayarları'),
                    'icon'  => 'icon-cogs',
                ],
                'input' => [
                    [
                        'type'     => 'switch',
                        'label'    => $this->l('Test Modu'),
                        'name'     => 'KDEPO_POS_TEST_MODE',
                        'desc'     => $this->l('Aktifken gerçek ödeme alınmaz, test ortamı kullanılır.'),
                        'is_bool'  => true,
                        'values'   => [
                            ['id' => 'active_on',  'value' => 1, 'label' => $this->l('Evet')],
                            ['id' => 'active_off', 'value' => 0, 'label' => $this->l('Hayır')],
                        ],
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('Nestpay Name'),
                        'name'     => 'KDEPO_NESTPAY_NAME',
                        'desc'     => $this->l('Nestpay API kullanıcı adı.'),
                        'size'     => 80,
                        'required' => true,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('Nestpay Password'),
                        'name'     => 'KDEPO_NESTPAY_PASSWORD',
                        'desc'     => $this->l('Nestpay API şifresi.'),
                        'size'     => 80,
                        'required' => true,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('Nestpay ClientId'),
                        'name'     => 'KDEPO_NESTPAY_CLIENT_ID',
                        'desc'     => $this->l('Nestpay mağaza kodu (ClientId / İşyeri Numarası).'),
                        'size'     => 40,
                        'required' => true,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('Store Key (3D Secure)'),
                        'name'     => 'KDEPO_NESTPAY_STORE_KEY',
                        'desc'     => $this->l('3D Secure doğrulama için Store Key. Banka tarafından sağlanır veya sanal POS panelinden oluşturulur.'),
                        'size'     => 80,
                        'required' => true,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('Test Ortamı URL'),
                        'name'     => 'KDEPO_NESTPAY_API_URL_TEST',
                        'desc'     => $this->l('Nestpay test ortamı API endpoint adresi.'),
                        'size'     => 80,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('Üretim Ortamı URL'),
                        'name'     => 'KDEPO_NESTPAY_API_URL_PROD',
                        'desc'     => $this->l('Nestpay üretim ortamı API endpoint adresi (non-3D XML API).'),
                        'size'     => 80,
                        'required' => true,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('3D Secure Gate URL'),
                        'name'     => 'KDEPO_NESTPAY_3D_GATE_URL',
                        'desc'     => $this->l('3D Secure yönlendirme adresi (örn: https://sanalpos2.ziraatbank.com.tr/fim/est3dgate).'),
                        'size'     => 80,
                        'required' => true,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('Bildirim E-postası'),
                        'name'     => 'KDEPO_NOTIFICATION_EMAIL',
                        'desc'     => $this->l('Başarısız işlem bildirimlerinin gönderileceği e-posta. Boş bırakılırsa mağaza e-postası kullanılır.'),
                        'size'     => 60,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('CC (Karbon Kopya)'),
                        'name'     => 'KDEPO_NOTIFICATION_CC',
                        'desc'     => $this->l('Bildirim e-postalarının CC olarak gönderileceği adresler. Birden fazla için virgülle ayırın.'),
                        'size'     => 80,
                    ],
                    [
                        'type'     => 'text',
                        'label'    => $this->l('BCC (Gizli Kopya)'),
                        'name'     => 'KDEPO_NOTIFICATION_BCC',
                        'desc'     => $this->l('Bildirim e-postalarının BCC olarak gönderileceği adresler. Birden fazla için virgülle ayırın.'),
                        'size'     => 80,
                    ],
                ],
                'submit' => [
                    'title' => $this->l('Kaydet'),
                ],
            ],
        ];

        $helper = new HelperForm();
        $helper->module          = $this;
        $helper->name_controller = $this->name;
        $helper->token           = Tools::getAdminTokenLite('AdminModules');
        $helper->currentIndex    = AdminController::$currentIndex . '&configure=' . $this->name;
        $helper->title           = $this->displayName;
        $helper->submit_action   = 'submitKdepoTahsilatConfig';

        // Mevcut değerleri doldur
        $helper->fields_value = [
            'KDEPO_POS_TEST_MODE'         => Configuration::get('KDEPO_POS_TEST_MODE'),
            'KDEPO_NESTPAY_NAME'          => Configuration::get('KDEPO_NESTPAY_NAME'),
            'KDEPO_NESTPAY_PASSWORD'      => Configuration::get('KDEPO_NESTPAY_PASSWORD'),
            'KDEPO_NESTPAY_CLIENT_ID'     => Configuration::get('KDEPO_NESTPAY_CLIENT_ID'),
            'KDEPO_NESTPAY_STORE_KEY'     => Configuration::get('KDEPO_NESTPAY_STORE_KEY'),
            'KDEPO_NESTPAY_API_URL_TEST'  => Configuration::get('KDEPO_NESTPAY_API_URL_TEST'),
            'KDEPO_NESTPAY_API_URL_PROD'  => Configuration::get('KDEPO_NESTPAY_API_URL_PROD'),
            'KDEPO_NESTPAY_3D_GATE_URL'   => Configuration::get('KDEPO_NESTPAY_3D_GATE_URL'),
            'KDEPO_NOTIFICATION_EMAIL'    => Configuration::get('KDEPO_NOTIFICATION_EMAIL'),
            'KDEPO_NOTIFICATION_CC'       => Configuration::get('KDEPO_NOTIFICATION_CC'),
            'KDEPO_NOTIFICATION_BCC'      => Configuration::get('KDEPO_NOTIFICATION_BCC'),
        ];

        return $helper->generateForm([$fields_form]);
    }

    /**
     * Güvenlik ayarları paneli — API key ve internal secret gösterimi/yenileme.
     */
    private function renderSecurityPanel()
    {
        try {
            $actionUrl = AdminController::$currentIndex . '&configure=' . $this->name . '&token=' . Tools::getAdminTokenLite('AdminModules');

            $apiKey = Configuration::get('KDEPO_API_SECRET_KEY');
            $internalSecret = Configuration::get('KDEPO_INTERNAL_3D_SECRET');

            // Henüz oluşturulmamışsa otomatik oluştur
            if (empty($apiKey)) {
                $apiKey = bin2hex(random_bytes(32));
                Configuration::updateValue('KDEPO_API_SECRET_KEY', $apiKey);
            }
            if (empty($internalSecret)) {
                $internalSecret = bin2hex(random_bytes(32));
                Configuration::updateValue('KDEPO_INTERNAL_3D_SECRET', $internalSecret);
            }

        $html = '<div class="panel" style="margin-top:20px;">';
        $html .= '<div class="panel-heading"><i class="icon-shield"></i> ' . $this->l('Güvenlik Ayarları') . '</div>';

        $html .= '<div class="alert alert-warning">';
        $html .= '<i class="icon-warning"></i> ' . $this->l('Bu anahtarları güvenli bir yerde saklayın. API anahtarı, Android uygulaması veya dış sistemlerin ödeme API sine erişmesi için gereklidir.');
        $html .= '</div>';

        // API Key
        $html .= '<div style="margin-bottom:15px;">';
        $html .= '<label><strong>' . $this->l('API Anahtarı (X-Api-Key)') . '</strong></label>';
        $html .= '<div style="display:flex;gap:10px;align-items:center;">';
        $html .= '<input type="text" value="' . htmlspecialchars($apiKey) . '" readonly style="flex:1;font-family:monospace;font-size:12px;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:4px;" />';
        $html .= '<form method="post" action="' . $actionUrl . '" style="display:inline;">';
        $html .= '<button type="submit" name="regenerateKdepoApiKey" class="btn btn-warning" onclick="return confirm(\'API anahtarini yenilemek istediginize emin misiniz?\');">';
        $html .= '<i class="icon-refresh"></i> ' . $this->l('Yenile') . '</button>';
        $html .= '</form></div>';
        $html .= '<p style="color:#888;font-size:11px;margin-top:4px;">' . $this->l('Android uygulaması veya dış sistemler bu anahtarı X-Api-Key headerında göndermelidir.') . '</p>';
        $html .= '</div>';

        // Internal 3D Secret
        $html .= '<div style="margin-bottom:10px;">';
        $html .= '<label><strong>' . $this->l('Internal 3D Secret') . '</strong></label>';
        $html .= '<div style="display:flex;gap:10px;align-items:center;">';
        $html .= '<input type="text" value="' . htmlspecialchars($internalSecret) . '" readonly style="flex:1;font-family:monospace;font-size:12px;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:4px;" />';
        $html .= '<form method="post" action="' . $actionUrl . '" style="display:inline;">';
        $html .= '<button type="submit" name="regenerateKdepoInternalSecret" class="btn btn-warning" onclick="return confirm(\'Internal secret i yenilemek istediginize emin misiniz?\');">';
        $html .= '<i class="icon-refresh"></i> ' . $this->l('Yenile') . '</button>';
        $html .= '</form></div>';
        $html .= '<p style="color:#888;font-size:11px;margin-top:4px;">' . $this->l('3D Secure callback ile API arasındaki iç iletişimi doğrular. Dışarıya paylaşmayın.') . '</p>';
        $html .= '</div>';

        $html .= '</div>';

        return $html;
        } catch (\Exception $e) {
            return '<div class="alert alert-danger">Guvenlik paneli yuklenemedi: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
    }

    /**
     * Logo yükleme paneli.
     */
    private function renderLogoUploadPanel()
    {
        $actionUrl = AdminController::$currentIndex . '&configure=' . $this->name . '&token=' . Tools::getAdminTokenLite('AdminModules');
        $logoPath = _PS_MODULE_DIR_ . $this->name . '/views/img/kusoglu-logo.png';
        $logoExists = file_exists($logoPath);
        $logoUrl = $logoExists
            ? _MODULE_DIR_ . $this->name . '/views/img/kusoglu-logo.png?t=' . filemtime($logoPath)
            : '';

        $html = '<div class="panel" style="margin-top:20px;">';
        $html .= '<div class="panel-heading"><i class="icon-picture-o"></i> ' . $this->l('Logo Ayarları') . '</div>';
        $html .= '<p style="color:#666;margin-bottom:15px;">' . $this->l('Ödeme onay sayfasında ve PDF makbuzunda görünecek logo. PNG formatında yükleyin.') . '</p>';

        if ($logoExists) {
            $html .= '<div style="margin-bottom:15px;padding:15px;background:#f9f9f9;border:1px solid #eee;border-radius:6px;text-align:center;">';
            $html .= '<img src="' . $logoUrl . '" alt="Logo" style="max-height:80px;max-width:300px;" />';
            $html .= '<p style="margin-top:8px;color:#888;font-size:12px;">Mevcut logo</p>';
            $html .= '</div>';
        }

        $html .= '<form method="post" action="' . $actionUrl . '" enctype="multipart/form-data">';
        $html .= '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">';
        $html .= '<input type="file" name="kdepo_logo" accept="image/png" style="flex:1;" />';
        $html .= '<button type="submit" name="submitKdepoLogo" class="btn btn-primary"><i class="icon-upload"></i> ' . $this->l('Logo Yükle') . '</button>';

        if ($logoExists) {
            $html .= '<button type="submit" name="deleteKdepoLogo" class="btn btn-danger" onclick="return confirm(\'' . $this->l('Logoyu silmek istediğinize emin misiniz?') . '\');"><i class="icon-trash"></i> ' . $this->l('Sil') . '</button>';
        }

        $html .= '</div></form></div>';

        return $html;
    }

    /**
     * Logo yükleme işlemi.
     */
    private function handleLogoUpload()
    {
        if (!isset($_FILES['kdepo_logo']) || $_FILES['kdepo_logo']['error'] !== UPLOAD_ERR_OK) {
            return $this->displayError($this->l('Logo dosyası seçilmedi veya yükleme hatası oluştu.'));
        }

        $file = $_FILES['kdepo_logo'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if ($ext !== 'png') {
            return $this->displayError($this->l('Sadece PNG formatı desteklenmektedir.'));
        }

        if ($file['size'] > 2 * 1024 * 1024) {
            return $this->displayError($this->l('Logo dosyası 2MB\'dan büyük olamaz.'));
        }

        $imgDir = _PS_MODULE_DIR_ . $this->name . '/views/img/';
        if (!is_dir($imgDir)) {
            @mkdir($imgDir, 0755, true);
        }

        $dest = $imgDir . 'kusoglu-logo.png';
        if (move_uploaded_file($file['tmp_name'], $dest)) {
            return $this->displayConfirmation($this->l('Logo başarıyla yüklendi.'));
        }

        return $this->displayError($this->l('Logo kaydedilemedi. Klasör yazma izinlerini kontrol edin.'));
    }

    /**
     * Logo silme işlemi.
     */
    private function handleLogoDelete()
    {
        $logoPath = _PS_MODULE_DIR_ . $this->name . '/views/img/kusoglu-logo.png';
        if (file_exists($logoPath) && @unlink($logoPath)) {
            return $this->displayConfirmation($this->l('Logo silindi.'));
        }
        return $this->displayError($this->l('Logo silinemedi.'));
    }

    /**
     * Test e-posta gönderim paneli.
     */
    private function renderTestEmailPanel()
    {
        $actionUrl = AdminController::$currentIndex . '&configure=' . $this->name . '&token=' . Tools::getAdminTokenLite('AdminModules');

        $html = '<div class="panel" style="margin-top:20px;">';
        $html .= '<div class="panel-heading"><i class="icon-paper-plane"></i> ' . $this->l('Test E-posta Gönderimi') . '</div>';
        $html .= '<p style="color:#666;margin-bottom:15px;">' . $this->l('Sahte verilerle test e-postası gönderir. E-posta, yapılandırmadaki bildirim adresine (+ CC/BCC) gönderilir.') . '</p>';
        $html .= '<div style="display:flex;gap:10px;flex-wrap:wrap;">';

        $buttons = [
            ['type' => 'customer_success', 'label' => 'Müşteri — Başarılı Ödeme',    'color' => '#4CAF50', 'icon' => 'icon-check'],
            ['type' => 'admin_success',    'label' => 'Yönetici — Başarılı Tahsilat', 'color' => '#2196F3', 'icon' => 'icon-info-circle'],
            ['type' => 'admin_failed',     'label' => 'Yönetici — Başarısız Tahsilat','color' => '#F44336', 'icon' => 'icon-warning'],
        ];

        foreach ($buttons as $btn) {
            $html .= '<form method="post" action="' . $actionUrl . '" style="display:inline;">';
            $html .= '<input type="hidden" name="test_email_type" value="' . $btn['type'] . '" />';
            $html .= '<button type="submit" name="submitKdepoTestEmail" class="btn btn-default" style="border-left:3px solid ' . $btn['color'] . ';">';
            $html .= '<i class="' . $btn['icon'] . '" style="color:' . $btn['color'] . ';"></i> ';
            $html .= $this->l($btn['label']);
            $html .= '</button></form>';
        }

        $html .= '</div></div>';

        return $html;
    }

    /**
     * Test e-postası gönderir.
     */
    private function sendTestEmail($type)
    {
        $mailDir = _PS_MODULE_DIR_ . $this->name . '/mails/';
        $shopName = 'Kuşoğlu Gıda';

        // Türkçe dil ID
        $idLang = (int) Configuration::get('PS_LANG_DEFAULT');
        $trLang = Db::getInstance()->getValue(
            "SELECT id_lang FROM " . _DB_PREFIX_ . "lang WHERE iso_code = 'tr' AND active = 1"
        );
        if ($trLang) {
            $idLang = (int) $trLang;
        }

        // Alıcı: bildirim e-postası
        $toEmail = Configuration::get('KDEPO_NOTIFICATION_EMAIL');
        if (empty($toEmail)) {
            $toEmail = Configuration::get('PS_SHOP_EMAIL');
        }

        // CC/BCC
        $bccRaw = Configuration::get('KDEPO_NOTIFICATION_BCC');

        $testData = [
            '{firstname}'          => 'Test',
            '{lastname}'           => 'Kullanıcı',
            '{company_name}'       => 'Test Şirketi A.Ş.',
            '{amount}'             => '1.250,00 TL',
            '{reference_number}'   => 'KDP-TEST-' . strtoupper(bin2hex(random_bytes(4))),
            '{date}'               => date('d.m.Y H:i'),
            '{error_code}'         => 'TEST_ERROR',
            '{error_message}'      => 'Bu bir test hata mesajıdır.',
            '{collector_user_id}'  => '1',
            '{collector_name}'     => 'Admin Kullanıcı',
            '{shop_name}'          => $shopName,
        ];

        $templates = [
            'customer_success' => ['tpl' => 'payment_success_customer', 'subject' => '[TEST] Kuşoğlu Gıda — Ödeme Onayı'],
            'admin_success'    => ['tpl' => 'payment_success_admin',    'subject' => '[TEST] Kuşoğlu Gıda — Başarılı Tahsilat Bildirimi'],
            'admin_failed'     => ['tpl' => 'payment_failed_admin',     'subject' => '[TEST] Kuşoğlu Gıda — Başarısız Tahsilat Bildirimi'],
        ];

        if (!isset($templates[$type])) {
            return $this->displayError($this->l('Geçersiz test tipi.'));
        }

        $tpl = $templates[$type];

        try {
            // Test PDF oluştur
            require_once _PS_MODULE_DIR_ . $this->name . '/classes/PaymentPdfGenerator.php';
            $pdfData = [
                'status'            => ($type === 'admin_failed') ? 'failed' : 'success',
                'firstname'         => 'Test',
                'lastname'          => 'Kullanıcı',
                'company_name'      => 'Test Şirketi A.Ş.',
                'email'             => $toEmail,
                'amount'            => '1.250,00 TL',
                'date'              => date('Y-m-d H:i:s'),
                'reference_number'  => $testData['{reference_number}'],
                'description'       => 'Test ödeme açıklaması',
                'error_code'        => 'TEST_ERROR',
                'error_message'     => 'Bu bir test hata mesajıdır.',
                'payer_name'        => 'Test Kullanıcı',
                'masked_card'       => '427311 *** 2858',
                'card_bank'         => 'QNB Finansbank',
                'card_brand'        => 'VISA',
                'collector_user_id' => '1',
                'collector_name'    => 'Admin Kullanıcı',
            ];
            $pdfInfo = PaymentPdfGenerator::generate($pdfData);

            $fileAttachment = null;
            if ($pdfInfo && !empty($pdfInfo['path']) && file_exists($pdfInfo['path'])) {
                $fileAttachment = [
                    'content' => file_get_contents($pdfInfo['path']),
                    'name'    => $pdfInfo['name'] ?? 'tahsilat-makbuzu-test.pdf',
                    'mime'    => $pdfInfo['mime'] ?? 'application/pdf',
                ];
            }

            // PDF durumu hakkında bilgi mesajı
            $pdfStatus = '';
            if ($pdfInfo) {
                $fileSize = !empty($pdfInfo['path']) && file_exists($pdfInfo['path'])
                    ? filesize($pdfInfo['path'])
                    : 0;
                $attachSize = $fileAttachment ? strlen($fileAttachment['content']) : 0;
                $pdfStatus = '✅ Makbuz oluşturuldu (' . ($pdfInfo['name'] ?? '?') . ', '
                    . round($fileSize / 1024, 1) . ' KB dosya, '
                    . round($attachSize / 1024, 1) . ' KB ek içerik)';
            } else {
                $pdfStatus = '⚠️ Makbuz oluşturulamadı. E-posta eki olmadan gönderilecek.';
            }

            // Template HTML'ini oku ve değişkenleri yerleştir
            $htmlTemplate = Tools::file_get_contents($mailDir . 'tr/' . $tpl['tpl'] . '.html');
            foreach ($testData as $key => $val) {
                $htmlTemplate = str_replace($key, $val, $htmlTemplate);
            }

            // SwiftMailer ile doğrudan gönder (PDF eki dahil)
            $sent = false;
            try {
                $smtpServer = Configuration::get('PS_MAIL_SERVER');
                $smtpPort   = Configuration::get('PS_MAIL_SMTP_PORT');
                $smtpEnc    = Configuration::get('PS_MAIL_SMTP_ENCRYPTION');
                $smtpUser   = Configuration::get('PS_MAIL_USER');
                $smtpPass   = Configuration::get('PS_MAIL_PASSWD');
                $fromEmail  = Configuration::get('PS_SHOP_EMAIL');

                if (strtolower($smtpEnc ?: '') === 'off') $smtpEnc = false;

                if ($smtpServer && $smtpPort) {
                    $transport = (new \Swift_SmtpTransport($smtpServer, (int)$smtpPort, $smtpEnc ?: null))
                        ->setUsername($smtpUser)
                        ->setPassword($smtpPass);
                } else {
                    $transport = new \Swift_SendmailTransport();
                }

                $mailer = new \Swift_Mailer($transport);
                $message = (new \Swift_Message())
                    ->setSubject($tpl['subject'])
                    ->setFrom([$fromEmail => $shopName])
                    ->setTo([$toEmail])
                    ->setBody($htmlTemplate, 'text/html', 'utf-8');

                // BCC ekle
                if (!empty($bccRaw)) {
                    foreach (array_map('trim', explode(',', $bccRaw)) as $bccAddr) {
                        if (Validate::isEmail($bccAddr)) {
                            $message->addBcc($bccAddr);
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

                // CC adresleri ana mesaja ekle (ayrı gönderim yerine)
                $ccRaw = Configuration::get('KDEPO_NOTIFICATION_CC');
                if (!empty($ccRaw)) {
                    foreach (array_map('trim', explode(',', $ccRaw)) as $ccAddr) {
                        if (Validate::isEmail($ccAddr)) {
                            $message->addCc($ccAddr);
                        }
                    }
                }

                $sent = $mailer->send($message);
            } catch (\Exception $e) {
                PrestaShopLogger::addLog(
                    'kdepo_tahsilat: SwiftMailer gönderim hatası — ' . $e->getMessage(),
                    3, null, 'Kdepo_Tahsilat'
                );
            }

            // Geçici dosyayı temizle
            if ($pdfInfo && !empty($pdfInfo['path'])) {
                @unlink($pdfInfo['path']);
            }

            if ($sent) {
                return $this->displayConfirmation(
                    sprintf($this->l('Test e-postası başarıyla gönderildi: %s → %s'), $tpl['subject'], $toEmail)
                    . '<br/>' . $pdfStatus
                );
            } else {
                return $this->displayError($this->l('E-posta gönderilemedi. SMTP ayarlarını kontrol edin.'));
            }
        } catch (\Exception $e) {
            return $this->displayError($this->l('E-posta gönderim hatası: ') . $e->getMessage());
        }
    }

    /**
     * Hassas alanlar için göz ikonu ile şifre göster/gizle toggle JS'i.
     */
    private function renderPasswordToggleScript()
    {
        $fields = json_encode(['KDEPO_NESTPAY_PASSWORD', 'KDEPO_NESTPAY_STORE_KEY']);

        return '<script>
document.addEventListener("DOMContentLoaded", function(){
    var fields = ' . $fields . ';
    fields.forEach(function(name){
        var input = document.getElementById(name);
        if(!input) return;
        input.type = "password";
        input.style.paddingRight = "36px";
        var wrapper = input.parentNode;
        wrapper.style.position = "relative";
        var btn = document.createElement("span");
        btn.innerHTML = \'<i class="icon-eye"></i>\';
        btn.style.cssText = "position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:#888;font-size:15px;z-index:2;";
        btn.title = "Göster/Gizle";
        btn.addEventListener("click", function(){
            if(input.type === "password"){
                input.type = "text";
                btn.innerHTML = \'<i class="icon-eye-slash"></i>\';
            } else {
                input.type = "password";
                btn.innerHTML = \'<i class="icon-eye"></i>\';
            }
        });
        wrapper.appendChild(btn);
    });
});
</script>';
    }

    /**
     * E-posta taslak düzenleme paneli.
     * Her şablon için: düzenlenebilir textarea + canlı önizleme + kaydet butonu.
     */
    private function renderEmailPreviews()
    {
        $mailDir = _PS_MODULE_DIR_ . $this->name . '/mails/tr/';

        $templates = [
            [
                'id'    => 'customer_success',
                'title' => $this->l('Müşteriye — Başarılı Ödeme'),
                'file'  => 'payment_success_customer.html',
                'color' => '#4CAF50',
                'badge' => 'Onay',
                'vars'  => '{firstname}, {lastname}, {amount}, {reference_number}, {date}, {shop_name}',
            ],
            [
                'id'    => 'admin_success',
                'title' => $this->l('Yöneticiye — Başarılı Tahsilat'),
                'file'  => 'payment_success_admin.html',
                'color' => '#2196F3',
                'badge' => 'Bilgi',
                'vars'  => '{firstname}, {lastname}, {company_name}, {amount}, {reference_number}, {date}, {collector_user_id}, {collector_name}, {shop_name}',
            ],
            [
                'id'    => 'admin_failed',
                'title' => $this->l('Yöneticiye — Başarısız Tahsilat'),
                'file'  => 'payment_failed_admin.html',
                'color' => '#F44336',
                'badge' => 'Hata',
                'vars'  => '{firstname}, {lastname}, {company_name}, {amount}, {date}, {error_code}, {error_message}, {collector_user_id}, {collector_name}, {shop_name}',
            ],
        ];

        // API endpoint bilgisi
        $apiUrl = $this->context->link->getModuleLink($this->name, 'paymentapi');
        $paymentUrl = $this->context->link->getModuleLink($this->name, 'payment');

        $html = '<div class="panel" style="margin-top:20px;">';
        $html .= '<div class="panel-heading"><i class="icon-link"></i> ' . $this->l('Linkler') . '</div>';
        $html .= '<table class="table"><tbody>';
        $html .= '<tr><td><strong>' . $this->l('API Endpoint (Android)') . '</strong></td>';
        $html .= '<td><code>' . htmlspecialchars($apiUrl) . '</code></td></tr>';
        $html .= '<tr><td><strong>' . $this->l('Web Ödeme Sayfası') . '</strong></td>';
        $html .= '<td><a href="' . htmlspecialchars($paymentUrl) . '" target="_blank">' . htmlspecialchars($paymentUrl) . '</a></td></tr>';
        $html .= '</tbody></table></div>';

        // E-posta düzenleme paneli
        $html .= '<div class="panel" style="margin-top:20px;">';
        $html .= '<div class="panel-heading"><i class="icon-envelope"></i> ' . $this->l('E-posta Taslakları') . '</div>';

        // Tab başlıkları
        $html .= '<ul class="nav nav-tabs" role="tablist">';
        $first = true;
        foreach ($templates as $tpl) {
            $active = $first ? ' class="active"' : '';
            $badge = '<span style="background:' . $tpl['color'] . ';color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;margin-left:8px;">' . $tpl['badge'] . '</span>';
            $html .= '<li' . $active . '><a href="#tab_' . $tpl['id'] . '" data-toggle="tab">' . $tpl['title'] . $badge . '</a></li>';
            $first = false;
        }
        $html .= '</ul>';

        // Tab içerikleri
        $html .= '<div class="tab-content" style="padding-top:15px;">';
        $first = true;
        foreach ($templates as $tpl) {
            $activeClass = $first ? ' active in' : '';
            $filePath = $mailDir . $tpl['file'];
            $content = file_exists($filePath) ? file_get_contents($filePath) : '';

            $html .= '<div class="tab-pane fade' . $activeClass . '" id="tab_' . $tpl['id'] . '">';

            // Kullanılabilir değişkenler
            $html .= '<div class="alert alert-info" style="font-size:12px;"><strong>' . $this->l('Kullanılabilir değişkenler:') . '</strong> <code>' . $tpl['vars'] . '</code></div>';

            // Form: textarea + kaydet
            $html .= '<form method="post" action="' . AdminController::$currentIndex . '&configure=' . $this->name . '&token=' . Tools::getAdminTokenLite('AdminModules') . '">';
            $html .= '<input type="hidden" name="email_template_file" value="' . $tpl['file'] . '" />';

            // Önizleme
            $html .= '<p><strong>' . $this->l('Önizleme:') . '</strong></p>';
            $html .= '<div style="border:1px solid #ddd;border-radius:4px;background:#fafafa;margin-bottom:15px;">';
            $html .= '<iframe id="preview_' . $tpl['id'] . '" srcdoc="' . htmlspecialchars($content, ENT_QUOTES, 'UTF-8') . '" ';
            $html .= 'style="width:100%;height:400px;border:none;" sandbox="allow-same-origin"></iframe>';
            $html .= '</div>';

            // Textarea
            $html .= '<p><strong>' . $this->l('HTML Düzenle:') . '</strong></p>';
            $html .= '<textarea name="email_template_content" id="editor_' . $tpl['id'] . '" ';
            $html .= 'style="width:100%;height:300px;font-family:monospace;font-size:13px;border:1px solid #ccc;border-radius:4px;padding:10px;" ';
            $html .= 'onkeyup="document.getElementById(\'preview_' . $tpl['id'] . '\').srcdoc=this.value;">';
            $html .= htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
            $html .= '</textarea>';

            $html .= '<div style="margin-top:10px;text-align:right;">';
            $html .= '<button type="submit" name="submitKdepoEmailTemplate" class="btn btn-default" style="margin-right:8px;">';
            $html .= '<i class="icon-save"></i> ' . $this->l('Bu Şablonu Kaydet') . '</button>';
            $html .= '</div>';
            $html .= '</form>';

            $html .= '</div>'; // tab-pane
            $first = false;
        }
        $html .= '</div>'; // tab-content
        $html .= '</div>'; // panel

        return $html;
    }

    /**
     * E-posta şablonunu dosyaya kaydeder.
     */
    private function saveEmailTemplate()
    {
        $file = Tools::getValue('email_template_file');
        $content = Tools::getValue('email_template_content');

        $allowedFiles = [
            'payment_success_customer.html',
            'payment_success_admin.html',
            'payment_failed_admin.html',
        ];

        if (!in_array($file, $allowedFiles)) {
            return $this->displayError($this->l('Geçersiz şablon dosyası.'));
        }

        $filePath = _PS_MODULE_DIR_ . $this->name . '/mails/tr/' . $file;

        if (file_put_contents($filePath, $content) !== false) {
            return $this->displayConfirmation($this->l('E-posta şablonu başarıyla kaydedildi: ') . $file);
        }

        return $this->displayError($this->l('Şablon kaydedilemedi. Dosya yazma izinlerini kontrol edin.'));
    }

    /**
     * ps_kdepo_payment_log tablosunu oluşturur.
     */
    private function createPaymentLogTable()
    {
        $sql = 'CREATE TABLE IF NOT EXISTS `' . _DB_PREFIX_ . 'kdepo_payment_log` (
            `id_payment_log` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
            `date_add` DATETIME NOT NULL,
            `customer_firstname` VARCHAR(255) NOT NULL,
            `customer_lastname` VARCHAR(255) NOT NULL,
            `customer_email` VARCHAR(255) DEFAULT NULL,
            `company_name` VARCHAR(255) NOT NULL,
            `amount` DECIMAL(10,2) NOT NULL,
            `status` ENUM(\'success\',\'failed\',\'voided\',\'refunded\') NOT NULL,
            `error_code` VARCHAR(50) DEFAULT NULL,
            `error_message` TEXT DEFAULT NULL,
            `collector_user_id` INT(11) NOT NULL,
            `collector_firstname` VARCHAR(255) NOT NULL,
            `collector_lastname` VARCHAR(255) NOT NULL,
            `reference_number` VARCHAR(50) DEFAULT NULL,
            `description` TEXT DEFAULT NULL,
            `id_customer` INT(11) DEFAULT NULL,
            `auth_code` VARCHAR(50) DEFAULT NULL,
            `host_ref_num` VARCHAR(50) DEFAULT NULL,
            `trans_id` VARCHAR(50) DEFAULT NULL,
            `proc_return_code` VARCHAR(10) DEFAULT NULL,
            `transaction_type` VARCHAR(20) DEFAULT NULL,
            `nestpay_order_id` VARCHAR(64) DEFAULT NULL,
            `masked_card` VARCHAR(30) DEFAULT NULL,
            `card_brand` VARCHAR(20) DEFAULT NULL,
            `card_bank` VARCHAR(100) DEFAULT NULL,
            `card_expiry_year` VARCHAR(4) DEFAULT NULL,
            PRIMARY KEY (`id_payment_log`),
            INDEX `idx_date` (`date_add`),
            INDEX `idx_status` (`status`),
            INDEX `idx_collector` (`collector_user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;';

        return Db::getInstance()->execute($sql);
    }

    /**
     * Mevcut ps_kdepo_payment_log tablosuna Nestpay sütunlarını ekler (upgrade senaryosu).
     * Sütun zaten varsa ALTER TABLE sessizce atlanır.
     */
    private function migratePaymentLogTable()
    {
        $db = Db::getInstance();
        $table = _DB_PREFIX_ . 'kdepo_payment_log';

        // Yeni Nestpay sütunları
        $columns = [
            'auth_code'        => 'VARCHAR(50) DEFAULT NULL',
            'host_ref_num'     => 'VARCHAR(50) DEFAULT NULL',
            'trans_id'         => 'VARCHAR(50) DEFAULT NULL',
            'proc_return_code' => 'VARCHAR(10) DEFAULT NULL',
            'transaction_type' => 'VARCHAR(20) DEFAULT NULL',
            'nestpay_order_id' => 'VARCHAR(64) DEFAULT NULL',
            'masked_card'      => 'VARCHAR(30) DEFAULT NULL',
            'card_brand'       => 'VARCHAR(20) DEFAULT NULL',
            'card_bank'        => 'VARCHAR(100) DEFAULT NULL',
            'card_expiry_year' => 'VARCHAR(4) DEFAULT NULL',
        ];

        foreach ($columns as $column => $definition) {
            $exists = $db->executeS(
                "SHOW COLUMNS FROM `{$table}` LIKE '{$column}'"
            );
            if (empty($exists)) {
                $db->execute(
                    "ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}"
                );
            }
        }

        // status ENUM genişletme: 'voided' ve 'refunded' ekle
        $statusCol = $db->executeS(
            "SHOW COLUMNS FROM `{$table}` LIKE 'status'"
        );
        if (!empty($statusCol) && strpos($statusCol[0]['Type'], 'voided') === false) {
            $db->execute(
                "ALTER TABLE `{$table}` MODIFY COLUMN `status` ENUM('success','failed','voided','refunded') NOT NULL"
            );
        }

        return true;
    }

    /**
     * ps_kdepo_payment_log tablosunu siler.
     */
    private function dropPaymentLogTable()
    {
        $sql = 'DROP TABLE IF EXISTS `' . _DB_PREFIX_ . 'kdepo_payment_log`';

        return Db::getInstance()->execute($sql);
    }

    /**
     * ps_kdepo_event_log tablosunu oluşturur.
     */
    private function createEventLogTable()
    {
        $sql = 'CREATE TABLE IF NOT EXISTS `' . _DB_PREFIX_ . 'kdepo_event_log` (
            `id_event_log` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
            `date_add` DATETIME NOT NULL,
            `session_id` VARCHAR(64) NOT NULL,
            `event_type` VARCHAR(30) NOT NULL,
            `card_last4` VARCHAR(4) DEFAULT NULL,
            `card_holder` VARCHAR(255) DEFAULT NULL,
            `card_bank` VARCHAR(100) DEFAULT NULL,
            `card_brand` VARCHAR(20) DEFAULT NULL,
            `amount` DECIMAL(10,2) DEFAULT NULL,
            `company_name` VARCHAR(255) DEFAULT NULL,
            `payer_name` VARCHAR(255) DEFAULT NULL,
            `email` VARCHAR(255) DEFAULT NULL,
            `status` VARCHAR(20) DEFAULT NULL,
            `error_message` TEXT DEFAULT NULL,
            `reference_number` VARCHAR(50) DEFAULT NULL,
            `ip_address` VARCHAR(45) DEFAULT NULL,
            `extra_data` TEXT DEFAULT NULL,
            PRIMARY KEY (`id_event_log`),
            INDEX `idx_session` (`session_id`),
            INDEX `idx_date` (`date_add`),
            INDEX `idx_type` (`event_type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;';

        return Db::getInstance()->execute($sql);
    }

    /**
     * Admin paneline tahsilat log sekmesini ekler.
     */
    private function installTab()
    {
        // Tahsilat Logları tab'ı
        $tab = new Tab();
        $tab->active = 1;
        $tab->class_name = 'AdminKdepoPaymentLog';
        $tab->name = [];
        foreach (Language::getLanguages(true) as $lang) {
            $tab->name[$lang['id_lang']] = 'Tahsilat Logları';
        }
        $tab->id_parent = (int) Tab::getIdFromClassName('AdminParentPayment');
        $tab->module = $this->name;
        $result1 = $tab->add();

        // Event Logları tab'ı
        $tab2 = new Tab();
        $tab2->active = 1;
        $tab2->class_name = 'AdminKdepoEventLog';
        $tab2->name = [];
        foreach (Language::getLanguages(true) as $lang) {
            $tab2->name[$lang['id_lang']] = 'Odeme Akis Loglari';
        }
        $tab2->id_parent = (int) Tab::getIdFromClassName('AdminParentPayment');
        $tab2->module = $this->name;
        $result2 = $tab2->add();

        return $result1 && $result2;
    }

    /**
     * Admin panelinden tahsilat log sekmesini kaldırır.
     */
    private function uninstallTab()
    {
        $id_tab = (int) Tab::getIdFromClassName('AdminKdepoPaymentLog');
        if ($id_tab) {
            $tab = new Tab($id_tab);
            $tab->delete();
        }

        $id_tab2 = (int) Tab::getIdFromClassName('AdminKdepoEventLog');
        if ($id_tab2) {
            $tab2 = new Tab($id_tab2);
            $tab2->delete();
        }

        return true;
    }
}
