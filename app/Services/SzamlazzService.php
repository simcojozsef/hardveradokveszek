<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/*
 * Számla Agent client.
 *
 * The agent speaks XML over HTTP. Every invoice carries our own order number
 * (the Stripe invoice id), which is what makes issuing idempotent: after a
 * timeout we can query by that number instead of blindly creating a second
 * document.
 *
 * This invoices the PLATFORM's own PRO subscription to the seller. It is not
 * the seller's invoice to their buyer.
 */
class SzamlazzService
{
    private const ENDPOINT = 'https://www.szamlazz.hu/szamla/';

    public function isConfigured(): bool
    {
        return (bool) config('services.szamlazz.enabled')
            && (bool) config('services.szamlazz.agent_key')
            && $this->hasIssuerDetails();
    }

    /**
     * Reject an amount that cannot be the configured PRO price.
     *
     * The allowed band is deliberately generous — a future price change or a
     * tax adjustment stays inside it — while a unit mix-up (a hundred times
     * the price) is caught. A zero or negative total is always refused.
     *
     * @return string|null the error message, or null when the amount is sane
     */
    private function amountSanityError(int $grossHuf): ?string
    {
        if ($grossHuf <= 0) {
            return 'Érvénytelen számlaösszeg (0 vagy negatív).';
        }

        $expected = (int) config('services.szamlazz.expected_gross_huf', 4990);

        // Accept a wide but finite band around the configured price.
        $minimum = (int) floor($expected * 0.5);
        $maximum = (int) ceil($expected * 2);

        if ($grossHuf < $minimum || $grossHuf > $maximum) {
            return sprintf(
                'A számlaösszeg (%d Ft) nem egyezik a beállított PRO árral (%d Ft). '
                . 'Valószínűleg mértékegység-hiba — a számla nem került kiállításra.',
                $grossHuf,
                $expected,
            );
        }

        return null;
    }

    /**
     * The agent rejects a document without the issuer (our own company) data,
     * so an incomplete issuer means billing is not configured yet.
     */
    public function hasIssuerDetails(): bool
    {
        $seller = config('services.szamlazz.seller', []);

        return filled($seller['name'] ?? null)
            && filled($seller['tax_number'] ?? null)
            && filled($seller['city'] ?? null)
            && filled($seller['address'] ?? null);
    }

    /**
     * Issue an invoice for a paid PRO period.
     *
     * @return array{status:string, invoice_number:?string, error:?string}
     */
    public function issueProSubscriptionInvoice(
        string $orderNumber,
        array $buyer,
        int $grossHuf,
        string $periodStart,
        string $periodEnd,
    ): array {
        if (!$this->isConfigured()) {
            return [
                'status' => 'failed',
                'invoice_number' => null,
                'error' => 'A számlázási rendszer nincs bekonfigurálva.',
            ];
        }

        /*
         * Last line of defence against a unit mix-up. The price is known
         * from configuration, so an amount far outside its range means the
         * value reaching us is not in forint (e.g. Stripe minor units).
         * Refusing here is far better than issuing a hundred-times invoice.
         */
        $guard = $this->amountSanityError($grossHuf);

        if ($guard !== null) {
            Log::error('Refusing to issue a PRO invoice: amount out of range.', [
                'order_number' => $orderNumber,
                'gross_huf' => $grossHuf,
                'reason' => $guard,
            ]);

            return [
                'status' => 'failed',
                'invoice_number' => null,
                'error' => $guard,
            ];
        }

        $xml = $this->buildInvoiceXml(
            $orderNumber,
            $buyer,
            $grossHuf,
            $periodStart,
            $periodEnd,
        );

        try {
            $response = Http::timeout(40)
                ->asMultipart()
                ->attach('action-xmlagentxmlfile', $xml, 'invoice.xml')
                ->post($this->endpointUrl());

            if (!$response->successful()) {
                return [
                    'status' => 'failed',
                    'invoice_number' => null,
                    'error' => 'HTTP ' . $response->status(),
                ];
            }

            return $this->parseResponse($response->body());
        } catch (\Throwable $exception) {
            /*
             * A timeout is NOT a failure we may retry blindly: the document
             * might already exist. The caller marks it uncertain and queries
             * by order number before trying again.
             */
            Log::error('Szamlazz invoice request failed.', [
                'order_number' => $orderNumber,
                'message' => $exception->getMessage(),
            ]);

            return [
                'status' => 'uncertain',
                'invoice_number' => null,
                'error' => $exception->getMessage(),
            ];
        }
    }

    /**
     * Query an existing invoice by our order number.
     *
     * Used after a timeout to find out whether the document was created,
     * instead of issuing a duplicate.
     *
     * @return array{status:string, invoice_number:?string, error:?string}
     */
    public function queryByOrderNumber(string $orderNumber): array
    {
        if (!$this->isConfigured()) {
            return ['status' => 'failed', 'invoice_number' => null, 'error' => 'Nincs konfigurálva.'];
        }

        /*
         * The agent expects the same namespace as an invoice request, and the
         * lookup key is our own order number, not the invoice number.
         */
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'
            . '<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" '
            . 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            . 'xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla '
            . 'https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">'
            . '<beallitasok>'
            . '<szamlaagentkulcs>' . e((string) config('services.szamlazz.agent_key')) . '</szamlaagentkulcs>'
            . '</beallitasok>'
            . '<fejlec>'
            . '<rendelesSzam>' . e($orderNumber) . '</rendelesSzam>'
            . '</fejlec>'
            . '</xmlszamla>';

        try {
            $response = Http::timeout(30)
                ->asMultipart()
                ->attach('action-xmlagentxmlfile', $xml, 'query.xml')
                ->post($this->endpointUrl());

            return $this->parseResponse($response->body());
        } catch (\Throwable $exception) {
            return ['status' => 'uncertain', 'invoice_number' => null, 'error' => $exception->getMessage()];
        }
    }

    private function endpointUrl(): string
    {
        // The agent offers a separate test host; production is the default.
        return config('services.szamlazz.use_test')
            ? 'https://www.szamlazz.hu/szamla/'
            : self::ENDPOINT;
    }

    private function buildInvoiceXml(
        string $orderNumber,
        array $buyer,
        int $grossHuf,
        string $periodStart,
        string $periodEnd,
    ): string {
        /*
         * Net/gross handling comes from configuration, not from hard-coded
         * arithmetic: the accountant decides the tax treatment before go-live.
         * Here the gross amount is passed through as the payable total.
         */
        $buyerName = e($buyer['name']);
        $taxNumber = e($buyer['tax_number'] ?? '');

        $buyerBlock = '<vevo>'
            . '<nev>' . $buyerName . '</nev>'
            . '<orszag>' . e($buyer['country'] ?? 'HU') . '</orszag>'
            . '<irsz>' . e($buyer['postal_code'] ?? '') . '</irsz>'
            . '<telepules>' . e($buyer['city'] ?? '') . '</telepules>'
            . '<cim>' . e($buyer['address'] ?? '') . '</cim>'
            . '<email>' . e($buyer['email'] ?? '') . '</email>'
            . ($taxNumber !== '' ? '<adoszam>' . $taxNumber . '</adoszam>' : '')
            . '<sendEmail>true</sendEmail>'
            . '</vevo>';

        $itemName = e('GigaPiac PRO előfizetés');
        $description = e(sprintf(
            'Előfizetési időszak: %s – %s',
            $periodStart,
            $periodEnd
        ));

        $seller = config('services.szamlazz.seller', []);

        /*
         * The issuer block. The agent refuses a document without it, and it
         * is the platform's own company — never the seller's.
         */
        $sellerBlock = '<elado>'
            . '<nev>' . e((string) ($seller['name'] ?? '')) . '</nev>'
            . '<orszag>' . e((string) ($seller['country'] ?? 'HU')) . '</orszag>'
            . '<irsz>' . e((string) ($seller['postal_code'] ?? '')) . '</irsz>'
            . '<telepules>' . e((string) ($seller['city'] ?? '')) . '</telepules>'
            . '<cim>' . e((string) ($seller['address'] ?? '')) . '</cim>'
            . '<email>' . e((string) ($seller['email'] ?? '')) . '</email>'
            . '<adoszam>' . e((string) ($seller['tax_number'] ?? '')) . '</adoszam>'
            . (filled($seller['bank_account'] ?? null)
                ? '<bankszamlaszam>' . e((string) $seller['bank_account']) . '</bankszamlaszam>'
                : '')
            . '</elado>';

        /*
         * VAT comes from configuration and may be either a numeric rate or a
         * named exemption code such as "AAM" (alanyi adómentesség).
         *
         *  - numeric > 0 : split the VAT out of the gross total, so the
         *                  payable sum still equals the advertised price
         *  - "AAM" / 0   : no VAT at all; the code is passed through as the
         *                  rate marker and both VAT fields are zero
         */
        $vatSetting = config('services.szamlazz.vat_rate', 27);
        $vatCode = $this->resolveVatCode($vatSetting);
        $numericRate = is_numeric($vatSetting) ? (float) $vatSetting : 0.0;

        $net = $numericRate > 0
            ? (int) round($grossHuf / (1 + $numericRate / 100))
            : $grossHuf;
        $vat = $grossHuf - $net;

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" '
            . 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            . 'xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla '
            . 'https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">'
            . '<beallitasok>'
            . '<szamlaagentkulcs>' . e((string) config('services.szamlazz.agent_key')) . '</szamlaagentkulcs>'
            . '<eszamla>true</eszamla>'
            . '<szamlaLetoltes>false</szamlaLetoltes>'
            . '<valaszVerzio>2</valaszVerzio>'
            . '</beallitasok>'
            . $sellerBlock
            . '<fejlec>'
            /* Our own order number: the idempotency anchor for the query step. */
            . '<rendelesSzam>' . e($orderNumber) . '</rendelesSzam>'
            . '<kelt>' . now()->format('Y-m-d') . '</kelt>'
            . '<fizmod>Bankkártya</fizmod>'
            . '<penznem>HUF</penznem>'
            . '<szamlaNyelve>hu</szamlaNyelve>'
            . '</fejlec>'
            . $buyerBlock
            . '<tetelek>'
            . '<tetel>'
            . '<megnevezes>' . $itemName . '</megnevezes>'
            . '<mennyiseg>1</mennyiseg>'
            . '<mennyisegiEgyseg>db</mennyisegiEgyseg>'
            . '<nettoEgysegar>' . $net . '</nettoEgysegar>'
            . '<afakulcs>' . e($vatCode) . '</afakulcs>'
            . '<nettoErtek>' . $net . '</nettoErtek>'
            . '<afaErtek>' . $vat . '</afaErtek>'
            . '<bruttoErtek>' . $grossHuf . '</bruttoErtek>'
            . '<megjegyzes>' . $description . '</megjegyzes>'
            . '</tetel>'
            . '</tetelek>'
            . '</xmlszamla>';
    }

    /**
     * Normalise the configured VAT setting into the value the agent expects.
     *
     * A named code (e.g. AAM = alanyi adómentesség) is passed through as-is;
     * a numeric rate becomes that number. The agent decides the wording on the
     * document from the code.
     */
    private function resolveVatCode(mixed $setting): string
    {
        $value = trim((string) $setting);

        if ($value === '') {
            return '0';
        }

        // A named exemption code, not a percentage.
        if (!is_numeric($value)) {
            return strtoupper($value);
        }

        return (string) (float) $value;
    }

    /**
     * @return array{status:string, invoice_number:?string, error:?string}
     */
    private function parseResponse(string $body): array
    {
        $previous = libxml_use_internal_errors(true);
        $doc = simplexml_load_string($body);
        libxml_use_internal_errors($previous);

        if ($doc === false) {
            // The agent answers with plain text on a hard error.
            return [
                'status' => 'failed',
                'invoice_number' => null,
                'error' => Str::limit(trim(strip_tags($body)), 300),
            ];
        }

        /*
         * Response elements differ between agent response versions, so both
         * the v1 and v2 shapes are read.
         */
        $ok = (string) ($doc->sikeres ?? $doc->header->sikeres ?? '');
        $number = (string) ($doc->szamlaszam ?? $doc->header->szamlaszam ?? '');
        $error = (string) (
            $doc->hibauzenet
            ?? $doc->header->hibauzenet
            ?? $doc->error
            ?? ''
        );

        if ($ok === 'true' || $ok === '1') {
            return [
                'status' => 'issued',
                'invoice_number' => $number !== '' ? $number : null,
                'error' => null,
            ];
        }

        return [
            'status' => 'failed',
            'invoice_number' => null,
            'error' => Str::limit($error !== '' ? $error : 'Ismeretlen agent válasz.', 300),
        ];
    }
}
