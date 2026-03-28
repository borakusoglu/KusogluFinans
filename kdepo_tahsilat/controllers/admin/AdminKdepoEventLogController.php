<?php
/**
 * AdminKdepoEventLogController — Ödeme akışı event logları admin sayfası.
 *
 * Her ödeme girişiminin adım adım takibini sağlar:
 * form_submit → 3d_redirect → 3d_callback → payment_success/payment_failed
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class AdminKdepoEventLogController extends ModuleAdminController
{
    public function __construct()
    {
        $this->bootstrap  = true;
        $this->table      = 'kdepo_event_log';
        $this->identifier = 'id_event_log';
        $this->className  = 'ObjectModel';
        $this->lang       = false;

        $this->_defaultOrderBy  = 'date_add';
        $this->_defaultOrderWay = 'DESC';
        $this->list_no_link     = true;
        $this->allow_export     = true;

        parent::__construct();

        $this->meta_title = $this->l('Odeme Akis Loglari');

        $this->fields_list = [
            'id_event_log' => [
                'title' => 'ID',
                'align' => 'center',
                'class' => 'fixed-width-xs',
            ],
            'date_add' => [
                'title' => $this->l('Tarih'),
                'type'  => 'datetime',
            ],
            'session_id' => [
                'title' => $this->l('Islem ID'),
                'class' => 'fixed-width-lg',
            ],
            'event_type' => [
                'title'    => $this->l('Adim'),
                'callback' => 'renderEventBadge',
            ],
            'card_last4' => [
                'title' => $this->l('Kart Son 4'),
                'align' => 'center',
                'class' => 'fixed-width-xs',
            ],
            'card_holder' => [
                'title' => $this->l('Kart Sahibi'),
            ],
            'card_bank' => [
                'title' => $this->l('Banka'),
            ],
            'card_brand' => [
                'title' => $this->l('Marka'),
                'class' => 'fixed-width-xs',
            ],
            'amount' => [
                'title'    => $this->l('Tutar'),
                'type'     => 'price',
                'currency' => true,
                'align'    => 'right',
            ],
            'company_name' => [
                'title' => $this->l('Sirket'),
            ],
            'payer_name' => [
                'title' => $this->l('Odeyen'),
            ],
            'status' => [
                'title'    => $this->l('Durum'),
                'callback' => 'renderStatusBadge',
            ],
            'error_message' => [
                'title'    => $this->l('Hata'),
                'maxlength' => 60,
            ],
            'reference_number' => [
                'title' => $this->l('Referans'),
            ],
            'ip_address' => [
                'title' => $this->l('IP'),
                'class' => 'fixed-width-md',
            ],
        ];
    }

    /**
     * Event tipi rozeti.
     */
    public function renderEventBadge($value, $row)
    {
        $badges = [
            'form_submit'     => ['renk' => '#2196F3', 'etiket' => 'Form Gonderildi'],
            '3d_redirect'     => ['renk' => '#FF9800', 'etiket' => '3D Yonlendirme'],
            '3d_callback'     => ['renk' => '#9C27B0', 'etiket' => '3D Yanit'],
            'payment_success' => ['renk' => '#4CAF50', 'etiket' => 'Basarili'],
            'payment_failed'  => ['renk' => '#F44336', 'etiket' => 'Basarisiz'],
            'api_request'     => ['renk' => '#607D8B', 'etiket' => 'API'],
        ];
        $b = isset($badges[$value]) ? $badges[$value] : ['renk' => '#999', 'etiket' => $value];
        return '<span style="background:' . $b['renk'] . ';color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;">' . $b['etiket'] . '</span>';
    }

    /**
     * Durum rozeti.
     */
    public function renderStatusBadge($value, $row)
    {
        if ($value === 'success') {
            return '<span class="badge badge-success">Basarili</span>';
        } elseif ($value === 'failed') {
            return '<span class="badge badge-danger">Basarisiz</span>';
        } elseif ($value === '3d_redirect') {
            return '<span class="badge badge-warning">3D Bekleniyor</span>';
        }
        return '<span class="badge badge-default">' . htmlspecialchars($value) . '</span>';
    }

    /**
     * Salt okunur — ekleme/düzenleme/silme yok.
     */
    public function initProcess()
    {
        parent::initProcess();
        if (in_array($this->action, ['new', 'edit', 'delete'])) {
            $this->errors[] = $this->l('Event loglar salt okunurdur.');
            $this->action = '';
        }
    }
}
