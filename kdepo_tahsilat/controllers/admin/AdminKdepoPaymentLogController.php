<?php
/**
 * AdminKdepoPaymentLogController — Tahsilat logları admin panel sayfası.
 *
 * PrestaShop yönetim panelinde ödeme tahsilat loglarını listeler,
 * tarih / durum / müşteri adı / tahsilat yapan kullanıcıya göre filtreleme
 * ve CSV dışa aktarma özelliği sunar.
 *
 * Her kayıtta: işlem tarihi, müşteri bilgileri, ödeme tutarı, işlem durumu,
 * hata detayı ve tahsilat yapan kullanıcı gösterilir.
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'kdepo_tahsilat/classes/KdepoPaymentLog.php';

class AdminKdepoPaymentLogController extends ModuleAdminController
{
    public function __construct()
    {
        $this->bootstrap  = true;
        $this->table      = 'kdepo_payment_log';
        $this->className  = 'KdepoPaymentLog';
        $this->identifier = 'id_payment_log';
        $this->lang       = false;

        // Varsayılan sıralama: en yeni kayıt üstte
        $this->_defaultOrderBy    = 'date_add';
        $this->_defaultOrderWay   = 'DESC';

        // Kayıt ekleme/düzenleme devre dışı — salt okunur log
        $this->addRowAction('view');
        $this->allow_export = true;

        parent::__construct();

        $this->meta_title = $this->l('Tahsilat Logları');

        // ── Toolbar'a CSV dışa aktarma butonu ekle ──
        $this->toolbar_btn['export'] = [
            'href' => self::$currentIndex . '&export' . $this->table . '&token=' . $this->token,
            'desc' => $this->l('CSV Dışa Aktar'),
        ];

        // ── Liste sütunları ──
        $this->fields_list = [
            'id_payment_log' => [
                'title'  => $this->l('ID'),
                'align'  => 'center',
                'class'  => 'fixed-width-xs',
                'filter_key' => 'a!id_payment_log',
            ],
            'date_add' => [
                'title'      => $this->l('İşlem Tarihi'),
                'type'       => 'datetime',
                'filter_key' => 'a!date_add',
            ],
            'customer_firstname' => [
                'title'      => $this->l('Müşteri Adı'),
                'filter_key' => 'a!customer_firstname',
            ],
            'customer_lastname' => [
                'title'      => $this->l('Müşteri Soyadı'),
                'filter_key' => 'a!customer_lastname',
            ],
            'company_name' => [
                'title'      => $this->l('Şirket'),
                'filter_key' => 'a!company_name',
            ],
            'amount' => [
                'title'    => $this->l('Tutar'),
                'type'     => 'price',
                'currency' => true,
                'align'    => 'right',
                'filter_key' => 'a!amount',
            ],
            'status' => [
                'title'      => $this->l('Durum'),
                'type'       => 'select',
                'list'       => [
                    'success'  => $this->l('Başarılı'),
                    'failed'   => $this->l('Başarısız'),
                    'voided'   => $this->l('İptal Edildi'),
                    'refunded' => $this->l('İade Edildi'),
                ],
                'filter_key'  => 'a!status',
                'filter_type' => 'string',
                'callback'    => 'renderStatusBadge',
            ],
            'error_message' => [
                'title'      => $this->l('Hata Detayı'),
                'filter_key' => 'a!error_message',
                'maxlength'  => 80,
            ],
            'collector_name' => [
                'title'      => $this->l('Tahsilat Yapan'),
                'filter_key' => 'collector_name',
                'havingFilter' => true,
                'orderby'    => false,
            ],
            'reference_number' => [
                'title'      => $this->l('Referans No'),
                'filter_key' => 'a!reference_number',
            ],
            'transaction_type' => [
                'title'      => $this->l('İşlem Tipi'),
                'filter_key' => 'a!transaction_type',
            ],
            'nestpay_order_id' => [
                'title'      => $this->l('Nestpay Sipariş ID'),
                'filter_key' => 'a!nestpay_order_id',
            ],
            'auth_code' => [
                'title'      => $this->l('Auth Code'),
                'filter_key' => 'a!auth_code',
            ],
            'host_ref_num' => [
                'title'      => $this->l('Host Ref Num'),
                'filter_key' => 'a!host_ref_num',
            ],
            'trans_id' => [
                'title'      => $this->l('Trans ID'),
                'filter_key' => 'a!trans_id',
            ],
            'proc_return_code' => [
                'title'      => $this->l('ProcReturnCode'),
                'filter_key' => 'a!proc_return_code',
                'class'      => 'fixed-width-xs',
            ],
        ];
    }

    // ═══════════════════════════════════════════════════════════
    //  Liste sorgusu — collector ad/soyad birleştirme
    // ═══════════════════════════════════════════════════════════

    /**
     * Liste sorgusuna tahsilat yapan kullanıcı ad+soyad birleştirmesini ekler.
     */
    public function getList($id_lang, $order_by = null, $order_way = null, $start = 0, $limit = null, $id_lang_shop = false)
    {
        // collector_name sanal sütununu SELECT'e ekle
        $this->_select = 'CONCAT(a.`collector_firstname`, \' \', a.`collector_lastname`) AS `collector_name`';

        parent::getList($id_lang, $order_by, $order_way, $start, $limit, $id_lang_shop);
    }

    // ═══════════════════════════════════════════════════════════
    //  Durum rozeti (badge) render
    // ═══════════════════════════════════════════════════════════

    /**
     * Durum sütununda renkli rozet gösterir.
     *
     * @param string $value  success|failed
     * @param array  $row    Satır verisi
     * @return string HTML
     */
    public function renderStatusBadge($value, $row)
    {
        switch ($value) {
            case 'success':
                return '<span class="badge badge-success">' . $this->l('Başarılı') . '</span>';
            case 'voided':
                return '<span class="badge badge-warning">' . $this->l('İptal Edildi') . '</span>';
            case 'refunded':
                return '<span class="badge badge-info">' . $this->l('İade Edildi') . '</span>';
            default:
                return '<span class="badge badge-danger">' . $this->l('Başarısız') . '</span>';
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Detay görünümü (view)
    // ═══════════════════════════════════════════════════════════

    /**
     * Tek kayıt detay sayfası alanları.
     */
    public function renderView()
    {
        $id = (int) Tools::getValue('id_payment_log');
        $log = new KdepoPaymentLog($id);

        if (!Validate::isLoadedObject($log)) {
            $this->errors[] = $this->l('Log kaydı bulunamadı.');
            return parent::renderView();
        }

        switch ($log->status) {
            case 'success':
                $statusLabel = '<span class="badge badge-success">' . $this->l('Başarılı') . '</span>';
                break;
            case 'voided':
                $statusLabel = '<span class="badge badge-warning">' . $this->l('İptal Edildi') . '</span>';
                break;
            case 'refunded':
                $statusLabel = '<span class="badge badge-info">' . $this->l('İade Edildi') . '</span>';
                break;
            default:
                $statusLabel = '<span class="badge badge-danger">' . $this->l('Başarısız') . '</span>';
                break;
        }

        $this->tpl_view_vars = [
            'log'          => $log,
            'status_label' => $statusLabel,
        ];

        // Basit tablo ile detay gösterimi
        $html = '<div class="panel">';
        $html .= '<h3><i class="icon-list-alt"></i> ' . $this->l('Tahsilat Log Detayı') . ' #' . $log->id . '</h3>';
        $html .= '<table class="table">';
        $html .= $this->viewRow($this->l('İşlem Tarihi'), $log->date_add);
        $html .= $this->viewRow($this->l('Müşteri'), $log->customer_firstname . ' ' . $log->customer_lastname);
        $html .= $this->viewRow($this->l('E-posta'), $log->customer_email ?: '-');
        $html .= $this->viewRow($this->l('Şirket'), $log->company_name);
        $html .= $this->viewRow($this->l('Tutar'), number_format((float) $log->amount, 2, ',', '.') . ' TL');
        $html .= $this->viewRow($this->l('Durum'), $statusLabel);
        $html .= $this->viewRow($this->l('İşlem Tipi'), $log->transaction_type ?: '-');
        $html .= $this->viewRow($this->l('Nestpay Sipariş ID'), $log->nestpay_order_id ?: '-');
        $html .= $this->viewRow($this->l('Auth Code'), $log->auth_code ?: '-');
        $html .= $this->viewRow($this->l('Host Ref Num'), $log->host_ref_num ?: '-');
        $html .= $this->viewRow($this->l('Trans ID'), $log->trans_id ?: '-');
        $html .= $this->viewRow($this->l('ProcReturnCode'), $log->proc_return_code ?: '-');
        $html .= $this->viewRow($this->l('Hata Kodu'), $log->error_code ?: '-');
        $html .= $this->viewRow($this->l('Hata Mesajı'), $log->error_message ?: '-');
        $html .= $this->viewRow($this->l('Tahsilat Yapan'), $log->collector_firstname . ' ' . $log->collector_lastname . ' (ID: ' . $log->collector_user_id . ')');
        $html .= $this->viewRow($this->l('Referans No'), $log->reference_number ?: '-');
        $html .= $this->viewRow($this->l('Açıklama'), $log->description ?: '-');
        $html .= '</table>';
        $html .= '<a href="' . self::$currentIndex . '&token=' . $this->token . '" class="btn btn-default">';
        $html .= '<i class="process-icon-back"></i> ' . $this->l('Listeye Dön');
        $html .= '</a>';
        $html .= '</div>';

        return $html;
    }

    /**
     * Detay tablosu satır yardımcısı.
     */
    private function viewRow(string $label, string $value): string
    {
        return '<tr><td><strong>' . $label . '</strong></td><td>' . $value . '</td></tr>';
    }

    // ═══════════════════════════════════════════════════════════
    //  CSV Dışa Aktarma
    // ═══════════════════════════════════════════════════════════

    /**
     * CSV dışa aktarma işlemini gerçekleştirir.
     *
     * PrestaShop'un yerleşik processExport mekanizmasını kullanır.
     * Toolbar'daki "CSV Dışa Aktar" butonu bu metodu tetikler.
     */
    public function processExport($textDelimiter = '"')
    {
        // Filtreler uygulanmış listeyi al
        $this->getList($this->context->language->id);

        if (empty($this->_list)) {
            $this->errors[] = $this->l('Dışa aktarılacak kayıt bulunamadı.');
            return;
        }

        // CSV başlıkları
        $headers = [
            'ID',
            $this->l('İşlem Tarihi'),
            $this->l('Müşteri Adı'),
            $this->l('Müşteri Soyadı'),
            $this->l('E-posta'),
            $this->l('Şirket'),
            $this->l('Tutar'),
            $this->l('Durum'),
            $this->l('İşlem Tipi'),
            $this->l('Nestpay Sipariş ID'),
            $this->l('Auth Code'),
            $this->l('Host Ref Num'),
            $this->l('Trans ID'),
            $this->l('ProcReturnCode'),
            $this->l('Hata Kodu'),
            $this->l('Hata Mesajı'),
            $this->l('Tahsilat Yapan'),
            $this->l('Referans No'),
            $this->l('Açıklama'),
        ];

        $filename = 'tahsilat_loglari_' . date('Y-m-d_H-i-s') . '.csv';

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-cache, no-store, must-revalidate');

        $output = fopen('php://output', 'w');

        // UTF-8 BOM — Excel'de Türkçe karakter desteği
        fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

        fputcsv($output, $headers, ';', $textDelimiter);

        foreach ($this->_list as $row) {
            switch ($row['status']) {
                case 'success':
                    $statusLabel = $this->l('Başarılı');
                    break;
                case 'voided':
                    $statusLabel = $this->l('İptal Edildi');
                    break;
                case 'refunded':
                    $statusLabel = $this->l('İade Edildi');
                    break;
                default:
                    $statusLabel = $this->l('Başarısız');
                    break;
            }

            $collectorName = trim($row['collector_firstname'] . ' ' . $row['collector_lastname']);

            fputcsv($output, [
                $row['id_payment_log'],
                $row['date_add'],
                $row['customer_firstname'],
                $row['customer_lastname'],
                $row['customer_email'] ?? '',
                $row['company_name'],
                number_format((float) $row['amount'], 2, ',', '.'),
                $statusLabel,
                $row['transaction_type'] ?? '',
                $row['nestpay_order_id'] ?? '',
                $row['auth_code'] ?? '',
                $row['host_ref_num'] ?? '',
                $row['trans_id'] ?? '',
                $row['proc_return_code'] ?? '',
                $row['error_code'] ?? '',
                $row['error_message'] ?? '',
                $collectorName,
                $row['reference_number'] ?? '',
                $row['description'] ?? '',
            ], ';', $textDelimiter);
        }

        fclose($output);
        exit;
    }

    // ═══════════════════════════════════════════════════════════
    //  Erişim kontrolü — salt okunur
    // ═══════════════════════════════════════════════════════════

    /**
     * Ekleme işlemini devre dışı bırakır.
     */
    public function initProcess()
    {
        parent::initProcess();

        // Log kayıtları yalnızca okunabilir — ekleme/düzenleme/silme yok
        if ($this->action === 'new' || $this->action === 'edit' || $this->action === 'delete') {
            $this->errors[] = $this->l('Tahsilat logları salt okunurdur.');
            $this->action = '';
        }
    }
}
