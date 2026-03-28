<?php
/**
 * KdepoPaymentLog — ps_kdepo_payment_log tablosu için ObjectModel.
 *
 * PrestaShop AdminController'ın liste, filtreleme ve sıralama özelliklerini
 * kullanabilmesi için gerekli model tanımı.
 *
 * @author K-Depo
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class KdepoPaymentLog extends ObjectModel
{
    /** @var int */
    public $id_payment_log;

    /** @var string */
    public $date_add;

    /** @var string */
    public $customer_firstname;

    /** @var string */
    public $customer_lastname;

    /** @var string|null */
    public $customer_email;

    /** @var string */
    public $company_name;

    /** @var float */
    public $amount;

    /** @var string success|failed */
    public $status;

    /** @var string|null */
    public $error_code;

    /** @var string|null */
    public $error_message;

    /** @var int */
    public $collector_user_id;

    /** @var string */
    public $collector_firstname;

    /** @var string */
    public $collector_lastname;

    /** @var string|null */
    public $reference_number;

    /** @var string|null */
    public $description;

    /** @var int|null */
    public $id_customer;

    /** @var string|null */
    public $auth_code;

    /** @var string|null */
    public $host_ref_num;

    /** @var string|null */
    public $trans_id;

    /** @var string|null */
    public $proc_return_code;

    /** @var string|null */
    public $transaction_type;

    /** @var string|null */
    public $nestpay_order_id;

    /**
     * ObjectModel tanımı.
     *
     * @see ObjectModel::$definition
     */
    public static $definition = [
        'table'   => 'kdepo_payment_log',
        'primary' => 'id_payment_log',
        'fields'  => [
            'date_add'            => ['type' => self::TYPE_DATE,    'validate' => 'isDate',       'required' => true],
            'customer_firstname'  => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','required' => true, 'size' => 255],
            'customer_lastname'   => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','required' => true, 'size' => 255],
            'customer_email'      => ['type' => self::TYPE_STRING,  'validate' => 'isEmail',      'size' => 255],
            'company_name'        => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','required' => true, 'size' => 255],
            'amount'              => ['type' => self::TYPE_FLOAT,   'validate' => 'isPrice',      'required' => true],
            'status'              => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','required' => true],
            'error_code'          => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 50],
            'error_message'       => ['type' => self::TYPE_HTML,    'validate' => 'isCleanHtml'],
            'collector_user_id'   => ['type' => self::TYPE_INT,     'validate' => 'isUnsignedId', 'required' => true],
            'collector_firstname' => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','required' => true, 'size' => 255],
            'collector_lastname'  => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','required' => true, 'size' => 255],
            'reference_number'    => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 50],
            'description'         => ['type' => self::TYPE_HTML,    'validate' => 'isCleanHtml'],
            'id_customer'         => ['type' => self::TYPE_INT,     'validate' => 'isUnsignedId'],
            'auth_code'           => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 50],
            'host_ref_num'        => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 50],
            'trans_id'            => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 50],
            'proc_return_code'    => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 10],
            'transaction_type'    => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 20],
            'nestpay_order_id'    => ['type' => self::TYPE_STRING,  'validate' => 'isGenericName','size' => 64],
        ],
    ];
}
