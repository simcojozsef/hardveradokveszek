<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as ReaderException;

/*
 * Reads an uploaded XLSX or CSV into plain rows.
 *
 * Security posture:
 *  - a hard 5 MB ceiling, checked before the file is read
 *  - XLSX/XLSM macros are never executed; only cell values are read
 *  - formula cells are rejected rather than evaluated, so a spreadsheet
 *    cannot make the server compute or fetch anything
 *  - a row and cell ceiling guards against a small file expanding hugely
 *  - 51 non-empty rows rejects the WHOLE file; the first 50 are never
 *    imported silently
 */
class ProductImportParser
{
    public const MAX_BYTES = 5 * 1024 * 1024;

    public const MAX_ROWS = 50;

    /** Independent guard against a tiny file with huge cell dimensions. */
    private const MAX_CELLS = 200_000;

    /** The columns a new-product import carries. */
    public const REQUIRED_COLUMNS = [
        'seller_sku',
        'name',
        'description',
        'category_id',
        'price_huf',
        'stock',
    ];

    /**
     * The price/stock update mode only needs these three: it never creates a
     * product, so name, description and category are irrelevant.
     */
    public const REQUIRED_COLUMNS_PRICE_STOCK = [
        'seller_sku',
        'price_huf',
        'stock',
    ];

    /**
     * Parse the upload into header + rows.
     *
     * @param  array<int, string>  $requiredColumns
     * @return array{headers:array<int,string>, rows:array<int,array<string,mixed>>, warnings:array<int,string>}
     *
     * @throws ValidationException
     */
    public function parse(UploadedFile $file, array $requiredColumns = self::REQUIRED_COLUMNS): array
    {
        $this->assertSize($file);

        $extension = strtolower($file->getClientOriginalExtension());

        return match ($extension) {
            'csv' => $this->parseCsv($file, $requiredColumns),
            'xlsx' => $this->parseSpreadsheet($file, $requiredColumns),
            'xls', 'xlsm' => throw ValidationException::withMessages([
                'file' => 'Az .xls és .xlsm formátum nem támogatott. Használj .xlsx vagy .csv fájlt.',
            ]),
            default => throw ValidationException::withMessages([
                'file' => 'Csak .xlsx vagy .csv fájl tölthető fel.',
            ]),
        };
    }

    private function assertSize(UploadedFile $file): void
    {
        if ($file->getSize() > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'file' => 'A fájl legfeljebb 5 MB lehet.',
            ]);
        }
    }

    /**
     * @return array{headers:array<int,string>, rows:array<int,array<string,mixed>>, warnings:array<int,string>}
     */
    private function parseSpreadsheet(UploadedFile $file, array $requiredColumns): array
    {
        try {
            // readDataOnly: values only, never formulas or styling.
            $reader = IOFactory::createReaderForFile($file->getRealPath());
            $reader->setReadDataOnly(true);

            $spreadsheet = $reader->load($file->getRealPath());
        } catch (ReaderException | \Throwable) {
            throw ValidationException::withMessages([
                'file' => 'A táblázat nem olvasható. Ellenőrizd a fájlt és a sablont.',
            ]);
        }

        $warnings = [];

        if ($spreadsheet->getSheetCount() > 1) {
            // Only the first sheet is imported; the rest is reported.
            $warnings[] = 'Csak az első munkalap kerül feldolgozásra, a többi figyelmen kívül marad.';
        }

        $sheet = $spreadsheet->getSheet(0);
        $highestRow = $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn();
        $highestColumnIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn);

        if ($highestRow * $highestColumnIndex > self::MAX_CELLS) {
            $spreadsheet->disconnectWorksheets();

            throw ValidationException::withMessages([
                'file' => 'A táblázat túl nagy (cellaszám limit).',
            ]);
        }

        $matrix = [];

        for ($row = 1; $row <= $highestRow; $row++) {
            $line = [];

            for ($col = 1; $col <= $highestColumnIndex; $col++) {
                $cell = $sheet->getCell(
                    \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . $row
                );

                /*
                 * A formula is refused rather than evaluated: evaluating it
                 * would execute spreadsheet logic on the server.
                 */
                if ($cell->getDataType() === DataType::TYPE_FORMULA) {
                    $spreadsheet->disconnectWorksheets();

                    throw ValidationException::withMessages([
                        'file' => sprintf(
                            'A fájl képletet tartalmaz a %s%d cellában. A képleteket alakítsd értékké a feltöltés előtt.',
                            \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col),
                            $row
                        ),
                    ]);
                }

                $line[] = $cell->getValue();
            }

            $matrix[] = $line;
        }

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $this->matrixToRows($matrix, $warnings, $requiredColumns);
    }

    /**
     * @return array{headers:array<int,string>, rows:array<int,array<string,mixed>>, warnings:array<int,string>}
     */
    private function parseCsv(UploadedFile $file, array $requiredColumns): array
    {
        $contents = file_get_contents($file->getRealPath());

        if ($contents === false) {
            throw ValidationException::withMessages(['file' => 'A fájl nem olvasható.']);
        }

        // Strip a UTF-8 BOM if present.
        $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents);

        $delimiter = $this->detectDelimiter($contents);

        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $contents);
        rewind($handle);

        $matrix = [];

        // The explicit escape argument avoids the PHP 8.4 deprecation and,
        // more importantly, disables backslash unescaping so a value is taken
        // literally.
        while (($line = fgetcsv($handle, 0, $delimiter, '"', '\\')) !== false) {
            $matrix[] = $line;
        }

        fclose($handle);

        return $this->matrixToRows($matrix, [], $requiredColumns);
    }

    /** The template uses semicolons, but a comma file is documented and accepted. */
    private function detectDelimiter(string $contents): string
    {
        $firstLine = strtok($contents, "\n") ?: '';

        return substr_count($firstLine, ';') >= substr_count($firstLine, ',') ? ';' : ',';
    }

    /**
     * @param  array<int, array<int, mixed>>  $matrix
     * @param  array<int, string>  $warnings
     * @return array{headers:array<int,string>, rows:array<int,array<string,mixed>>, warnings:array<int,string>}
     */
    private function matrixToRows(array $matrix, array $warnings, array $requiredColumns): array
    {
        // Drop completely empty leading rows the sheet may carry.
        while ($matrix !== [] && $this->isEmptyRow($matrix[0] ?? [])) {
            array_shift($matrix);
        }

        if ($matrix === []) {
            throw ValidationException::withMessages(['file' => 'A fájl üres.']);
        }

        $headers = array_map(
            fn ($h) => strtolower(trim((string) $h)),
            array_shift($matrix)
        );

        $missing = array_diff($requiredColumns, $headers);

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'file' => 'Hiányzó oszlopok: ' . implode(', ', $missing) . '. Használd a sablont.',
            ]);
        }

        $rows = [];
        $nonEmpty = 0;

        foreach ($matrix as $line) {
            if ($this->isEmptyRow($line)) {
                continue;
            }

            $nonEmpty++;

            /*
             * Row 51 rejects the entire file: no silent truncation to 50.
             */
            if ($nonEmpty > self::MAX_ROWS) {
                throw ValidationException::withMessages([
                    'file' => sprintf(
                        'A fájl több mint %d adatsort tartalmaz. Egyszerre legfeljebb %d sor importálható.',
                        self::MAX_ROWS,
                        self::MAX_ROWS
                    ),
                ]);
            }

            $row = [];

            foreach ($headers as $index => $header) {
                $row[$header] = $line[$index] ?? null;
            }

            $rows[] = $row;
        }

        if ($rows === []) {
            throw ValidationException::withMessages(['file' => 'A fájl nem tartalmaz adatsort.']);
        }

        return ['headers' => $headers, 'rows' => $rows, 'warnings' => $warnings];
    }

    /** @param array<int, mixed> $row */
    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }
}
