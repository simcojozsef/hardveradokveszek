<?php

namespace Tests\Feature;

use App\Http\Resources\StoreResource;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreRatingTest extends TestCase
{
    use RefreshDatabase;

    private function storeRecord(bool $active = true): Store
    {
        $seller = User::factory()->create(['role' => 'seller']);
        return Store::create([
            'user_id' => $seller->id, 'name' => 'Test Store',
            'slug' => 'test-store', 'is_active' => $active,
        ]);
    }

    private function buyer(): User
    {
        return User::factory()->create(['role' => 'buyer']);
    }

    public function test_new_store_has_zero_counts(): void
    {
        $store = $this->storeRecord();
        $this->getJson("/api/stores/{$store->slug}/ratings")
            ->assertOk()->assertJson([
                'positive_ratings_count' => 0, 'negative_ratings_count' => 0, 'user_vote' => null,
            ]);
    }

    public function test_guest_cannot_vote_or_read_private_vote(): void
    {
        $store = $this->storeRecord();
        $this->putJson("/api/stores/{$store->slug}/rating", ['value' => 1])->assertUnauthorized();
        $this->getJson("/api/stores/{$store->slug}/my-rating")->assertUnauthorized();
        $this->assertDatabaseCount('store_ratings', 0);
    }

    public function test_repeats_do_not_accumulate_and_switching_moves_the_vote(): void
    {
        $store = $this->storeRecord();
        $buyer = $this->buyer();
        Sanctum::actingAs($buyer);
        $path = "/api/stores/{$store->slug}/rating";
        $this->putJson($path, ['value' => 1])->assertOk()->assertJson([
            'positive_ratings_count' => 1, 'negative_ratings_count' => 0, 'user_vote' => 1,
        ]);
        $this->putJson($path, ['value' => 1])->assertOk()->assertJsonPath('positive_ratings_count', 1);
        $this->putJson($path, ['value' => -1])->assertOk()->assertJson([
            'positive_ratings_count' => 0, 'negative_ratings_count' => 1, 'user_vote' => -1,
        ]);
        $this->assertDatabaseCount('store_ratings', 1);
        $this->getJson("/api/stores/{$store->slug}/my-rating")->assertOk()->assertJsonPath('user_vote', -1);
    }

    public function test_different_buyers_have_independent_votes(): void
    {
        $store = $this->storeRecord();
        Sanctum::actingAs($this->buyer());
        $this->putJson("/api/stores/{$store->slug}/rating", ['value' => 1])->assertOk();
        Sanctum::actingAs($this->buyer());
        $this->putJson("/api/stores/{$store->slug}/rating", ['value' => -1])
            ->assertOk()->assertJson(['positive_ratings_count' => 1, 'negative_ratings_count' => 1]);
        $this->assertDatabaseCount('store_ratings', 2);
    }

    public function test_sellers_and_admins_cannot_vote(): void
    {
        $store = $this->storeRecord();
        foreach (['seller', 'admin'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->putJson("/api/stores/{$store->slug}/rating", ['value' => 1])->assertForbidden();
            $this->getJson("/api/stores/{$store->slug}/my-rating")->assertForbidden();
        }
        $this->assertDatabaseCount('store_ratings', 0);
    }

    public function test_invalid_values_are_rejected(): void
    {
        $store = $this->storeRecord();
        Sanctum::actingAs($this->buyer());
        foreach ([0, 2, -2, 'bad', null] as $value) {
            $this->putJson("/api/stores/{$store->slug}/rating", ['value' => $value])
                ->assertUnprocessable()->assertJsonValidationErrors('value');
        }
        $this->assertDatabaseCount('store_ratings', 0);
    }

    public function test_voter_identity_is_taken_from_authentication(): void
    {
        $store = $this->storeRecord();
        $buyer = $this->buyer();
        $other = $this->buyer();
        Sanctum::actingAs($buyer);
        $this->putJson("/api/stores/{$store->slug}/rating", [
            'value' => 1, 'user_id' => $other->id,
        ])->assertOk();
        $this->assertDatabaseHas('store_ratings', ['store_id' => $store->id, 'user_id' => $buyer->id]);
        $this->assertDatabaseMissing('store_ratings', ['store_id' => $store->id, 'user_id' => $other->id]);
    }

    public function test_inactive_stores_cannot_be_rated(): void
    {
        $store = $this->storeRecord(false);
        Sanctum::actingAs($this->buyer());
        $this->putJson("/api/stores/{$store->slug}/rating", ['value' => 1])->assertNotFound();
        $this->assertDatabaseCount('store_ratings', 0);
    }

    public function test_store_resource_exposes_counts(): void
    {
        $store = $this->storeRecord();
        Sanctum::actingAs($this->buyer());
        $this->putJson("/api/stores/{$store->slug}/rating", ['value' => 1])->assertOk();
        $data = (new StoreResource(Store::findOrFail($store->id)))->resolve();
        $this->assertSame(1, $data['positive_ratings_count']);
        $this->assertSame(0, $data['negative_ratings_count']);
    }
}
