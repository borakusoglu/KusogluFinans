<?php
/**
 * BIN Lookup AJAX Endpoint
 * turkey_bins.csv dosyasından BIN sorgular, JSON döner.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class Kdepo_TahsilatBinlookupModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();

        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: public, max-age=86400'); // 1 gün cache

        $bin = (int) Tools::getValue('bin', 0);
        if ($bin < 100000 || $bin > 999999) {
            die(json_encode(['found' => false]));
        }

        $csvPath = _PS_MODULE_DIR_ . 'kdepo_tahsilat/data/turkey_bins.csv';
        if (!file_exists($csvPath)) {
            die(json_encode(['found' => false, 'error' => 'CSV not found']));
        }

        $result = null;
        if (($handle = fopen($csvPath, 'r')) !== false) {
            // Header satırını atla
            fgetcsv($handle);

            while (($row = fgetcsv($handle)) !== false) {
                if ((int) $row[0] === $bin) {
                    $result = [
                        'found'    => true,
                        'bin'      => $bin,
                        'brand'    => $row[1] ?? '',
                        'type'     => $row[2] ?? '',
                        'category' => $row[3] ?? '',
                        'issuer'   => $row[4] ?? '',
                    ];
                    break;
                }
            }
            fclose($handle);
        }

        die(json_encode($result ?: ['found' => false]));
    }
}
