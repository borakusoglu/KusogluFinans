<?php
/**
 * NestpayXmlParser — Nestpay (Payten) CC5Response XML ayrıştırıcı.
 *
 * CC5Response XML yanıtlarını yapılandırılmış diziye dönüştürür,
 * başarı durumunu belirler ve round-trip XML dönüşümü sağlar.
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class NestpayXmlParser
{
    /**
     * CC5Response XML'ini yapılandırılmış diziye dönüştürür.
     *
     * @param string $xml CC5Response XML
     * @return array{
     *   response: string,
     *   procReturnCode: string,
     *   authCode: string|null,
     *   hostRefNum: string|null,
     *   transId: string|null,
     *   orderId: string|null,
     *   errMsg: string|null,
     *   success: bool
     * }
     * @throws \InvalidArgumentException Geçersiz veya boş XML durumunda
     */
    public static function parse($xml)
    {
        if ($xml === null || trim($xml) === '') {
            throw new \InvalidArgumentException(
                'XML yanıtı boş veya null olamaz.'
            );
        }

        $previousUseErrors = libxml_use_internal_errors(true);

        $simpleXml = simplexml_load_string(trim($xml));

        $errors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($previousUseErrors);

        if ($simpleXml === false) {
            throw new \InvalidArgumentException(
                'Geçersiz XML formatı: XML ayrıştırılamadı.'
            );
        }

        if ($simpleXml->getName() !== 'CC5Response') {
            throw new \InvalidArgumentException(
                "Geçersiz XML kök elemanı: '{$simpleXml->getName()}'. Beklenen: CC5Response"
            );
        }

        $response       = isset($simpleXml->Response) ? (string) $simpleXml->Response : '';
        $procReturnCode = isset($simpleXml->ProcReturnCode) ? (string) $simpleXml->ProcReturnCode : '';
        $authCode       = isset($simpleXml->AuthCode) ? (string) $simpleXml->AuthCode : null;
        $hostRefNum     = isset($simpleXml->HostRefNum) ? (string) $simpleXml->HostRefNum : null;
        $transId        = isset($simpleXml->TransId) ? (string) $simpleXml->TransId : null;
        $orderId        = isset($simpleXml->OrderId) ? (string) $simpleXml->OrderId : null;
        $errMsg         = isset($simpleXml->ErrMsg) ? (string) $simpleXml->ErrMsg : null;

        // Boş string değerleri null'a dönüştür
        $authCode   = ($authCode !== null && $authCode !== '') ? $authCode : null;
        $hostRefNum = ($hostRefNum !== null && $hostRefNum !== '') ? $hostRefNum : null;
        $transId    = ($transId !== null && $transId !== '') ? $transId : null;
        $orderId    = ($orderId !== null && $orderId !== '') ? $orderId : null;
        $errMsg     = ($errMsg !== null && $errMsg !== '') ? $errMsg : null;

        $success = ($response === 'Approved');

        return [
            'response'        => $response,
            'procReturnCode'  => $procReturnCode,
            'authCode'        => $authCode,
            'hostRefNum'      => $hostRefNum,
            'transId'         => $transId,
            'orderId'         => $orderId,
            'errMsg'          => $errMsg,
            'success'         => $success,
        ];
    }

    /**
     * Ayrıştırılmış veriyi CC5Response XML'e geri dönüştürür.
     * Round-trip doğrulama için kullanılır.
     *
     * @param array $data parse() tarafından döndürülen dizi
     * @return string CC5Response XML
     */
    public static function toXml(array $data)
    {
        $xml = new SimpleXMLElement(
            '<?xml version="1.0" encoding="ISO-8859-9"?><CC5Response/>'
        );

        $xml->addChild('OrderId', self::escapeXml(isset($data['orderId']) ? (string) $data['orderId'] : ''));
        $xml->addChild('GroupId', '');
        $xml->addChild('Response', self::escapeXml(isset($data['response']) ? (string) $data['response'] : ''));
        $xml->addChild('AuthCode', self::escapeXml(isset($data['authCode']) ? (string) $data['authCode'] : ''));
        $xml->addChild('HostRefNum', self::escapeXml(isset($data['hostRefNum']) ? (string) $data['hostRefNum'] : ''));
        $xml->addChild('ProcReturnCode', self::escapeXml(isset($data['procReturnCode']) ? (string) $data['procReturnCode'] : ''));
        $xml->addChild('TransId', self::escapeXml(isset($data['transId']) ? (string) $data['transId'] : ''));
        $xml->addChild('ErrMsg', self::escapeXml(isset($data['errMsg']) ? (string) $data['errMsg'] : ''));

        $dom = new DOMDocument('1.0', 'ISO-8859-9');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput       = true;
        $dom->loadXML($xml->asXML());

        return $dom->saveXML();
    }

    /**
     * ProcReturnCode'a göre başarı durumunu belirler.
     * "00" = başarılı, diğer = başarısız.
     *
     * @param string $procReturnCode Nestpay ProcReturnCode değeri
     * @return bool
     */
    public static function isApproved($procReturnCode)
    {
        return $procReturnCode === '00';
    }

    /**
     * XML özel karakterlerini escape eder.
     *
     * @param string $value
     * @return string
     */
    private static function escapeXml($value)
    {
        return htmlspecialchars((string) $value, ENT_XML1, 'UTF-8');
    }
}
