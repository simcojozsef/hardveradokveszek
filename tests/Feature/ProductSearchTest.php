<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSearchTest extends TestCase
{
    use RefreshDatabase;

    private function storeWithProducts(): Store
    {
        $seller = User::factory()->create(['role' => 'seller']);

        $store = Store::create([
            'user_id' => $seller->id,
            'name' => 'Search Store',
            'slug' => 'search-store',
            'is_active' => true,
        ]);

        $this->makeProduct($store, 'Mouse', 'mouse', 'Nem egy mickey mouse, hanem egy vezetékes mouse.');
        $this->makeProduct($store, 'ASUS B650', 'asus-b650', 'AM5 motherboard');
        $this->makeProduct($store, 'Retro TV', 'retro-tv', 'Régi, de működő televízió.');

        return $store;
    }

    private function makeProduct(Store $store, string $name, string $slug, ?string $description): Product
    {
        return Product::create([
            'store_id' => $store->id,
            'name' => $name,
            'slug' => $slug,
            'description' => $description,
            'price' => 1000,
            'stock' => 1,
            'is_active' => true,
        ]);
    }

    /** Names returned by the marketplace endpoint for a search term. */
    private function namesFor(string $term): array
    {
        return array_column(
            $this->getJson('/api/products?search=' . urlencode($term))
                ->assertOk()
                ->json('data'),
            'name'
        );
    }

    public function test_single_letter_matches_a_product_by_title(): void
    {
        $this->storeWithProducts();

        // "m" opens "Mouse" and must surface it, even though the listing is a
        // single product rather than a whole-word match.
        $names = $this->namesFor('m');

        $this->assertContains('Mouse', $names);
        // Titles without an "m" must not be swept in by a description hit.
        $this->assertNotContains('Retro TV', $names);
    }

    public function test_match_inside_a_word_still_counts(): void
    {
        $this->storeWithProducts();

        // "mouse" is a suffix-free match, but "o" sits mid-word in "Mouse".
        $this->assertContains('Mouse', $this->namesFor('mouse'));
        $this->assertContains('Mouse', $this->namesFor('ous'));
    }

    public function test_description_is_not_searched(): void
    {
        $this->storeWithProducts();

        // "motherboard" only exists in the description of "ASUS B650"; the
        // card shows the title, so a description hit would read as an
        // unrelated result.
        $this->assertNotContains('ASUS B650', $this->namesFor('motherboard'));

        // "vezetékes" is only in the Mouse description.
        $this->assertNotContains('Mouse', $this->namesFor('vezetékes'));
    }

    public function test_single_letter_no_longer_matches_on_description_only(): void
    {
        $this->storeWithProducts();

        // "ASUS B650" has no "t" in its title, only in "motherboard".
        $this->assertNotContains('ASUS B650', $this->namesFor('t'));

        // "Retro TV" has no "n" in its title, only in its description.
        $this->assertNotContains('Retro TV', $this->namesFor('n'));
    }

    public function test_search_is_case_and_accent_tolerant_for_ascii_names(): void
    {
        $this->storeWithProducts();

        $this->assertContains('Mouse', $this->namesFor('MOUSE'));
        $this->assertContains('ASUS B650', $this->namesFor('asus'));
    }

    public function test_wildcard_characters_are_escaped(): void
    {
        $this->storeWithProducts();

        // "%" must be a literal, not a match-everything wildcard.
        $this->assertSame([], $this->namesFor('%'));
        $this->assertSame([], $this->namesFor('_'));
    }

    public function test_suggestions_use_the_same_title_rule(): void
    {
        $this->storeWithProducts();

        $suggested = array_column(
            $this->getJson('/api/search/suggestions?q=m')->assertOk()->json('products'),
            'name'
        );

        $this->assertContains('Mouse', $suggested);
        $this->assertNotContains('ASUS B650', $suggested);

        // A description-only term yields no product suggestions.
        $this->assertSame(
            [],
            $this->getJson('/api/search/suggestions?q=motherboard')->assertOk()->json('products')
        );
    }
}
