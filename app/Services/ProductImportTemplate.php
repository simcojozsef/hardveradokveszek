<?php

namespace App\Services;

use App\Models\Category;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/*
 * Generates the downloadable import template.
 *
 * The header row is the contract: the parser reads these exact column names.
 * A sample row and a category reference list are included so the seller can
 * see valid values without guessing.
 *
 * All written cells are explicit strings, so a category name can never be
 * interpreted as a formula when the file is reopened in Excel.
 */
class ProductImportTemplate
{
    /** The header row, in the order the parser expects. */
    private const HEADERS = [
        'seller_sku',
        'name',
        'description',
        'category_id',
        'price_huf',
        'stock',
    ];

    public function download(string $format): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Termékek');

        /*
         * Every cell is written as an explicit string, so a leading zero or a
         * value like "1-2" can never be reinterpreted as a number or formula
         * when the file is reopened in a spreadsheet app.
         */
        foreach (self::HEADERS as $index => $header) {
            $sheet->setCellValueExplicit(
                Coordinate::stringFromColumnIndex($index + 1) . '1',
                $header,
                DataType::TYPE_STRING
            );
        }

        // Sample row so the shapes are obvious.
        $sample = ['PELDA-001', 'Példa termék', 'Rövid leírás', '1', '19990', '3'];

        foreach ($sample as $index => $value) {
            $sheet->setCellValueExplicit(
                Coordinate::stringFromColumnIndex($index + 1) . '2',
                $value,
                DataType::TYPE_STRING
            );
        }

        // A category id reference on a second sheet.
        $reference = $spreadsheet->createSheet();
        $reference->setTitle('Kategóriák');
        $reference->setCellValue('A1', 'category_id');
        $reference->setCellValue('B1', 'name');

        $row = 2;

        foreach (Category::query()->where('is_active', true)->orderBy('name')->limit(500)->get() as $category) {
            $reference->setCellValueExplicit(
                'A' . $row,
                (string) $category->id,
                DataType::TYPE_STRING
            );
            $reference->setCellValueExplicit(
                'B' . $row,
                (string) $category->name,
                DataType::TYPE_STRING
            );
            $row++;
        }

        $spreadsheet->setActiveSheetIndex(0);

        $filename = $format === 'csv'
            ? 'gigapiac-termek-import-sablon.csv'
            : 'gigapiac-termek-import-sablon.xlsx';

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
