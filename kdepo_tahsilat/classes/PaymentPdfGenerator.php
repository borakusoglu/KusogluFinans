<?php
/**
 * Ödeme makbuzu PDF oluşturucu.
 * 1) PrestaShop autoload üzerinden TCPDF'i dener
 * 2) Bilinen yollardan TCPDF'i arar
 * 3) Hiçbiri yoksa HTML makbuzu .html eki olarak döndürür
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class PaymentPdfGenerator
{
    /**
     * @param array $data Ödeme verileri
     * @return array|null ['path' => string, 'name' => string, 'mime' => string] veya null
     */
    public static function generate(array $data): ?array
    {
        $html = self::buildReceiptHtml($data);

        // PrestaShop composer autoload'u yükle (TCPDF dahil)
        $autoload = _PS_ROOT_DIR_ . '/vendor/autoload.php';
        if (file_exists($autoload)) {
            require_once $autoload;
        }

        // TCPDF zaten yüklü mü?
        if (class_exists('TCPDF')) {
            $path = self::generateWithTcpdf($html, $data);
            if ($path) {
                return [
                    'path' => $path,
                    'name' => 'tahsilat-makbuzu.pdf',
                    'mime' => 'application/pdf',
                ];
            }
        }

        // Manuel TCPDF yolları
        $tcpdfPaths = [
            _PS_TOOL_DIR_ . 'tcpdf/tcpdf.php',
            _PS_ROOT_DIR_ . '/vendor/tecnickcom/tcpdf/tcpdf.php',
            _PS_ROOT_DIR_ . '/tools/tcpdf/tcpdf.php',
        ];

        foreach ($tcpdfPaths as $p) {
            if (file_exists($p)) {
                require_once $p;
                if (class_exists('TCPDF')) {
                    $path = self::generateWithTcpdf($html, $data);
                    if ($path) {
                        return [
                            'path' => $path,
                            'name' => 'tahsilat-makbuzu.pdf',
                            'mime' => 'application/pdf',
                        ];
                    }
                }
            }
        }

        // TCPDF hiç bulunamadı — HTML fallback
        PrestaShopLogger::addLog(
            'kdepo_tahsilat: TCPDF bulunamadı, HTML makbuzu oluşturuluyor.',
            2, null, 'Kdepo_Tahsilat'
        );

        return self::generateHtmlFallback($html, $data);
    }

    private static function generateWithTcpdf(string $html, array $data): ?string
    {
        try {
            $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
            $pdf->SetCreator('Kuşoğlu Gıda Tahsilat');
            $pdf->SetAuthor('Kuşoğlu Gıda');
            $pdf->SetTitle('Tahsilat Makbuzu - ' . ($data['reference_number'] ?? ''));
            $pdf->SetMargins(20, 15, 20);
            $pdf->SetAutoPageBreak(true, 15);
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);

            // Türkçe karakter desteği: dejavusans fontu zorunlu
            $pdf->SetFont('dejavusans', '', 10);

            $pdf->AddPage();

            // Logo ekle — sol üst köşe, başlıkla arasında mesafe
            $logoPath = _PS_MODULE_DIR_ . 'kdepo_tahsilat/views/img/kusoglu-logo.png';
            if (file_exists($logoPath)) {
                $margins = $pdf->getMargins();
                $logoW = 32;
                $pdf->Image($logoPath, $margins['left'], 15, $logoW, 0, 'PNG');
                $pdf->Ln(36); // Logo ile TAHSİLAT MAKBUZU arasında boşluk
            }

            $pdf->writeHTML($html, true, false, true, false, '');

            $tmpFile = tempnam(sys_get_temp_dir(), 'kdepo_pdf_') . '.pdf';
            $pdf->Output($tmpFile, 'F');

            return $tmpFile;
        } catch (\Exception $e) {
            PrestaShopLogger::addLog(
                'kdepo_tahsilat: PDF oluşturma hatası — ' . $e->getMessage(),
                3, null, 'Kdepo_Tahsilat'
            );
            return null;
        }
    }

    /**
     * TCPDF yoksa HTML makbuzu dosya olarak döndürür.
     */
    private static function generateHtmlFallback(string $html, array $data): ?array
    {
        try {
            $fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tahsilat Makbuzu</title></head><body>' . $html . '</body></html>';
            $tmpFile = tempnam(sys_get_temp_dir(), 'kdepo_html_') . '.html';
            file_put_contents($tmpFile, $fullHtml);

            return [
                'path' => $tmpFile,
                'name' => 'tahsilat-makbuzu.html',
                'mime' => 'text/html',
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Makbuz HTML'i oluşturur — Modern, sade ve premium tasarım.
     * (TCPDF'in render motoru göz önüne alınarak table tabanlı kusursuz hizalama yapılmıştır.)
     */
    private static function buildReceiptHtml(array $data): string
    {
        $isSuccess = ($data['status'] ?? 'success') === 'success';
        $date = $data['date'] ?? date('Y-m-d H:i:s');

        $e = function ($str) {
            return htmlspecialchars((string) $str, ENT_QUOTES, 'UTF-8');
        };

        // Veri Değişkenleri
        $payerName   = $data['payer_name'] ?? '';
        $companyName = $data['company_name'] ?? '';
        $fullName    = trim(($data['firstname'] ?? '') . ' ' . ($data['lastname'] ?? ''));
        $amount      = $data['amount'] ?? '0,00';
        $reference   = $data['reference_number'] ?? '';
        $maskedCard  = $data['masked_card'] ?? '';
        $cardBank    = $data['card_bank'] ?? '';
        $cardBrand   = $data['card_brand'] ?? '';

        $html = '<div style="font-family:dejavusans; color:#333;">';

        // ── TAHSİLAT MAKBUZU başlığı ──
        $html .= '<h2 style="text-align:center; font-size:15px; color:#1a5276; margin-bottom:18px; letter-spacing:2px;">TAHSİLAT MAKBUZU</h2>';

        // ── Hitap ──
        $sayinLine = 'Sayın';
        if ($payerName) $sayinLine .= ' ' . $e($payerName);
        $html .= '<p style="font-size:12px; margin-bottom:8px;">' . $sayinLine . ',</p>';

        // ── Açıklama metni ──
        if ($isSuccess) {
            $html .= '<p style="font-size:11px; margin-bottom:3px;">İşleminiz başarıyla gerçekleşti.</p>';
            $html .= '<p style="font-size:11px; margin-bottom:3px;">Aşağıda bilgileri bulunan işlem cari hesabınıza alacak kaydedilecektir.</p>';
            $html .= '<p style="font-size:11px; margin-bottom:18px;">Bu belge aynı zamanda tahsilat makbuzu niteliğindedir.</p>';
        } else {
            $html .= '<p style="font-size:11px; margin-bottom:18px; color:#c0392b;">İşleminiz başarısız olmuştur.</p>';
        }

        // ── İşlem Detayları (çerçeveli tablo) ──
        $html .= '<table width="100%" cellpadding="7" cellspacing="0" style="font-size:11px; border:1px solid #ddd; border-radius:4px;">';
        $html .= '<tr style="background:#f7f9fc;">';
        $html .= '<td colspan="2" style="font-weight:bold; font-size:12px; color:#1a5276; border-bottom:1px solid #ddd; padding:8px 7px;">İşlem Detayları</td>';
        $html .= '</tr>';
        if ($companyName) {
            $html .= '<tr><td width="35%" style="border-bottom:1px solid #f0f0f0;">Şirket Ünvanı</td><td width="65%" style="border-bottom:1px solid #f0f0f0;">: ' . $e($companyName) . '</td></tr>';
        }
        $html .= '<tr><td width="35%" style="border-bottom:1px solid #f0f0f0;">İşlem Tarihi</td><td width="65%" style="border-bottom:1px solid #f0f0f0;">: ' . $e($date) . '</td></tr>';
        $html .= '<tr><td style="border-bottom:1px solid #f0f0f0;">Toplam Tutar</td><td style="border-bottom:1px solid #f0f0f0;">: ' . $e($amount) . '</td></tr>';
        if ($reference) {
            $html .= '<tr><td style="border-bottom:1px solid #f0f0f0;">Referans No</td><td style="border-bottom:1px solid #f0f0f0;">' . ': ' . $e($reference) . '</td></tr>';
        }
        $html .= '</table>';

        // ── Beyan metni ──
        $html .= '<br>';
        $html .= '<p style="font-size:10px; line-height:1.6; color:#555;">';
        $html .= 'Yukarıda bulunan ödeme bilgilerinin, ödeme sisteminde kullanıldığını ve bu işlem karşılığında ürün/hizmet aldığımı kabul ve beyan ederim.';
        $html .= '</p>';

        // ── POS / Kart Bilgileri (çerçeveli tablo) ──
        $html .= '<br>';
        $html .= '<table width="100%" cellpadding="7" cellspacing="0" style="font-size:11px; border:1px solid #ddd; border-radius:4px;">';
        $html .= '<tr style="background:#f7f9fc;">';
        $html .= '<td colspan="2" style="font-weight:bold; font-size:12px; color:#1a5276; border-bottom:1px solid #ddd; padding:8px 7px;">POS / Kart Bilgileri</td>';
        $html .= '</tr>';
        $html .= '<tr><td width="35%" style="border-bottom:1px solid #f0f0f0;">POS</td><td width="65%" style="border-bottom:1px solid #f0f0f0;">: Ziraat Pos - Asseco</td></tr>';
        if ($fullName) {
            $html .= '<tr><td style="border-bottom:1px solid #f0f0f0;">Kart Sahibi</td><td style="border-bottom:1px solid #f0f0f0;">: ' . $e($fullName) . '</td></tr>';
        }
        if ($maskedCard) {
            $html .= '<tr><td style="border-bottom:1px solid #f0f0f0;">Kart No</td><td style="border-bottom:1px solid #f0f0f0;">: ' . $e($maskedCard) . '</td></tr>';
        }
        if ($cardBank) {
            $html .= '<tr><td style="border-bottom:1px solid #f0f0f0;">Kart Bankası</td><td style="border-bottom:1px solid #f0f0f0;">: ' . $e($cardBank) . '</td></tr>';
        }
        if ($cardBrand) {
            $html .= '<tr><td>Kart</td><td>: ' . $e($cardBrand) . '</td></tr>';
        }
        $html .= '</table>';

        // ── Hata Detayları (başarısızsa) ──
        if (!$isSuccess && (!empty($data['error_code']) || !empty($data['error_message']))) {
            $html .= '<br>';
            $html .= '<table width="100%" cellpadding="7" cellspacing="0" style="font-size:10px; border:1px solid #fadbd8; border-radius:4px;">';
            $html .= '<tr style="background:#fdf2f2;"><td colspan="2" style="font-weight:bold; color:#c0392b; border-bottom:1px solid #fadbd8;">Hata Detayı</td></tr>';
            if (!empty($data['error_code'])) {
                $html .= '<tr><td width="35%" style="color:#c0392b;">Hata Kodu</td><td style="color:#c0392b;">: ' . $e($data['error_code']) . '</td></tr>';
            }
            if (!empty($data['error_message'])) {
                $html .= '<tr><td width="35%" style="color:#c0392b;">Mesaj</td><td style="color:#c0392b;">: ' . $e($data['error_message']) . '</td></tr>';
            }
            $html .= '</table>';
        }

        // ── Footer ──
        $html .= '<br><br>';
        $html .= '<p style="font-size:8px; color:#999; text-align:center; border-top:1px solid #eee; padding-top:10px;">';
        $html .= 'Bu makbuz elektronik ortamda otomatik olarak oluşturulmuştur. Belge Üretim Zamanı: ' . date('d.m.Y H:i:s');
        $html .= '</p>';

        $html .= '</div>';

        return $html;
    }
}
