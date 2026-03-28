<?php
/**
 * NestpayXmlBuilder — Nestpay (Payten) CC5Request XML oluşturucu.
 *
 * CC5AS XML API standardına uygun Auth, PreAuth, PostAuth, Void, Credit
 * ve sipariş sorgulama XML belgeleri oluşturur.
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class NestpayXmlBuilder
{
    /** @var string API kullanıcı adı */
    private $name;

    /** @var string API şifresi */
    private $password;

    /** @var string Mağaza kodu */
    private $clientId;

    /**
     * @param string $name     API kullanıcı adı
     * @param string $password API şifresi
     * @param string $clientId Mağaza kodu
     */
    public function __construct($name, $password, $clientId)
    {
        $this->name     = $name;
        $this->password = $password;
        $this->clientId = $clientId;
    }

    /**
     * Satış (Auth) veya Ön Otorizasyon (PreAuth) CC5Request XML'i oluşturur.
     *
     * @param string   $type       "Auth" veya "PreAuth"
     * @param string   $orderId    Benzersiz sipariş ID
     * @param float    $total      Tutar
     * @param string   $currency   Para birimi kodu ("949" = TRY)
     * @param string   $cardNumber Kart numarası (13-19 hane)
     * @param string   $expires    Son kullanma tarihi (MM/YYYY)
     * @param string   $cvv        CVV (3-4 hane)
     * @param int|null $instalment Taksit sayısı (2-12, null=tek çekim)
     * @return string CC5Request XML
     * @throws \InvalidArgumentException Geçersiz taksit sayısı durumunda
     */
    public function buildAuthRequest(
        $type,
        $orderId,
        $total,
        $currency,
        $cardNumber,
        $expires,
        $cvv,
        $instalment = null
    ) {
        $this->validateInstalment($instalment);

        $xml = new SimpleXMLElement(
            '<?xml version="1.0" encoding="ISO-8859-9"?><CC5Request/>'
        );

        $xml->addChild('Name', $this->escapeXml($this->name));
        $xml->addChild('Password', $this->escapeXml($this->password));
        $xml->addChild('ClientId', $this->escapeXml($this->clientId));
        $xml->addChild('Type', $this->escapeXml($type));
        $xml->addChild('OrderId', $this->escapeXml($orderId));
        $xml->addChild('Total', number_format($total, 2, '.', ''));
        $xml->addChild('Currency', $this->escapeXml($currency));
        $xml->addChild('Number', $this->escapeXml($cardNumber));
        $xml->addChild('Expires', $this->escapeXml($expires));
        $xml->addChild('Cvv2Val', $this->escapeXml($cvv));

        if ($instalment !== null && $instalment >= 2 && $instalment <= 12) {
            $xml->addChild('Instalment', (string) $instalment);
        }

        return $this->toXmlString($xml);
    }

    /**
     * PostAuth, Void veya Credit CC5Request XML'i oluşturur.
     * Kart bilgisi gerektirmez.
     *
     * @param string     $type    "PostAuth", "Void" veya "Credit"
     * @param string     $orderId Orijinal sipariş ID
     * @param float|null $total   Tutar (PostAuth ve Credit için gerekli, Void için opsiyonel)
     * @return string CC5Request XML
     */
    public function buildOrderRequest($type, $orderId, $total = null)
    {
        $xml = new SimpleXMLElement(
            '<?xml version="1.0" encoding="ISO-8859-9"?><CC5Request/>'
        );

        $xml->addChild('Name', $this->escapeXml($this->name));
        $xml->addChild('Password', $this->escapeXml($this->password));
        $xml->addChild('ClientId', $this->escapeXml($this->clientId));
        $xml->addChild('Type', $this->escapeXml($type));
        $xml->addChild('OrderId', $this->escapeXml($orderId));

        if ($total !== null) {
            $xml->addChild('Total', number_format($total, 2, '.', ''));
        }

        return $this->toXmlString($xml);
    }

    /**
     * Sipariş sorgulama CC5Request XML'i oluşturur.
     *
     * @param string $orderId    Sorgulanacak sipariş ID
     * @param bool   $withHistory Tarihçe dahil mi
     * @return string CC5Request XML
     */
    public function buildQueryRequest($orderId, $withHistory = false)
    {
        $xml = new SimpleXMLElement(
            '<?xml version="1.0" encoding="ISO-8859-9"?><CC5Request/>'
        );

        $xml->addChild('Name', $this->escapeXml($this->name));
        $xml->addChild('Password', $this->escapeXml($this->password));
        $xml->addChild('ClientId', $this->escapeXml($this->clientId));
        $xml->addChild('OrderId', $this->escapeXml($orderId));

        $extra = $xml->addChild('Extra');
        $extra->addChild('ORDERSTATUS', 'QUERY');

        if ($withHistory) {
            $extra->addChild('ORDERHISTORY', 'QUERY');
        }

        return $this->toXmlString($xml);
    }

    /**
     * Benzersiz OrderId üretir.
     * Format: KDP-{timestamp}-{random 8 hex karakter}
     *
     * @return string
     */
    public static function generateOrderId()
    {
        return sprintf(
            'KDP-%d-%s',
            time(),
            strtoupper(bin2hex(random_bytes(4)))
        );
    }

    /**
     * AA/YY formatındaki son kullanma tarihini MM/YYYY formatına dönüştürür.
     * 2000 baz yılı kullanılır (örn: 03/26 → 03/2026).
     *
     * @param string $mmyy AA/YY formatında tarih
     * @return string MM/YYYY formatında tarih
     * @throws \InvalidArgumentException Geçersiz format durumunda
     */
    public static function convertExpiryDate($mmyy)
    {
        $mmyy = trim($mmyy);

        if (!preg_match('/^(\d{2})\/(\d{2})$/', $mmyy, $matches)) {
            throw new \InvalidArgumentException(
                "Geçersiz son kullanma tarihi formatı: '{$mmyy}'. Beklenen format: AA/YY"
            );
        }

        $month = $matches[1];
        $year  = $matches[2];

        $monthInt = (int) $month;
        if ($monthInt < 1 || $monthInt > 12) {
            throw new \InvalidArgumentException(
                "Geçersiz ay değeri: '{$month}'. 01-12 arasında olmalıdır."
            );
        }

        $fullYear = 2000 + (int) $year;

        return $month . '/' . $fullYear;
    }

    /**
     * Taksit sayısını doğrular.
     * 0, 1 veya null = tek çekim (geçerli), 2-12 = taksit (geçerli), 13+ = geçersiz.
     *
     * @param int|null $instalment
     * @throws \InvalidArgumentException Geçersiz taksit sayısı durumunda
     */
    private function validateInstalment($instalment)
    {
        if ($instalment === null) {
            return;
        }

        if (!is_int($instalment)) {
            throw new \InvalidArgumentException(
                'Taksit sayısı bir tamsayı olmalıdır.'
            );
        }

        if ($instalment < 0 || $instalment > 12) {
            throw new \InvalidArgumentException(
                "Geçersiz taksit sayısı: {$instalment}. 0-12 arasında olmalıdır."
            );
        }
    }

    /**
     * SimpleXMLElement'i ISO-8859-9 kodlamalı XML string'e dönüştürür.
     *
     * @param SimpleXMLElement $xml
     * @return string
     */
    private function toXmlString(SimpleXMLElement $xml)
    {
        $dom = new DOMDocument('1.0', 'ISO-8859-9');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput       = true;
        $dom->loadXML($xml->asXML());

        return $dom->saveXML();
    }

    /**
     * XML özel karakterlerini escape eder.
     *
     * @param string $value
     * @return string
     */
    private function escapeXml($value)
    {
        return htmlspecialchars((string) $value, ENT_XML1, 'UTF-8');
    }

    /**
     * 3D Secure HASH hesaplar (NestPay est3dgate standardı).
     *
     * Hash sırası (SHA-512): clientId|oid|amount|okUrl|failUrl|islemtipi|taksit|rnd|||||storeKey
     *
     * @param string $clientId   İşyeri numarası
     * @param string $orderId    Sipariş ID
     * @param string $amount     Tutar (örn: "5.05")
     * @param string $okUrl      Başarılı dönüş URL
     * @param string $failUrl    Başarısız dönüş URL
     * @param string $type       İşlem tipi (Auth, PreAuth)
     * @param string $instalment Taksit ("" = tek çekim)
     * @param string $rnd        Rastgele değer
     * @param string $storeKey   Store Key
     * @param string $currency   Para birimi kodu (hash'e dahil edilmez, uyumluluk için tutulur)
     * @return string Base64 kodlanmış hash
     */
    public static function calculate3DHash(
        $clientId,
        $orderId,
        $amount,
        $okUrl,
        $failUrl,
        $type,
        $instalment,
        $rnd,
        $storeKey,
        $currency = '949'
    ) {
        // Escape: pipe ve backslash karakterlerini escape et
        $escape = function($val) {
            return str_replace('|', '\\|', str_replace('\\', '\\\\', (string)$val));
        };

        // NestPay hash sırası: clientId|oid|amount|okUrl|failUrl|islemtipi|instalment|rnd||||currency|storeKey
        $hashStr = $escape($clientId) . '|' . $escape($orderId) . '|' . $escape($amount) . '|'
            . $escape($okUrl) . '|' . $escape($failUrl) . '|' . $escape($type) . '|'
            . $escape($instalment) . '|' . $escape($rnd) . '||||'
            . $escape($currency) . '|' . $escape($storeKey);

        return base64_encode(pack('H*', hash('sha512', $hashStr)));
    }
}
