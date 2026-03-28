<?php
/**
 * Receipt Controller — Ödeme makbuzu PDF indirme.
 *
 * GET ?ref=KDP-xxx → PDF makbuzu oluşturur ve indirir.
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/PaymentPdfGenerator.php';

class Kdepo_TahsilatReceiptModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();

        $ref = strip_tags(Tools::getValue('ref', ''));

        // Debug: ref parametresi gelmiyor mu kontrol et
        if (empty($ref)) {
            // GET parametrelerinden de dene
            $ref = isset($_GET['ref']) ? strip_tags($_GET['ref']) : '';
        }
        if (empty($ref)) {
            die('Referans numarasi eksik. GET: ' . htmlspecialchars(print_r($_GET, true)));
        }

        // Veritabanından ödeme kaydını bul
        $row = Db::getInstance()->getRow(
            'SELECT * FROM `' . _DB_PREFIX_ . 'kdepo_payment_log` WHERE `reference_number` = \'' . pSQL($ref) . '\''
        );

        if (!$row) {
            die('Odeme kaydi bulunamadi.');
        }

        // PDF verisi hazırla
        $amount = number_format((float) $row['amount'], 2, ',', '.') . ' TL';
        $pdfData = [
            'status'            => $row['status'],
            'firstname'         => $row['customer_firstname'],
            'lastname'          => $row['customer_lastname'],
            'company_name'      => $row['company_name'],
            'email'             => $row['customer_email'] ?? '',
            'amount'            => $amount,
            'date'              => $row['date_add'],
            'reference_number'  => $row['reference_number'],
            'description'       => $row['description'] ?? '',
            'error_code'        => $row['error_code'] ?? '',
            'error_message'     => $row['error_message'] ?? '',
            'payer_name'        => $row['customer_firstname'] . ' ' . $row['customer_lastname'],
            'masked_card'       => $row['masked_card'] ?? '',
            'card_bank'         => $row['card_bank'] ?? '',
            'card_brand'        => $row['card_brand'] ?? '',
            'collector_user_id' => (string) ($row['collector_user_id'] ?? ''),
            'collector_name'    => ($row['collector_firstname'] ?? '') . ' ' . ($row['collector_lastname'] ?? ''),
        ];

        $pdfInfo = PaymentPdfGenerator::generate($pdfData);

        if (!$pdfInfo || empty($pdfInfo['path']) || !file_exists($pdfInfo['path'])) {
            die('PDF olusturulamadi.');
        }

        // PDF'i indir
        $filename = 'tahsilat-makbuzu-' . $ref . '.' . pathinfo($pdfInfo['name'], PATHINFO_EXTENSION);
        header('Content-Type: ' . $pdfInfo['mime']);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($pdfInfo['path']));
        header('Cache-Control: no-cache, no-store, must-revalidate');
        readfile($pdfInfo['path']);
        @unlink($pdfInfo['path']);
        exit;
    }
}
