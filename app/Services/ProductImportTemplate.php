<?php

namespace App\Services;

use App\Models\Category;
use App\Models\County;
use App\Models\Settlement;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/*
 * Generates the downloadable import templates.
 *
 * The header row IS the contract: the parser reads these exact Hungarian
 * column names. Sample rows and reference sheets are included so a seller can
 * see valid values without guessing.
 *
 * Every cell is written as an explicit string, so a value can never be
 * reinterpreted as a formula or silently converted to a number when the file
 * is reopened in a spreadsheet application.
 */
class ProductImportTemplate
{
    /**
     * Product import: the full field set, matching the manual product form.
     *
     * Order matters - the parser reads by these names.
     */
    public const PRODUCT_HEADERS = [
        'egyedi_termekazonosito',
        'termek_nev',
        'termek_leiras',
        'kategoria_id',
        'ar_huf',
        'keszlet',
        'allapot',
        'hirdetes_tipusa',
        'megye_id',
        'telepules_id',
        'marka',
        'modell',
        'kiemelt_kep',
        'galeria_kepek',
        'csomagkuldes',
        'foxpost',
        'gls',
        'magyar_posta',
        'szemelyes_atvetel',
        'mi_tartalom',
        'garancia',
        'garancia_lejarat',
    ];

    /** Price/stock update: the three columns that mode needs. */
    public const PRICE_STOCK_HEADERS = [
        'egyedi_termekazonosito',
        'ar_huf',
        'keszlet',
    ];

    public function download(string $format, string $mode = 'create'): StreamedResponse
    {
        $headers = $mode === 'price_stock'
            ? self::PRICE_STOCK_HEADERS
            : self::PRODUCT_HEADERS;

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($mode === 'price_stock' ? 'Ar keszlet' : 'Termekek');

        $this->writeRow($sheet, 1, $headers);
        $this->writeRow($sheet, 2, $this->sampleRow($mode));

        // Reference sheets, so the ids do not have to be guessed.
        if ($mode !== 'price_stock') {
            $this->writeCategorySheet($spreadsheet);
            $this->writeCountySheet($spreadsheet);
            $this->writeSettlementSheet($spreadsheet);
            $this->writeLegendSheet($spreadsheet);
        }

        $spreadsheet->setActiveSheetIndex(0);

        $filename = $mode === 'price_stock'
            ? 'gigapiac-ar-keszlet-sablon.' . $format
            : 'gigapiac-termek-import-sablon.' . $format;

        $writer = $format === 'csv'
            ? $this->csvWriter($spreadsheet)
            : new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => $format === 'csv'
                ? 'text/csv; charset=UTF-8'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /** @return array<int, string> */
    private function sampleRow(string $mode): array
    {
        if ($mode === 'price_stock') {
            return ['PELDA-001', '19990', '3'];
        }

        $categoryId = (string) (Category::query()->where('is_active', true)->value('id') ?? 1);
        $countyId = (string) (County::query()->value('id') ?? 1);
        $settlementId = (string) (Settlement::query()->value('id') ?? 1);

        return [
            'PELDA-001',
            'Példa termék',
            'Rövid leírás a termékről.',
            $categoryId,
            '19990',
            '3',
            'új',
            'kínál',
            $countyId,
            $settlementId,
            'asus',
            'rog strix',
            'fo-kep.jpg',
            'kep1.jpg, kep2.png',
            'igen',
            'igen',
            'nem',
            'nem',
            'igen',
            'nem',
            'igen',
            '2027.10.09.',
        ];
    }

    /** @param array<int, string> $values */
    private function writeRow(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, int $row, array $values): void
    {
        foreach ($values as $index => $value) {
            $sheet->setCellValueExplicit(
                Coordinate::stringFromColumnIndex($index + 1) . $row,
                (string) $value,
                DataType::TYPE_STRING
            );
        }
    }

    private function writeCategorySheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Kategoriak');
        $this->writeRow($sheet, 1, ['kategoria_id', 'nev', 'szulo_id']);

        $row = 2;

        foreach (Category::query()->orderBy('name')->limit(2000)->get() as $category) {
            $this->writeRow($sheet, $row, [
                (string) $category->id,
                (string) $category->name,
                (string) ($category->parent_id ?? ''),
            ]);
            $row++;
        }
    }

    private function writeCountySheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Megyek');
        $this->writeRow($sheet, 1, ['megye_id', 'nev']);

        $row = 2;

        foreach (County::query()->orderBy('name')->get() as $county) {
            $this->writeRow($sheet, $row, [(string) $county->id, (string) $county->name]);
            $row++;
        }
    }

    private function writeSettlementSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Telepulesek');
        $this->writeRow($sheet, 1, ['telepules_id', 'nev', 'megye_id']);

        $row = 2;

        /*
         * Ordered by county then name so a seller finds their settlement next
         * to its county id without a second lookup.
         */
        foreach (Settlement::query()->orderBy('county_id')->orderBy('name')->limit(5000)->get() as $settlement) {
            $this->writeRow($sheet, $row, [
                (string) $settlement->id,
                (string) $settlement->name,
                (string) $settlement->county_id,
            ]);
            $row++;
        }
    }

    /** Explains every accepted value, so the file is self-documenting. */
    private function writeLegendSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Utmutato');

        $rows = [
            ['oszlop', 'elfogadott ertek', 'megjegyzes'],
            ['egyedi_termekazonosito', 'szamok es betuk', 'a te sajat azonosítód, egyedi a fiókodon belül'],
            ['termek_nev', 'szamok es betuk', 'legfeljebb 200 karakter'],
            ['termek_leiras', 'szoveg', 'speciális karakterek engedettek, legfeljebb 10000 karakter'],
            ['kategoria_id', 'szam', 'Kategoriak munkalap vagy a kategoriak oldal'],
            ['ar_huf', 'egesz szam', 'forint, ezreselválasztó és pénznem nélkül'],
            ['keszlet', 'nem negativ egesz szam', '0 eseten a hirdetés nem jelenik meg'],
            ['allapot', 'uj | hasznalt', 'kotelezo'],
            ['hirdetes_tipusa', 'keres | kinal', 'kotelezo'],
            ['megye_id', 'szam', 'Megyek munkalap vagy a megyék oldal'],
            ['telepules_id', 'szam', 'Telepulesek munkalap vagy a települések oldal'],
            ['marka', 'kisbetu, betuk, tobb szo', 'pl. asus, gigabyte'],
            ['modell', 'kisbetu, betuk, tobb szo', 'pl. rog strix, rtx 4070'],
            ['kiemelt_kep', 'egy fajlnev', 'a media tarban feltoltott kep neve'],
            ['galeria_kepek', 'fajlnevek vesszovel', 'pl. kep1.jpg, kep2.png'],
            ['csomagkuldes', 'igen | nem', 'kotelezo'],
            ['foxpost', 'igen | nem', 'csak csomagkuldes=igen eseten ertelmezett'],
            ['gls', 'igen | nem', 'csak csomagkuldes=igen eseten ertelmezett'],
            ['magyar_posta', 'igen | nem', 'csak csomagkuldes=igen eseten ertelmezett'],
            ['szemelyes_atvetel', 'igen | nem', 'kotelezo'],
            ['mi_tartalom', 'igen | nem', 'kotelezo'],
            ['garancia', 'igen | nem', 'kotelezo'],
            ['garancia_lejarat', 'N/A vagy EEEE.HH.NN.', 'pl. 2027.10.09. vagy N/A'],
        ];

        foreach ($rows as $index => $row) {
            $this->writeRow($sheet, $index + 1, $row);
        }
    }

    /** Semicolon-delimited CSV, matching the documented template. */
    private function csvWriter(Spreadsheet $spreadsheet): Csv
    {
        $writer = new Csv($spreadsheet);
        $writer->setDelimiter(';');
        $writer->setEnclosure('"');
        $writer->setSheetIndex(0);

        return $writer;
    }
}
