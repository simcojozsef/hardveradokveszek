<?php
namespace App\Support;
use App\Models\County;
use App\Models\Product;
use App\Models\Settlement;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductLocation
{
    public static function searchName(?string $value): string
    {
        return preg_replace('/\s+/', ' ', strtolower(Str::ascii(trim($value ?? ''))));
    }
    public static function findCounty(?string $name): ?County
    {
        $key = preg_replace('/\s+(varmegye|megye)$/', '', self::searchName($name));
        $key = ['csongrad' => 'csongrad-csanad', 'fovaros' => 'budapest'][$key] ?? $key;
        return $key === '' ? null : County::where('search_name', $key)->first();
    }
    public static function findSettlement(?string $name, ?int $countyId = null): ?Settlement
    {
        $key = self::searchName($name);
        if ($key === '') return null;
        $matches = Settlement::where('search_name', $key)
            ->when($countyId, fn ($q) => $q->where('county_id', $countyId))->limit(2)->get();
        return $matches->count() === 1 ? $matches->first() : null;
    }
    public static function resolve(array $data, ?Product $product = null): array
    {
        if (!array_intersect(['county_id', 'settlement_id', 'county', 'settlement'], array_keys($data))) return [];
        $countyId = array_key_exists('county_id', $data) ? $data['county_id'] : $product?->county_id;
        $settlementId = array_key_exists('settlement_id', $data) ? $data['settlement_id'] : $product?->settlement_id;
        $countyName = array_key_exists('county', $data) ? ($data['county'] ?? '') : ($product?->county ?? '');
        $settlementName = array_key_exists('settlement', $data) ? ($data['settlement'] ?? '') : ($product?->settlement ?? '');
        // Legacy text-only API updates replace the corresponding old ID too.
        if (array_key_exists('county', $data) && !array_key_exists('county_id', $data)) $countyId = null;
        if (array_key_exists('settlement', $data) && !array_key_exists('settlement_id', $data)) $settlementId = null;
        $county = $countyId ? County::find($countyId) : self::findCounty($countyName);
        $settlement = $settlementId ? Settlement::find($settlementId)
            : self::findSettlement($settlementName, $county?->id);
        if ($countyId && !$county) throw ValidationException::withMessages(['county_id' => ['Érvénytelen megye.']]);
        if ($settlementId && !$settlement) throw ValidationException::withMessages(['settlement_id' => ['Érvénytelen település.']]);
        if ($settlement && $county && $settlement->county_id != $county->id) {
            throw ValidationException::withMessages(['settlement_id' => ['A település nem a kiválasztott megyéhez tartozik.']]);
        }
        if ($settlement && !$county) $county = $settlement->county;
        // Keep an unmatched existing pair intact until the seller corrects it.
        $unchangedLegacy = $product && ($countyId ?: null) == ($product->county_id ?: null)
            && ($settlementId ?: null) == ($product->settlement_id ?: null)
            && trim($countyName) === trim($product->county ?? '')
            && trim($settlementName) === trim($product->settlement ?? '');
        if (!$county && trim($countyName) !== '' && !$unchangedLegacy) {
            throw ValidationException::withMessages(['county' => ['Válassz megyét a találatok közül.']]);
        }
        if (!$settlement && trim($settlementName) !== '' && !$unchangedLegacy) {
            throw ValidationException::withMessages(['settlement' => ['Válassz települést a találatok közül.']]);
        }
        return [
            'county_id' => $county?->id,
            'settlement_id' => $settlement?->id,
            'county' => $county?->name ?? (trim($countyName) ?: null),
            'settlement' => $settlement?->name ?? (trim($settlementName) ?: null),
        ];
    }
}
