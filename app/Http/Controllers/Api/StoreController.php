<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRequest;
use App\Http\Resources\StoreResource;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Gate;
use Illuminate\Http\Request;
use App\Http\Requests\StoreLogoRequest;
use Illuminate\Support\Facades\Storage;
use App\Http\Requests\UpdateStoreRequest;

class StoreController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $stores = Store::query()
            ->where('is_active', true)
            ->withCount('products')
            ->orderByDesc('positive_ratings_count')
            ->orderBy('negative_ratings_count')
            ->orderBy('name')
            ->paginate(24);

        return StoreResource::collection($stores);
    }

    public function show(Store $store): StoreResource
    {
        abort_unless($store->is_active, 404);

        $store->load([
            'products' => fn ($query) => $query
                ->visibleForSale()
                ->with('images')
                ->latest(),
        ]);

        return new StoreResource($store);
    }

    public function store(StoreRequest $request): JsonResponse
    {
        Gate::authorize('create', Store::class);

        $user = $request->user();

        if ($user->store()->exists()) {
            return response()->json([
                'message' => 'You already have a store.',
            ], 409);
        }

        $slug = $this->makeUniqueSlug($request->string('name')->toString());

        $store = Store::create([
            'user_id' => $user->id,
            'name' => $request->string('name')->toString(),
            'slug' => $slug,
            'description' => $request->input('description'),
            'logo' => $request->input('logo'),
            'contact_phone' => $request->input('contact_phone'),
            'contact_email' => $request->input('contact_email'),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'message' => 'Store created successfully.',
            'store' => new StoreResource($store),
        ], 201);
    }

    public function update(
        StoreRequest $request,
        Store $store
    ): StoreResource {
        Gate::authorize('update', $store);

        $data = $request->validated();

        // The slug is deliberately not changed here.
        // It will represent the public store/subdomain.

        $store->update($data);

        return new StoreResource($store->fresh());
    }

    public function destroy(Store $store): JsonResponse
    {
        Gate::authorize('delete', $store);

        $store->delete();

        return response()->json([
            'message' => 'Store deleted successfully.',
        ]);
    }

    private function makeUniqueSlug(
        string $name,
        ?int $ignoreStoreId = null
    ): string {
        $base = Str::slug($name);
        $slug = $base;
        $counter = 2;

        while (
            Store::where('slug', $slug)
                ->when(
                    $ignoreStoreId,
                    fn ($query) => $query->whereKeyNot($ignoreStoreId)
                )
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }


    public function mine(Request $request): StoreResource
    {
        $store = $request->user()
            ->store()
            ->with([
                'products' => fn ($query) => $query
                    ->with('images')
                    ->latest(),
            ])
            ->first();

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        return new StoreResource($store);
    }

    public function updateMine(
        UpdateStoreRequest $request
    ): StoreResource {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        Gate::authorize('update', $store);

        $store->update($request->validated());

        return new StoreResource($store->fresh());
    }

    public function uploadLogo(
        StoreLogoRequest $request
    ): StoreResource {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        Gate::authorize('update', $store);

        $oldLogo = $store->logo;

        $path = $request->file('logo')->store(
            "stores/{$store->id}",
            'public'
        );

        $store->update([
            'logo' => $path,
        ]);

        if ($oldLogo) {
            Storage::disk('public')->delete($oldLogo);
        }

        return new StoreResource($store->fresh());
    }

    public function deleteLogo(
        Request $request
    ): StoreResource {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        Gate::authorize('update', $store);

        if ($store->logo) {
            Storage::disk('public')->delete($store->logo);

            $store->update([
                'logo' => null,
            ]);
        }

        return new StoreResource($store->fresh());
    }
}