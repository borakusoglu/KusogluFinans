<?php
/**
 * EventLogger — Ödeme akışı event logları.
 *
 * Her ödeme adımını (form submit, 3D yönlendirme, sonuç) kaydeder.
 * session_id ile aynı ödeme akışındaki tüm adımlar gruplanır.
 *
 * Event tipleri:
 *   form_submit    — Ödeme formuna basıldı
 *   3d_redirect    — 3D Secure gate'e yönlendirildi
 *   3d_callback    — Bankadan 3D yanıt geldi
 *   payment_success — Ödeme başarılı
 *   payment_failed  — Ödeme başarısız
 *   api_request     — API üzerinden ödeme isteği
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class EventLogger
{
    /**
     * Event log kaydı oluşturur.
     */
    public static function log(array $data)
    {
        $db = Db::getInstance();

        // Tablo yoksa oluştur (ilk çalışma güvenliği)
        $db->execute(
            'CREATE TABLE IF NOT EXISTS `' . _DB_PREFIX_ . 'kdepo_event_log` (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        try {
            $db->insert('kdepo_event_log', [
                'date_add'         => date('Y-m-d H:i:s'),
                'session_id'       => pSQL($data['session_id'] ?? ''),
                'event_type'       => pSQL($data['event_type'] ?? ''),
                'card_last4'       => pSQL($data['card_last4'] ?? ''),
                'card_holder'      => pSQL($data['card_holder'] ?? ''),
                'card_bank'        => pSQL($data['card_bank'] ?? ''),
                'card_brand'       => pSQL($data['card_brand'] ?? ''),
                'amount'           => isset($data['amount']) ? (float) $data['amount'] : null,
                'company_name'     => pSQL($data['company_name'] ?? ''),
                'payer_name'       => pSQL($data['payer_name'] ?? ''),
                'email'            => pSQL($data['email'] ?? ''),
                'status'           => pSQL($data['status'] ?? ''),
                'error_message'    => isset($data['error_message']) ? pSQL($data['error_message']) : null,
                'reference_number' => isset($data['reference_number']) ? pSQL($data['reference_number']) : null,
                'ip_address'       => pSQL(self::getClientIp()),
                'extra_data'       => isset($data['extra_data']) ? pSQL(json_encode($data['extra_data'])) : null,
            ]);
        } catch (\Exception $e) {
            PrestaShopLogger::addLog(
                'kdepo_tahsilat: Event log yazma hatasi — ' . $e->getMessage(),
                3, null, 'Kdepo_Tahsilat'
            );
        }
    }

    private static function getClientIp()
    {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
