<?php
namespace Database\Seeders;
use App\Models\County;
use App\Models\Settlement;
use App\Support\ProductLocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HungarianLocationSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(file_get_contents(database_path('seeders/data/hungarian-locations.json')), true, 512, JSON_THROW_ON_ERROR);
        if (count($data['counties'] ?? []) !== 20 || count($data['settlements'] ?? []) !== 3155) {
            throw new \RuntimeException('The location snapshot is incomplete.');
        }
        DB::transaction(function () use ($data) {
            $countyIds = [];
            foreach ($data['counties'] as $row) {
                $county = County::updateOrCreate(['code' => $row['code']], [
                    'name' => $row['name'], 'search_name' => ProductLocation::searchName($row['name']),
                ]);
                $countyIds[$row['code']] = $county->id;
            }
            foreach ($data['settlements'] as $row) {
                Settlement::updateOrCreate(['ksh_code' => $row['ksh_code']], [
                    'name' => $row['name'], 'county_id' => $countyIds[$row['county_code']],
                    'search_name' => ProductLocation::searchName($row['name']),
                ]);
            }
        });
        $matched = 0; $unmatched = 0;
        DB::table('products')->where(function ($q) {
            $q->whereNotNull('county')->orWhereNotNull('settlement');
        })->chunkById(200, function ($products) use (&$matched, &$unmatched) {
            foreach ($products as $product) {
                if ($product->county_id || $product->settlement_id) continue;
                $county = ProductLocation::findCounty($product->county);
                $settlement = ProductLocation::findSettlement($product->settlement, $county?->id);
                if ($settlement && !$county) $county = $settlement->county;
                if (!$county && !$settlement) { $unmatched++; continue; }
                $patch = ['county_id' => $county?->id, 'settlement_id' => $settlement?->id];
                if ($county) $patch['county'] = $county->name;
                if ($settlement) $patch['settlement'] = $settlement->name;
                DB::table('products')->where('id', $product->id)->update($patch);
                $matched++;
                if (trim($product->settlement ?? '') !== '' && !$settlement) $unmatched++;
            }
        });
        $this->command?->info('Imported 20 county/capital options and 3155 settlements (KSH 2025-01-01).');
        $this->command?->info("Products matched: {$matched}; products with unmatched location text: {$unmatched}.");
    }
}
