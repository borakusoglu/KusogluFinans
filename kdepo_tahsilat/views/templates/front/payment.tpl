{extends file='page.tpl'}

{block name='page_title'}
  Kuşoğlu Gıda Tahsilat Formu
{/block}

{block name='page_content'}
<style>
  .kdepo-payment-container { max-width:1060px; margin:0 auto 40px; overflow:visible !important; }

  /* Yazdırma: sadece makbuz içeriği */
  @media print {
    header, footer, nav, #header, #footer, .breadcrumb, .header-top, .header-nav,
    #wrapper > .container > .row > #left-column,
    .kdepo-payment-container .btn { display:none !important; }
    .kdepo-payment-container { margin:0 !important; padding:0 !important; max-width:100% !important; }
    .kdepo-payment-container > div { padding:0 !important; margin:0 !important; }
    body, #wrapper, #content-wrapper, #main { margin:0 !important; padding:0 !important; }
  }
  .kdepo-top-row { display:flex; gap:20px; align-items:stretch; margin-bottom:18px; }
  .kdepo-card-col { flex:0 0 400px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding-top:15px; }
  .kdepo-form-col { flex:1 1 0; min-width:0; }
  .kdepo-bottom-row { display:flex; gap:20px; align-items:flex-end; }
  .kdepo-bottom-left { flex:1 1 0; min-width:0; }
  .kdepo-bottom-right { flex:0 0 400px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding:0 10px 0; }
  .kdepo-field { margin-bottom:10px; }
  .kdepo-field label { display:block; font-size:12px; color:#888; margin-bottom:2px; font-weight:500; }
  .kdepo-field .req { color:#e53935; }
  .kdepo-field .form-control { padding:8px 10px; font-size:14px; border-radius:6px; }
  .kdepo-row { display:flex; gap:10px; }
  .kdepo-row > div { flex:1; }
  .kdepo-fieldset { border:1px solid #d5d5d5; border-radius:10px; padding:16px 16px 8px; background:#eeeeee; }
  .kdepo-fieldset legend { font-size:13px; font-weight:600; padding:0 6px; color:#444; }
  .kdepo-field .form-control { padding:8px 10px; font-size:14px; border-radius:6px; background:#fff; }
  .kdepo-submit { width:100%; padding:13px; font-size:15px; font-weight:bold; border-radius:10px; margin-top:10px; }
  .kdepo-amount-display { font-size:22px; font-weight:600; color:#333; text-align:center; margin-bottom:10px; }
  .kdepo-amount-display .label { font-size:14px; color:#888; font-weight:400; }
  .kdepo-divider { border:none; border-top:2px solid #333; margin:10px 0; width:100%; }
  .kdepo-bank-name { text-align:center; margin-top:8px; font-size:12px; color:#999; min-height:18px; transition:all .3s; }
  .kdepo-bank-name.active { color:#333; font-weight:500; }

  /* E-posta tooltip */
  .kdepo-email-hint {
    display:none; position:absolute; bottom:100%; left:0; right:0;
    background:#333; color:#fff; font-size:11px; padding:6px 10px;
    border-radius:6px; z-index:20; line-height:1.4; margin-bottom:4px;
  }
  .kdepo-email-hint-trigger:hover ~ input ~ .kdepo-email-hint,
  .kdepo-email-hint.show { display:block; }
  .jp-card-container { overflow:visible !important; transform-origin:center top !important; }
  .kdepo-card-col { overflow:visible !important; }
  .card-wrapper { overflow:visible !important; }

  /* Kart üzerindeki isim alanı — taşmayı önle */
  .jp-card .jp-card-name { font-size:14px !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; max-width:200px !important; }
  /* card.js lisans yazısını şirket bilgisiyle değiştir */
  .jp-card .jp-card-back .jp-card-shiny:after {
    content: "Kuşoğlu Gıda Maddeleri Pazarlama Sanayi ve Ticaret Limited Şirketi ödeme sistemi üzerinden ödeme yapmaktasınız." !important;
  }

  /* Default kart rengi */
  .jp-card .jp-card-front, .jp-card .jp-card-back {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%) !important;
  }
  /* Banka renkleri — CSS class ile override */
  .jp-card.bank-ziraat .jp-card-front, .jp-card.bank-ziraat .jp-card-back { background:linear-gradient(135deg,#1a5276 0%,#2980b9 100%) !important; }
  .jp-card.bank-halk .jp-card-front, .jp-card.bank-halk .jp-card-back { background:linear-gradient(135deg,#1b4f72 0%,#2e86c1 100%) !important; }
  .jp-card.bank-vakif .jp-card-front, .jp-card.bank-vakif .jp-card-back { background:linear-gradient(135deg,#1a237e 0%,#3949ab 100%) !important; }
  .jp-card.bank-garanti .jp-card-front, .jp-card.bank-garanti .jp-card-back { background:linear-gradient(135deg,#1b5e20 0%,#388e3c 100%) !important; }
  .jp-card.bank-is .jp-card-front, .jp-card.bank-is .jp-card-back { background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%) !important; }
  .jp-card.bank-yapi-kredi .jp-card-front, .jp-card.bank-yapi-kredi .jp-card-back { background:linear-gradient(135deg,#1a237e 0%,#4a148c 100%) !important; }
  .jp-card.bank-akbank .jp-card-front, .jp-card.bank-akbank .jp-card-back { background:linear-gradient(135deg,#b71c1c 0%,#e53935 100%) !important; }
  .jp-card.bank-deniz .jp-card-front, .jp-card.bank-deniz .jp-card-back { background:linear-gradient(135deg,#00695c 0%,#00897b 100%) !important; }
  .jp-card.bank-finans .jp-card-front, .jp-card.bank-finans .jp-card-back { background:linear-gradient(135deg,#4a148c 0%,#7b1fa2 100%) !important; }
  .jp-card.bank-ing .jp-card-front, .jp-card.bank-ing .jp-card-back { background:linear-gradient(135deg,#e65100 0%,#ff6d00 100%) !important; }
  .jp-card.bank-teb .jp-card-front, .jp-card.bank-teb .jp-card-back { background:linear-gradient(135deg,#1565c0 0%,#42a5f5 100%) !important; }
  .jp-card.bank-hsbc .jp-card-front, .jp-card.bank-hsbc .jp-card-back { background:linear-gradient(135deg,#b71c1c 0%,#c62828 100%) !important; }
  .jp-card.bank-seker .jp-card-front, .jp-card.bank-seker .jp-card-back { background:linear-gradient(135deg,#827717 0%,#9e9d24 100%) !important; }
  .jp-card.bank-kuveyt .jp-card-front, .jp-card.bank-kuveyt .jp-card-back { background:linear-gradient(135deg,#004d40 0%,#00796b 100%) !important; }
  .jp-card.bank-albaraka .jp-card-front, .jp-card.bank-albaraka .jp-card-back { background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%) !important; }
  .jp-card.bank-turkiye-finans .jp-card-front, .jp-card.bank-turkiye-finans .jp-card-back { background:linear-gradient(135deg,#006064 0%,#00838f 100%) !important; }
  .jp-card.bank-anadolu .jp-card-front, .jp-card.bank-anadolu .jp-card-back { background:linear-gradient(135deg,#1a237e 0%,#283593 100%) !important; }
  .jp-card.bank-api .jp-card-front, .jp-card.bank-api .jp-card-back { background:linear-gradient(135deg,#37474f 0%,#546e7a 100%) !important; }

  /* Kart üstü banka logosu (sağ üst) */
  .jp-card .jp-card-front { position:relative !important; }
  .kdepo-bank-logo {
    position:absolute; top:9px; right:11px; z-index:10;
    height:45px; width:auto; max-width:135px;
    object-fit:contain; opacity:0; transition:opacity .3s;
    pointer-events:none;
  }
  .kdepo-bank-logo.active { opacity:0.9; }

  /* Kart üstü kart markası (sağ alt) */
  .kdepo-brand-logo {
    position:absolute; bottom:12px; right:14px; z-index:10;
    height:18px; width:auto; max-width:45px;
    object-fit:contain; opacity:0; transition:opacity .3s;
    pointer-events:none;
  }
  .kdepo-brand-logo.active { opacity:0.9; }

  /* card.js'nin kendi logo'larını gizle — bizimkiler gösterilecek */
  .jp-card .jp-card-front .jp-card-logo,
  .jp-card .jp-card-front .jp-card-logo.jp-card-visa,
  .jp-card .jp-card-front .jp-card-logo.jp-card-mastercard,
  .jp-card .jp-card-front .jp-card-logo.jp-card-amex,
  .jp-card .jp-card-front .jp-card-logo.jp-card-discover,
  .jp-card .jp-card-front .jp-card-logo.jp-card-troy { display:none !important; visibility:hidden !important; }

  @media (max-width:768px) {
    .kdepo-top-row { flex-direction:column; align-items:stretch; }
    .kdepo-card-col { flex:0 0 auto; width:100%; order:-1; }
    .kdepo-form-col { width:100%; order:0; }
    .kdepo-bottom-row { flex-direction:column; }
    .kdepo-bottom-left { width:100%; }
    .kdepo-bottom-right { flex:0 0 auto; width:100%; }

    /* Kart görseli mobilde — JS ile scale ediliyor */
    .kdepo-card-col { padding:10px 0; overflow:visible !important; max-width:100%; }
    .kdepo-card-col .card-wrapper { overflow:visible !important; width:100%; margin:0 auto; }
    .kdepo-card-col .jp-card-container { overflow:visible !important; }
    .kdepo-payment-container { overflow:visible !important; }
    .kdepo-top-row { overflow:visible !important; }

    /* Ödeme Tutarı: tutar üste, açıklama alta */
    .kdepo-amount-row { flex-direction:column !important; }
    .kdepo-amount-row > .kdepo-field { flex:1 1 100% !important; }
    .kdepo-amount-row > .kdepo-field:first-child .form-control { width:100%; }

    /* Kart bilgileri: her alan tek sıra, sadece SKT+CCV yanyana */
    .kdepo-card-fields-name { flex-direction:column !important; gap:0 !important; }
    .kdepo-card-fields-name > div { flex:1 1 100% !important; }

    /* Ödeme bilgileri: her alan tek sıra */
    .kdepo-payment-info-row { flex-direction:column !important; gap:0 !important; }
    .kdepo-payment-info-row > div { flex:1 1 100% !important; }
  }
</style>

<div class="kdepo-payment-container">

  {if $success}
    <div style="max-width:700px;margin:0 auto;padding:30px 20px;font-family:Arial,sans-serif;color:#333;">
      {* Logo *}
      {assign var='logo_path' value="{$smarty.const._PS_MODULE_DIR_}kdepo_tahsilat/views/img/kusoglu-logo.png"}
      {if file_exists($logo_path)}
        <div style="margin-bottom:20px;">
          <img src="{$smarty.const._MODULE_DIR_}kdepo_tahsilat/views/img/kusoglu-logo.png" alt="Kuşoğlu Gıda" style="max-height:80px;" />
        </div>
      {/if}

      {* PDF İndir ve Yazdır butonları *}
      {if $reference}
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        <a href="{$link->getModuleLink('kdepo_tahsilat', 'receipt', ['ref' => $reference])|escape:'html':'UTF-8'}"
           class="btn btn-default" style="flex:1;text-align:center;padding:12px;border-radius:8px;font-size:14px;">
          📄 Makbuzu İndir (PDF)
        </a>
        <button type="button" onclick="window.print();"
                class="btn btn-default" style="flex:1;text-align:center;padding:12px;border-radius:8px;font-size:14px;">
          🖨️ Yazdır
        </button>
      </div>
      {/if}

      {* Hitap *}
      <p style="font-size:15px;margin-bottom:5px;">
        Sayın {$payer_name|escape:'html':'UTF-8'},
      </p>

      {* Açıklama *}
      <p style="font-size:14px;margin-bottom:5px;">İşleminiz başarıyla gerçekleşti.</p>
      <p style="font-size:14px;margin-bottom:5px;">Aşağıda bilgileri bulunan işlem cari hesabınıza alacak kaydedilecektir.</p>
      <p style="font-size:14px;margin-bottom:20px;">Bu belge aynı zamanda tahsilat makbuzu niteliğindedir.</p>

      {* İşlem Detayları *}
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:6px 0;width:180px;">İşlem Tarihi</td>
          <td style="padding:6px 0;">: {$transaction_date|escape:'html':'UTF-8'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;">Toplam Tutar</td>
          <td style="padding:6px 0;">: {$amount|escape:'html':'UTF-8'} TL</td>
        </tr>
        {if $reference}
        <tr>
          <td style="padding:6px 0;">Referans No</td>
          <td style="padding:6px 0;">: <span style="font-family:monospace;">{$reference|escape:'html':'UTF-8'}</span></td>
        </tr>
        {/if}
      </table>

      {* Beyan *}
      <p style="font-size:13px;margin-bottom:25px;line-height:1.5;">
        Yukarıda bulunan ödeme bilgilerinin, ödeme sisteminde kullanıldığını ve bu işlem karşılığında ürün/hizmet aldığımı kabul ve beyan ederim.
      </p>

      {* POS / Kart Bilgileri *}
      <hr style="border:none;border-top:1px solid #ccc;margin-bottom:15px;" />
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:25px;">
        <tr>
          <td style="padding:6px 0;width:180px;">POS</td>
          <td style="padding:6px 0;">: Ziraat Pos - Asseco</td>
        </tr>
        <tr>
          <td style="padding:6px 0;">Kart Sahibi</td>
          <td style="padding:6px 0;">: {$firstname|escape:'html':'UTF-8'} {$lastname|escape:'html':'UTF-8'}</td>
        </tr>
        {if $masked_card}
        <tr>
          <td style="padding:6px 0;">Kart No</td>
          <td style="padding:6px 0;">: <span style="font-family:monospace;">{$masked_card|escape:'html':'UTF-8'}</span></td>
        </tr>
        {/if}
        {if $card_bank}
        <tr>
          <td style="padding:6px 0;">Kart Bankası</td>
          <td style="padding:6px 0;">: {$card_bank|escape:'html':'UTF-8'}</td>
        </tr>
        {/if}
        {if $card_brand}
        <tr>
          <td style="padding:6px 0;">Kart</td>
          <td style="padding:6px 0;">: {$card_brand|escape:'html':'UTF-8'}</td>
        </tr>
        {/if}
      </table>

      <a href="{$payment_url}" class="btn btn-primary" style="margin-top:10px;">Yeni Ödeme</a>
    </div>
  {else}

    {if $errors}
      <div class="alert alert-danger">
        <ul style="margin:0;padding-left:20px;">
          {foreach from=$errors item=err}<li>{$err|escape:'html':'UTF-8'}</li>{/foreach}
        </ul>
      </div>
    {/if}
    {if $error_message}
      <div class="alert alert-danger"><strong>Ödeme Hatası:</strong> {$error_message|escape:'html':'UTF-8'}</div>
    {/if}

    <form method="post" action="{$payment_url}" id="kdepo-payment-form">
      <input type="hidden" name="token" value="{$token|escape:'html':'UTF-8'}" />
      {* EN ÜST: Ödeme Tutarı + Açıklama *}
      <fieldset class="kdepo-fieldset" style="margin-bottom:18px;">
        <legend>Ödeme Tutarı</legend>
        <div class="kdepo-row kdepo-amount-row">
          <div class="kdepo-field" style="flex:1;">
            <label>Tutar (TL) <span class="req">*</span></label>
            <div style="display:flex;align-items:center;gap:4px;">
              <input type="text" id="amountTl" class="form-control" style="flex:2;"
                     placeholder="0" inputmode="numeric"
                     value="{if isset($amount_tl)}{$amount_tl|escape:'html':'UTF-8'}{/if}" required />
              <span style="font-size:18px;font-weight:bold;color:#999;">,</span>
              <input type="text" id="amountKurus" class="form-control" style="flex:1;"
                     placeholder="00" maxlength="2" inputmode="numeric"
                     value="{if isset($amount_kurus)}{$amount_kurus|escape:'html':'UTF-8'}{/if}" />
              <input type="hidden" name="amount" id="amountHidden" />
            </div>
          </div>
          <div class="kdepo-field" style="flex:2;">
            <label>Açıklama</label>
            <input type="text" name="description" class="form-control"
                   value="{if isset($description)}{$description|escape:'html':'UTF-8'}{/if}"
                   placeholder="Ödeme açıklaması (opsiyonel)" />
          </div>
        </div>
      </fieldset>

      {* ÜST SATIR: Kart bilgileri (sol) + Kart görseli (sağ, dikey ortalı) *}
      <div class="kdepo-top-row">
        <div class="kdepo-form-col">
          <fieldset class="kdepo-fieldset">
            <legend>Kart Bilgileri</legend>
            <div class="kdepo-field">
              <label>Kart Numarası <span class="req">*</span></label>
              <input type="text" name="cardNumber" id="cardNumber" class="form-control"
                     maxlength="23" placeholder="•••• •••• •••• ••••" required autocomplete="cc-number"
                     inputmode="numeric" style="letter-spacing:1px;" />
            </div>
            <div class="kdepo-row kdepo-card-fields-name">
              <div class="kdepo-field">
                <label>Ad <span class="req">*</span></label>
                <input type="text" name="firstname" id="firstname" class="form-control"
                       value="{$firstname|escape:'html':'UTF-8'}" required placeholder="Ad" />
              </div>
              <div class="kdepo-field">
                <label>Soyad <span class="req">*</span></label>
                <input type="text" name="lastname" id="lastname" class="form-control"
                       value="{$lastname|escape:'html':'UTF-8'}" required placeholder="Soyad" />
              </div>
            </div>
            <div class="kdepo-row">
              <div class="kdepo-field">
                <label>Son Kullanma <span class="req">*</span></label>
                <input type="text" name="expiryDate" id="expiryDate" class="form-control"
                       maxlength="5" placeholder="AA/YY" required autocomplete="cc-exp"
                       inputmode="numeric" />
              </div>
              <div class="kdepo-field">
                <label>CCV <span class="req">*</span></label>
                <input type="text" name="ccv" id="ccv" class="form-control"
                       maxlength="4" placeholder="•••" required autocomplete="cc-csc"
                       inputmode="numeric" />
              </div>
            </div>
          </fieldset>
        </div>
        <div class="kdepo-card-col">
          <div class="card-wrapper"></div>
          <div class="kdepo-bank-name" id="bankName"></div>
        </div>
      </div>

      {* ALT SATIR: Ödeme bilgileri (sol) + Tutar özeti & buton (sağ) *}
      <div class="kdepo-bottom-row">
        <div class="kdepo-bottom-left">
          <fieldset class="kdepo-fieldset">
          <legend>Ödeme Bilgileri</legend>
          <div class="kdepo-field">
            <label>Ödemeyi Yapan Kişi <span class="req">*</span></label>
            <input type="text" name="payer_name" id="payerName" class="form-control"
                   value="{if isset($payer_name)}{$payer_name|escape:'html':'UTF-8'}{/if}" required placeholder="Ad Soyad" />
          </div>
          <div class="kdepo-row kdepo-payment-info-row">
            <div class="kdepo-field">
              <label>Şirket İsmi <span class="req">*</span></label>
              <input type="text" name="company" class="form-control"
                     value="{$company|escape:'html':'UTF-8'}" required placeholder="Şirket" />
            </div>
            <div class="kdepo-field" style="position:relative;">
              <label>E-posta</label>
              <div style="position:relative;">
                <input type="email" name="email" class="form-control" style="padding-right:36px;"
                       value="{$email|escape:'html':'UTF-8'}" placeholder="ornek@mail.com" />
                <span class="kdepo-email-hint-trigger" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#1976d2;cursor:pointer;font-size:22px;line-height:1;">ⓘ</span>
              </div>
              <div class="kdepo-email-hint">Ödeme onay makbuzunun e-posta ile ulaşmasını istiyorsanız bu alanı doldurun.</div>
            </div>
          </div>
        </fieldset>
        </div>
        <div class="kdepo-bottom-right">
          <div class="kdepo-amount-display">
            <span class="label">Ödeme :</span> <span id="amountPreview">0,00</span> ₺
          </div>
          <hr class="kdepo-divider" />

          {* Sözleşme ve KVKK onay kutuları *}
          <div style="margin-bottom:12px;">
            <label style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:#555;cursor:pointer;margin-bottom:8px;">
              <input type="checkbox" id="agreementCheck" style="margin-top:2px;flex-shrink:0;" />
              <span><a href="#" id="openAgreementModal" style="color:#1976d2;text-decoration:underline;">Online Tahsilat Sistemi Kullanım ve Ödeme Koşulları</a>'nı okudum, onaylıyorum.</span>
            </label>
            <label style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:#555;cursor:pointer;">
              <input type="checkbox" id="kvkkCheck" style="margin-top:2px;flex-shrink:0;" />
              <span><a href="#" id="openKvkkModal" style="color:#1976d2;text-decoration:underline;">Kişisel Verilerin Korunması (KVKK) Aydınlatma Metni</a>'ni okudum, açık rıza veriyorum.</span>
            </label>
            <div id="agreementError" style="display:none;color:#e53935;font-size:11px;margin-top:4px;">Devam etmek için her iki kutucuğu da onaylamanız gerekmektedir.</div>
          </div>

          <button type="submit" name="submitKdepoPayment" class="btn btn-primary btn-lg btn-block kdepo-submit">
            💳 Ödeme Yap
          </button>
          <input type="hidden" name="card_bank" id="cardBankHidden" value="" />
          <input type="hidden" name="card_brand" id="cardBrandHidden" value="" />
        </div>
      </div>
    </form>

    {* ═══ SÖZLEŞME MODAL ═══ *}
    <div id="agreementModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;overflow-y:auto;">
      <div style="max-width:700px;margin:40px auto;background:#fff;border-radius:8px;padding:30px;position:relative;max-height:90vh;overflow-y:auto;">
        <button id="closeAgreementModal" style="position:absolute;top:10px;right:15px;background:none;border:none;font-size:22px;cursor:pointer;color:#999;">&times;</button>
        <h3 style="margin-top:0;font-size:16px;color:#333;">ONLINE TAHSİLAT SİSTEMİ KULLANIM VE ÖDEME KOŞULLARI</h3>
        <div style="font-size:13px;line-height:1.7;color:#444;">
          <p><strong>1. TARAFLAR VE KONU</strong><br>
          İşbu sözleşme; merkezi Manisa'da bulunan KUŞOĞLU GIDA MADDELERİ PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (bundan böyle kısaca "FİRMA" olarak anılacaktır) ile FİRMA'ya ait olan k-depo.com/kusoglu-tahsilat web sitesi üzerinden kredi kartı veya banka kartı ile online ödeme/tahsilat işlemi yapan kişi veya kurum (bundan böyle kısaca "MÜŞTERİ" olarak anılacaktır) arasındaki online tahsilat sisteminin kullanım şartlarını ve tarafların hak/yükümlülüklerini belirler.</p>

          <p><strong>2. GÜVENLİK VE KREDİ KARTI BİLGİLERİ</strong><br>
          2.1. FİRMA, tahsilat sisteminde uluslararası PCI-DSS güvenlik standartlarına uygun sanal POS altyapısı kullanmaktadır.<br>
          2.2. MÜŞTERİ'nin ödeme yaparken girdiği kredi kartı bilgileri (Kart Numarası, Son Kullanma Tarihi, CVV kodu vb.) hiçbir şekilde FİRMA sunucularında, veritabanlarında görüntülenemez, kaydedilemez ve saklanamaz. İşlem doğrudan banka ve yetkili ödeme kuruluşunun ekranlarında, 256-bit SSL şifreleme güvencesi ile gerçekleşir.</p>

          <p><strong>3. 3D SECURE (ŞİFRELİ ONAY) ZORUNLULUĞU</strong><br>
          3.1. Kötü niyetli kullanımların (çalıntı kart vb.) önüne geçmek amacıyla, sistem üzerinden yapılan tüm ödemelerde 3D Secure (SMS ile Doğrulama) kullanılması zorunludur.<br>
          3.2. MÜŞTERİ, bankasına kayıtlı cep telefonuna gelen şifreyi girerek işlemini kendi rızasıyla onayladığını kabul ve beyan eder. 3D Secure şifresi girilerek yapılan başarılı işlemler, MÜŞTERİ'nin tam bilgisi ve onayı dahilinde yapılmış sayılır. Başkasına ait kredi kartı ile yetkisiz işlem yapılması kesinlikle yasaktır ve hukuki/cezai sorumluluk işlemi yapan kişiye aittir.</p>

          <p><strong>4. İPTAL VE İADE KOŞULLARI</strong><br>
          4.1. k-depo.com/kusoglu-tahsilat adresi üzerinden yapılan işlemler, MÜŞTERİ'nin FİRMA'ya olan cari hesap borcuna veya almış olduğu/alacağı hizmet/ürün bedeline istinaden gerçekleştirilen tahsilat işlemleridir.<br>
          4.2. Yapılan başarılı bir ödemenin (tahsilatın) iptali veya iadesi; ancak mükerrer (çift) ödeme yapılması veya sistemsel bir hata sonucu yanlış tutar çekilmesi durumunda mümkündür.<br>
          4.3. İptal ve iade talepleri için MÜŞTERİ'nin işlemi yaptığı gün içerisinde <strong>0236 313 12 18</strong> numaralı telefondan veya <strong>muhasebe@kusoglultd.com</strong> e-posta adresinden FİRMA ile iletişime geçmesi gerekmektedir.<br>
          4.4. Onaylanan iade işlemleri, bankaların süreçlerine bağlı olarak 3 ila 14 iş günü içerisinde MÜŞTERİ'nin ödeme yaptığı ilgili kredi/banka kartına yapılır. Güvenlik kuralları gereği elden nakit iade veya farklı bir hesaba havale/EFT ile iade kesinlikle yapılamaz.</p>

          <p><strong>5. UYUŞMAZLIKLARIN ÇÖZÜMÜ</strong><br>
          İşbu kullanım ve ödeme koşullarından doğabilecek her türlü ihtilafta Manisa Mahkemeleri ve İcra Daireleri yetkilidir. MÜŞTERİ, ödeme ekranındaki "Okudum, onaylıyorum" kutucuğunu işaretlediğinde bu sözleşmedeki tüm maddeleri eksiksiz olarak kabul etmiş sayılır.</p>
        </div>
      </div>
    </div>

    {* ═══ KVKK MODAL ═══ *}
    <div id="kvkkModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;overflow-y:auto;">
      <div style="max-width:700px;margin:40px auto;background:#fff;border-radius:8px;padding:30px;position:relative;max-height:90vh;overflow-y:auto;">
        <button id="closeKvkkModal" style="position:absolute;top:10px;right:15px;background:none;border:none;font-size:22px;cursor:pointer;color:#999;">&times;</button>
        <h3 style="margin-top:0;font-size:16px;color:#333;">KİŞİSEL VERİLERİN KORUNMASI (KVKK) VE GİZLİLİK AYDINLATMA METNİ</h3>
        <div style="font-size:13px;line-height:1.7;color:#444;">
          <p><strong>Veri Sorumlusu:</strong> KUŞOĞLU GIDA MADDELERİ PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ</p>

          <p>Değerli Müşterimiz / İş Ortağımız,</p>

          <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, k-depo.com/kusoglu-tahsilat adresi üzerinden gerçekleştirdiğiniz online ödeme işlemleri sırasında bizimle paylaştığınız kişisel verileriniz (Ad, Soyad, Unvan, T.C. Kimlik / Vergi Numarası, Telefon Numarası, E-posta Adresi, Ödeme Tutarı, İşlem Tarihi ve IP Adresi) tarafımızca güvenli bir şekilde işlenmektedir.</p>

          <p><strong>1. Kişisel Verilerin İşlenme Amacı:</strong><br>
          Paylaştığınız veriler; tarafınıza tahsis edilen cari hesap borçlarınızın veya ürün/hizmet bedellerinin tahsil edilebilmesi, e-fatura/e-arşiv fatura düzenlenebilmesi, muhasebe kayıtlarının yasalara uygun tutulabilmesi ve doğabilecek hukuki uyuşmazlıklarda delil niteliği taşıması amacıyla işlenmektedir.</p>

          <p><strong>2. Kredi Kartı Güvenliği:</strong><br>
          Ödeme işlemi sırasında girdiğiniz kredi kartı numarası, son kullanma tarihi ve CVV güvenlik kodu gibi finansal verileriniz şirketimiz tarafından KESİNLİKLE görülmemekte ve sistemlerimizde kaydedilmemektedir. Bu veriler, şifrelenmiş olarak doğrudan işlem yaptığınız Banka veya yetkili Ödeme Kuruluşuna iletilmektedir.</p>

          <p><strong>3. Kişisel Verilerin Aktarımı:</strong><br>
          İşlenen kişisel verileriniz (iletişim ve kimlik bilgileriniz); yasal yükümlülüklerimizin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşları (Maliye Bakanlığı vb.) ile, ödemenin gerçekleşebilmesi ve güvenliğin (Chargeback / Ters İbraz önlemleri) sağlanması amacıyla altyapı hizmeti aldığımız BDDK ve TCMB lisanslı Sanal POS / Ödeme Kuruluşları ve Bankalar ile paylaşılabilmektedir.</p>

          <p>Sistemimizi kullanarak ve onay kutucuklarını işaretleyerek, kişisel verilerinizin bu aydınlatma metninde belirtilen amaçlar doğrultusunda işlenmesine ve ilgili kurumlara aktarılmasına özgür iradenizle açık rıza göstermiş olursunuz.</p>

          <p>Haklarınız ve detaylı bilgi için <strong>muhasebe@kusoglultd.com</strong> adresi üzerinden bizimle iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </div>
  {/if}
</div>

<script src="https://cdn.jsdelivr.net/npm/card@2.5.4/dist/card.js" integrity="sha384-f0jYdtPIPKCbcTH76cvGyzbU3gLKZ6b8cL2tmPZ/hdKw4tUgB8LulHcLFwJzoHlF" crossorigin="anonymous"></script>
<script>
var kdepo_binlookup_url = '{$link->getModuleLink("kdepo_tahsilat", "binlookup", ["bin" => ""])|escape:"javascript":"UTF-8"}';
var kdepo_bank_logo_base = '{$smarty.const._MODULE_DIR_}kdepo_tahsilat/views/img/banks/';
{literal}
document.addEventListener('DOMContentLoaded', function () {

  // Türk bankaları BIN → CSS class + banka adı eşleştirmesi
  // banka_kodu bazlı: { css_class, name, bins[] }
  var bankMap = {
    'ziraat':         { css:'bank-ziraat',         name:'Ziraat Bankası',   logo:'ziraat.png',         bins:[413226,444676,444677,444678,453955,453956,454671,454672,454673,454674,454894,540130,540134,541001,541033,542374,547287] },
    'halk':           { css:'bank-halk',           name:'Halkbank',         logo:'halk.png',           bins:[415514,492094,492095,498852,521378,540435,543081,552879,510056] },
    'vakif':          { css:'bank-vakif',          name:'VakıfBank',        logo:'vakif.png',          bins:[402940,409084,411724,411942,411943,411944,411979,415792,416757,428945,493840,493841,493846,520017,540045,540046,542119,542798,542804,547244,552101,483703,483704,531133,531883,532322,535355,547980,558215] },
    'garanti':        { css:'bank-garanti',        name:'Garanti BBVA',     logo:'garanti.png',        bins:[403280,403666,404308,413836,426886,426887,426888,427314,427315,428220,428221,432154,448472,461668,462274,467293,467294,467295,474151,482489,482490,482491,486567,487074,487075,489478,490175,492186,492187,492193,493845,514915,520097,520922,520940,520988,521368,521824,521825,521832,522204,528939,528956,533169,534261,540036,540037,540226,540227,540669,540709,541865,542030,544078,545102,546001,547302,552095,553130,554796,554960,557023,557945,558699] },
    'is':             { css:'bank-is',             name:'İş Bankası',       logo:'is.png',             bins:[418342,418343,418344,418345,450803,454318,454358,454359,454360,510152,540667,540668,543771,552096,553058] },
    'yapi-kredi':     { css:'bank-yapi-kredi',     name:'Yapı Kredi',       logo:'yapi-kredi.png',     bins:[404809,446212,450634,455359,477959,479794,479795,491205,491206,492128,492130,492131,510054,540061,540062,540063,540122,540129,542117,545103,552645,552659,554422] },
    'akbank':         { css:'bank-akbank',         name:'Akbank',           logo:'akbank.png',         bins:[413252,425669,432071,432072,435508,435509,493837,512754,520932,521807,524347,542110,552608,552609,553056,557113,557829] },
    'deniz':          { css:'bank-deniz',          name:'DenizBank',        logo:'deniz.png',          bins:[403134,408625,409070,411924,423667,424360,424361,441139,460345,460347,462276,472914,489456,510063,510118,510119,512017,512117,514924,520019,520303,543358,543400,543427,546764,554483,558514] },
    'finans':         { css:'bank-finans',         name:'QNB Finansbank',   logo:'finans.png',         bins:[402277,402278,402563,403082,409364,410147,413583,414388,415565,422376,423277,423398,427311,435653,441007,444029,499850,499851,499852,519324,521022,521836,529572,531157,545120,545616,545847,547567,547800] },
    'ing':            { css:'bank-ing',            name:'ING Bank',         logo:'ing.png',            bins:[400684,408579,414070,420322,420323,420324,455571,480296,490805,490806,490807,510151,532443,540024,540025,542029,542605,542965,542967,547765,548819,554297,554570] },
    'teb':            { css:'bank-teb',            name:'TEB',              logo:'teb.png',            bins:[402458,402459,406015,427707,440247,440273,440293,440294,479227,489494,489495,489496,510138,510139,510221,512753,512803,524346,524839,524840,528920,530853,545124,553090] },
    'hsbc':           { css:'bank-hsbc',           name:'HSBC',             logo:'hsbc.png',           bins:[405913,405917,405918,409071,422629,424909,428240,496019,510005,512651,519399,521045,522054,525413,525795,540643,542254,545183,550472,550473,552143,556030,556031,556033,556034,556665] },
    'seker':          { css:'bank-seker',          name:'Şekerbank',        logo:'seker.png',          bins:[403836,409622,411156,411157,411158,411159,411160,433383,433384,494063,494064,521394,521827,525404,530866,539703,547311,549208,549394] },
    'kuveyt':         { css:'bank-kuveyt',         name:'Kuveyt Türk',      logo:'kuveyt.png',         bins:[402589,402590,402592,403360,403810,410555,410556,424487,431024,511660,512595,518896,520180,547564,525312] },
    'albaraka':       { css:'bank-albaraka',       name:'Albaraka Türk',    logo:'albaraka.png',       bins:[417715,432284,432285,534264,547234,548232] },
    'turkiye-finans': { css:'bank-turkiye-finans', name:'Türkiye Finans',   logo:'turkiye-finans.png', bins:[404952,411685,428462,435627,435628,521848,537719,549294] },
    'anadolu':        { css:'bank-anadolu',        name:'Anadolubank',      logo:'anadolu.png',        bins:[425846,425847,425848,441341,522240,522241,554301,558593] }
  };

  var bankLogoBase = kdepo_bank_logo_base;

  // BIN → bank hızlı lookup tablosu
  var binLookup = {};
  for (var key in bankMap) {
    var bank = bankMap[key];
    for (var i = 0; i < bank.bins.length; i++) {
      binLookup[bank.bins[i]] = { css: bank.css, name: bank.name, logo: bank.logo };
    }
  }

  var currentBankClass = '';
  var jpCard = null;
  var bankNameEl = document.getElementById('bankName');

  // binlist.net API cache — aynı BIN için tekrar sorgu yapma
  var binApiCache = {};
  var binApiFetching = {};

  // Logo elementlerini kart yüzeyine inject et
  var bankLogoEl = null;
  var brandLogoEl = null;

  function injectLogos() {
    var cardFront = document.querySelector('.jp-card-front');
    if (!cardFront || bankLogoEl) return;

    bankLogoEl = document.createElement('img');
    bankLogoEl.className = 'kdepo-bank-logo';
    bankLogoEl.alt = '';
    cardFront.appendChild(bankLogoEl);

    brandLogoEl = document.createElement('img');
    brandLogoEl.className = 'kdepo-brand-logo';
    brandLogoEl.alt = '';
    cardFront.appendChild(brandLogoEl);
  }

  function showBankLogo(logoFile) {
    injectLogos();
    if (bankLogoEl) {
      if (logoFile) {
        bankLogoEl.src = bankLogoBase + logoFile;
        bankLogoEl.classList.add('active');
      } else {
        bankLogoEl.classList.remove('active');
        bankLogoEl.src = '';
      }
    }
  }

  function showBrandLogo(digits) {
    injectLogos();
    if (!brandLogoEl || digits.length < 1) {
      if (brandLogoEl) { brandLogoEl.classList.remove('active'); brandLogoEl.src = ''; }
      return;
    }
    var first = parseInt(digits[0], 10);
    var first2 = digits.length >= 2 ? parseInt(digits.substring(0, 2), 10) : 0;
    var first4 = digits.length >= 4 ? parseInt(digits.substring(0, 4), 10) : 0;
    var brand = '';
    if (first === 4) brand = 'visa.png';
    else if ((first2 >= 51 && first2 <= 55) || (first2 >= 22 && first2 <= 27)) brand = 'mastercard.png';
    else if (first4 >= 9792 && first4 <= 9799) brand = 'troy.png';

    if (brand) {
      brandLogoEl.src = bankLogoBase + brand;
      brandLogoEl.classList.add('active');
    } else {
      brandLogoEl.classList.remove('active');
      brandLogoEl.src = '';
    }
  }

  function detectBank(digits) {
    if (digits.length < 6) {
      removeBankClass();
      showBrandLogo(digits);
      return;
    }
    var bin = parseInt(digits.substring(0, 6), 10);
    var bank = binLookup[bin];
    if (bank) {
      if (currentBankClass !== bank.css) {
        removeBankClass();
        if (!jpCard) jpCard = document.querySelector('.jp-card-container .jp-card');
        if (jpCard) jpCard.classList.add(bank.css);
        currentBankClass = bank.css;
      }
      bankNameEl.textContent = bank.name;
      bankNameEl.classList.add('active');
      showBankLogo(bank.logo || null);
      showBrandLogo(digits);
      var bankHidden = document.getElementById('cardBankHidden');
      if (bankHidden) bankHidden.value = bank.name;
    } else {
      // Lokal tabloda yok — binlookup API'ye sor
      showBrandLogo(digits);
      lookupBinApi(bin);
    }
  }

  function lookupBinApi(bin) {
    // Daha önce sorgulandıysa cache'den al
    if (binApiCache[bin] !== undefined) {
      if (binApiCache[bin]) {
        applyApiBankResult(binApiCache[bin]);
      } else {
        removeBankClass();
      }
      return;
    }
    // Zaten fetch ediyorsak tekrar sorma
    if (binApiFetching[bin]) return;
    binApiFetching[bin] = true;

    fetch(kdepo_binlookup_url + bin)
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      var label = '';
      if (data.found && data.issuer) {
        label = data.issuer;
        if (data.brand) label += ' (' + data.brand + ')';
      }

      var result = label ? { css: 'bank-api', name: label } : null;
      binApiCache[bin] = result;
      binApiFetching[bin] = false;

      // Hâlâ aynı BIN girili mi kontrol et
      var currentDigits = cardInput ? cardInput.value.replace(/\D/g, '') : '';
      var currentBin = currentDigits.length >= 6 ? parseInt(currentDigits.substring(0, 6), 10) : 0;
      if (currentBin === bin && result) {
        applyApiBankResult(result);
      }
    })
    .catch(function() {
      binApiCache[bin] = null;
      binApiFetching[bin] = false;
      removeBankClass();
    });
  }

  function applyApiBankResult(result) {
    removeBankClass();
    if (!jpCard) jpCard = document.querySelector('.jp-card-container .jp-card');
    if (jpCard) jpCard.classList.add(result.css);
    currentBankClass = result.css;
    bankNameEl.textContent = result.name;
    bankNameEl.classList.add('active');
    showBankLogo(null);
    var bankHidden = document.getElementById('cardBankHidden');
    if (bankHidden) bankHidden.value = result.name;
  }

  function removeBankClass() {
    if (currentBankClass && jpCard) {
      jpCard.classList.remove(currentBankClass);
    }
    currentBankClass = '';
    bankNameEl.textContent = '';
    bankNameEl.classList.remove('active');
    showBankLogo(null);
  }

  // card.js init — sadece form varsa çalıştır
  var kdepoForm = document.getElementById('kdepo-payment-form');
  if (kdepoForm && typeof Card !== 'undefined') {
    try {
      new Card({
        form: '#kdepo-payment-form',
        container: '.card-wrapper',
        formSelectors: {
          numberInput: 'input#cardNumber',
          expiryInput: 'input#expiryDate',
          cvcInput: 'input#ccv',
          nameInput: 'input#firstname, input#lastname'
        },
        // width belirtilmiyor — CSS ile kontrol ediliyor
        formatting: false,
        placeholders: { number:'•••• •••• •••• ••••', name:'AD SOYAD', expiry:'••/••', cvc:'•••' },
        messages: { validDate:'SON\nKULLANMA', monthYear:'AA/YY' }
      });
    } catch(e) {
      console.warn('card.js init hatası:', e);
    }

    // Mobilde kartı form genişliğine ölçekle
    function scaleCardToFit() {
      var container = document.querySelector('.kdepo-card-col');
      var jpContainer = document.querySelector('.jp-card-container');
      if (!container || !jpContainer) return;
      var containerW = container.offsetWidth - 20; // padding
      var cardW = 350; // card.js default genişlik
      if (window.innerWidth <= 768 && containerW > 0) {
        var scale = containerW / cardW;
        if (scale > 1.5) scale = 1.5;
        jpContainer.style.transform = 'scale(' + scale + ')';
        jpContainer.style.transformOrigin = 'center top';
        // Scale sonrası container yüksekliğini ayarla
        var cardH = 220;
        container.querySelector('.card-wrapper').style.height = (cardH * scale + 10) + 'px';
      } else {
        jpContainer.style.transform = '';
        var cw = container.querySelector('.card-wrapper');
        if (cw) cw.style.height = '';
      }
    }
    scaleCardToFit();
    injectLogos();
    window.addEventListener('resize', scaleCardToFit);
  }

  var cardInput = document.getElementById('cardNumber');
  var expiryInput = document.getElementById('expiryDate');
  var firstnameInput = document.getElementById('firstname');
  var lastnameInput = document.getElementById('lastname');

  function adjustCardNameSize() {
    var nameEl = document.querySelector('.jp-card-name');
    if (!nameEl) return;
    var fullName = ((firstnameInput ? firstnameInput.value : '') + ' ' + (lastnameInput ? lastnameInput.value : '')).trim();
    var len = fullName.length;
    if (len > 22) nameEl.style.fontSize = '11px';
    else if (len > 18) nameEl.style.fontSize = '12px';
    else if (len > 14) nameEl.style.fontSize = '13px';
    else nameEl.style.fontSize = '14px';
  }

  if (firstnameInput) firstnameInput.addEventListener('input', adjustCardNameSize);
  if (lastnameInput) lastnameInput.addEventListener('input', adjustCardNameSize);
  var expiryInput = document.getElementById('expiryDate');
  var amountTlInput = document.getElementById('amountTl');
  var amountKurusInput = document.getElementById('amountKurus');
  var amountHidden = document.getElementById('amountHidden');
  var amountPreview = document.getElementById('amountPreview');
  var form = document.getElementById('kdepo-payment-form');

  function updateAmountPreview() {
    var tl = amountTlInput ? amountTlInput.value : '0';
    var kr = amountKurusInput ? amountKurusInput.value : '00';
    if (!tl || tl === '') tl = '0';
    if (!kr || kr === '') kr = '00';
    if (kr.length === 1) kr = kr + '0';
    if (amountPreview) amountPreview.textContent = tl + ',' + kr;
  }

  if (cardInput) {
    cardInput.addEventListener('input', function () {
      var digits = this.value.replace(/\D/g, '').substring(0, 19);
      var formatted = digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
      this.value = formatted;
      detectBank(digits);
    });
  }

  if (expiryInput) {
    expiryInput.addEventListener('input', function () {
      var digits = this.value.replace(/\D/g, '').substring(0, 4);
      if (digits.length >= 1 && digits[0] > '1') digits = '';
      if (digits.length >= 2) {
        var month = parseInt(digits.substring(0, 2), 10);
        if (month < 1 || month > 12) digits = digits[0];
      }
      this.value = digits.length > 2 ? digits.substring(0,2)+'/'+digits.substring(2) : digits;
    });
  }

  if (amountTlInput) {
    amountTlInput.addEventListener('input', function () {
      var d = this.value.replace(/\D/g, '').substring(0, 9);
      this.value = d.length > 0 ? d.replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.') : '';
      updateAmountPreview();
    });
  }

  if (amountKurusInput) {
    amountKurusInput.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').substring(0, 2);
      updateAmountPreview();
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      // Sözleşme ve KVKK onay kontrolü
      var agreeCheck = document.getElementById('agreementCheck');
      var kvkkCheck = document.getElementById('kvkkCheck');
      var agreeError = document.getElementById('agreementError');
      if (agreeCheck && kvkkCheck && (!agreeCheck.checked || !kvkkCheck.checked)) {
        e.preventDefault();
        if (agreeError) agreeError.style.display = 'block';
        return false;
      }
      if (agreeError) agreeError.style.display = 'none';

      if (cardInput) cardInput.value = cardInput.value.replace(/-/g, '');
      var tl = amountTlInput ? amountTlInput.value.replace(/\./g,'') : '0';
      var kr = amountKurusInput ? amountKurusInput.value : '00';
      if (kr.length === 0) kr = '00';
      if (kr.length === 1) kr += '0';
      if (amountHidden) amountHidden.value = tl + '.' + kr;

      // Kart brand tespiti (Visa/Mastercard/Troy)
      var digits = cardInput ? cardInput.value.replace(/\D/g, '') : '';
      var brandHidden = document.getElementById('cardBrandHidden');
      if (brandHidden && digits.length >= 1) {
        var first = parseInt(digits[0], 10);
        var first2 = parseInt(digits.substring(0, 2), 10);
        var first4 = parseInt(digits.substring(0, 4), 10);
        if (first === 4) brandHidden.value = 'VISA';
        else if (first2 >= 51 && first2 <= 55) brandHidden.value = 'MASTERCARD';
        else if (first2 >= 22 && first2 <= 27) brandHidden.value = 'MASTERCARD';
        else if (first4 >= 9792 && first4 <= 9792) brandHidden.value = 'TROY';
        else brandHidden.value = '';
      }
    });
  }

  // Modal açma/kapama
  function setupModal(openId, closeId, modalId) {
    var openBtn = document.getElementById(openId);
    var closeBtn = document.getElementById(closeId);
    var modal = document.getElementById(modalId);
    if (openBtn && modal) {
      openBtn.addEventListener('click', function(e) { e.preventDefault(); modal.style.display = 'block'; });
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', function() { modal.style.display = 'none'; });
    }
    if (modal) {
      modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    }
  }
  setupModal('openAgreementModal', 'closeAgreementModal', 'agreementModal');
  setupModal('openKvkkModal', 'closeKvkkModal', 'kvkkModal');

  // E-posta hint — mobilde dokunma ile göster/gizle
  var emailHintTrigger = document.querySelector('.kdepo-email-hint-trigger');
  var emailHint = document.querySelector('.kdepo-email-hint');
  if (emailHintTrigger && emailHint) {
    emailHintTrigger.addEventListener('click', function(e) {
      e.preventDefault();
      emailHint.classList.toggle('show');
      setTimeout(function() { emailHint.classList.remove('show'); }, 3000);
    });
  }
});
{/literal}
</script>
{/block}
