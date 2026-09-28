<?php

namespace App\Console\Commands;

use App\Models\Category;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportCategories extends Command
{
    protected $signature = 'categories:import
                            {file : A kategóriafájl elérési útja}
                            {--reset : A meglévő kategóriák törlése import előtt}';

    protected $description =
        'Hierarchikus kategóriák importálása szövegfájlból.';

    public function handle(): int
    {
        $file = $this->argument('file');

        if (!is_file($file)) {
            $this->error(
                "A fájl nem található: {$file}"
            );

            return self::FAILURE;
        }

        if (
            $this->option('reset') &&
            Category::count() > 0
        ) {
            $this->warn(
                'A meglévő kategóriák törlése következik.'
            );

            Category::query()->delete();
        }

        $lines = file(
            $file,
            FILE_IGNORE_NEW_LINES
            | FILE_SKIP_EMPTY_LINES
        );

        $stack = [];

        $created = 0;

        DB::transaction(function () use (
            $lines,
            &$stack,
            &$created
        ) {
            foreach ($lines as $lineNumber => $line) {
                $line = rtrim(
                    $line,
                    "\r\n"
                );

                if (trim($line) === '') {
                    continue;
                }

                $indent = $this->indentLevel(
                    $line
                );

                $name = trim($line);

                /*
                 * Ignore accidental line-marker text
                 * if present in a copied source file.
                 */
                $name = preg_replace(
                    '/^\[L\d+\]\s*/',
                    '',
                    $name
                );

                $name = trim($name);

                if ($name === '') {
                    continue;
                }

                while (
                    !empty($stack) &&
                    end($stack)['indent'] >=
                        $indent
                ) {
                    array_pop($stack);
                }

                $parentId = empty($stack)
                    ? null
                    : end($stack)['id'];

                $slug = Str::slug($name);

                $existing = Category::query()
                    ->where('parent_id', $parentId)
                    ->where('slug', $slug)
                    ->first();

                if ($existing) {
                    $category = $existing;

                    $this->line(
                        "Meglévő: {$name}"
                    );
                } else {
                    $category = Category::create([
                        'parent_id' => $parentId,
                        'name' => $name,
                        'slug' => $slug,
                        'sort_order' => 0,
                        'is_active' => true,
                    ]);

                    $created++;

                    $this->info(
                        "Létrehozva: {$name}"
                    );
                }

                $stack[] = [
                    'indent' => $indent,
                    'id' => $category->id,
                ];
            }
        });

        $this->newLine();

        $this->info(
            "Import befejezve. Új kategóriák: {$created}."
        );

        return self::SUCCESS;
    }

    private function indentLevel(
        string $line
    ): int {
        $prefix = '';

        preg_match(
            '/^[\t ]*/',
            $line,
            $matches
        );

        $prefix = $matches[0] ?? '';

        $tabs = substr_count(
            $prefix,
            "\t"
        );

        $spaces = substr_count(
            $prefix,
            ' '
        );

        /*
         * The source file is indentation-based.
         * Treat a tab as four spaces.
         */
        return ($tabs * 4) + $spaces;
    }
}