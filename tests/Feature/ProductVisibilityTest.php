<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function sellerWithStore(): array
    {
        $seller = User::factory()->create(['role' => 'seller']);

        $store = Store::create([
            'user_id' => $seller->id,
            'name' => 'Visibility Store',
            'slug' => 'visibility-store',
            'is_active' => true,
        ]);

        return [$seller, $store];
    }

    /**
     * Product::creating() stamps posted_at/expires_at/listing_status, so the
     * states below are applied afterwards to simulate a listing that has aged
     * out or been sold through the lifecycle service.
     */
    private function product(Store $store, string $name, string $slug, array $overrides = []): Product
    {
        $product = Product::create([
            'store_id' => $store->id,
            'name' => $name,
            'slug' => $slug,
            'price' => 1000,
            'stock' => 1,
            'is_active' => true,
        ]);

        if ($overrides !== []) {
            $product->forceFill($overrides)->save();
        }

        return $product->fresh();
    }

    private function visibleProduct(Store $store): Product
    {
        return $this->product($store, 'Lathato termek', 'lathato-termek');
    }

    private function expiredProduct(Store $store): Product
    {
        return $this->product($store, 'Lejart termek', 'lejart-termek', [
            'listing_status' => Product::AVAILABLE,
            'expires_at' => now()->subDay(),
        ]);
    }

    private function soldProduct(Store $store): Product
    {
        return $this->product($store, 'Eladott termek', 'eladott-termek', [
            'listing_status' => Product::SOLD,
            'sold_at' => now(),
        ]);
    }

    public function test_sold_and_expired_products_are_hidden_from_marketplace(): void
    {
        [, $store] = $this->sellerWithStore();
        $visible = $this->visibleProduct($store);
        $expired = $this->expiredProduct($store);
        $sold = $this->soldProduct($store);

        $ids = $this->getJson('/api/products')
            ->assertOk()
            ->json('data.*.id');

        $this->assertContains($visible->id, $ids);
        $this->assertNotContains($expired->id, $ids);
        $this->assertNotContains($sold->id, $ids);
    }

    public function test_sold_and_expired_products_are_hidden_from_store_show(): void
    {
        [, $store] = $this->sellerWithStore();
        $visible = $this->visibleProduct($store);
        $expired = $this->expiredProduct($store);
        $sold = $this->soldProduct($store);

        $ids = collect($this->getJson("/api/stores/{$store->slug}")
            ->assertOk()
            ->json('data.products'))
            ->pluck('id')
            ->all();

        $this->assertContains($visible->id, $ids);
        $this->assertNotContains($expired->id, $ids);
        $this->assertNotContains($sold->id, $ids);
    }

    public function test_sold_and_expired_products_are_hidden_from_search_suggestions(): void
    {
        [, $store] = $this->sellerWithStore();
        $visible = $this->visibleProduct($store);
        $expired = $this->expiredProduct($store);
        $sold = $this->soldProduct($store);

        $ids = $this->getJson('/api/search/suggestions?q=termek')
            ->assertOk()
            ->json('products.*.id');

        $this->assertContains($visible->id, $ids);
        $this->assertNotContains($expired->id, $ids);
        $this->assertNotContains($sold->id, $ids);
    }

    public function test_products_are_hidden_when_the_store_is_inactive(): void
    {
        [, $store] = $this->sellerWithStore();
        $product = $this->visibleProduct($store);

        $this->getJson('/api/products')->assertOk()->assertJsonFragment(['id' => $product->id]);

        $store->update(['is_active' => false]);

        $ids = $this->getJson('/api/products')->assertOk()->json('data.*.id');
        $this->assertNotContains($product->id, $ids);
        $this->getJson("/api/stores/{$store->slug}")->assertNotFound();
    }

    public function test_seller_mine_endpoint_still_lists_sold_and_expired_products(): void
    {
        [$seller, $store] = $this->sellerWithStore();
        $visible = $this->visibleProduct($store);
        $expired = $this->expiredProduct($store);
        $sold = $this->soldProduct($store);

        Sanctum::actingAs($seller);

        $ids = $this->getJson('/api/my/products')
            ->assertOk()
            ->json('data.*.id');

        $this->assertContains($visible->id, $ids);
        $this->assertContains($expired->id, $ids);
        $this->assertContains($sold->id, $ids);
    }

    public function test_expire_command_marks_due_listings_expired(): void
    {
        [, $store] = $this->sellerWithStore();
        $due = $this->expiredProduct($store);

        $this->artisan('products:expire')->assertSuccessful();

        $due->refresh();
        $this->assertSame(Product::EXPIRED, $due->listing_status);
        $this->assertNotNull($due->expired_at);

        $ids = $this->getJson('/api/products')->assertOk()->json('data.*.id');
        $this->assertNotContains($due->id, $ids);
    }
}
