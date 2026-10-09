<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/*
 * The seller's media library.
 *
 * Images are uploaded here first and then referenced by filename in the import
 * spreadsheet. That is the only way a spreadsheet name can resolve to a file:
 * no library row, no image.
 *
 * The library is per store, so two sellers may each have a "cover.jpg".
 */
class SellerMediaController extends Controller
{
    /** Accepted image types, matching what the product form allows. */
    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

    private const MAX_BYTES = 5 * 1024 * 1024;

    public function index(Request $request): JsonResponse
    {
        $store = $request->user()->store;

        if (!$store) {
            return response()->json(['data' => []]);
        }

        $media = StoreMedia::query()
            ->where('store_id', $store->id)
            ->orderBy('name')
            ->get()
            ->map(fn (StoreMedia $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'url' => $item->url(),
                'size_bytes' => $item->size_bytes,
            ]);

        return response()->json(['data' => $media]);
    }

    /**
     * Upload one or more files into the library.
     *
     * The stored name is derived from the original filename so the seller can
     * type exactly what they see, and is made unique within the store rather
     * than overwriting an existing file.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $store = $user->store;

        if (!$store) {
            throw ValidationException::withMessages([
                'files' => 'Előbb hozd létre az üzletedet.',
            ]);
        }

        $request->validate([
            'files' => ['required', 'array', 'max:50'],
            'files.*' => [
                'required',
                'file',
                'max:' . (self::MAX_BYTES / 1024),
                'mimetypes:' . implode(',', self::ALLOWED_MIME),
            ],
        ]);

        $saved = [];

        foreach ($request->file('files') as $file) {
            $name = $this->uniqueName($store->id, $file->getClientOriginalName());

            // Stored under the store so a file is never shared across sellers.
            $path = $file->store("media/{$store->id}", 'public');

            $saved[] = StoreMedia::create([
                'store_id' => $store->id,
                'name' => $name,
                'path' => $path,
                'mime_type' => $file->getClientMimeType(),
                'size_bytes' => $file->getSize() ?? 0,
            ]);
        }

        return response()->json([
            'message' => count($saved) . ' fájl feltöltve.',
            'data' => collect($saved)->map(fn (StoreMedia $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'url' => $item->url(),
                'size_bytes' => $item->size_bytes,
            ]),
        ], 201);
    }

    public function destroy(Request $request, StoreMedia $media): JsonResponse
    {
        // Ownership is checked against the caller's own store.
        if ((int) $media->store_id !== (int) $request->user()->store?->id) {
            abort(403);
        }

        Storage::disk('public')->delete($media->path);
        $media->delete();

        return response()->json(['message' => 'Fájl törölve.']);
    }

    /**
     * A unique, lowercase filename within the store.
     *
     * "cover.jpg" becomes "cover-2.jpg" when it already exists, so an upload
     * never silently replaces a file the seller is already referencing.
     */
    private function uniqueName(int $storeId, string $original): string
    {
        $base = Str::slug(pathinfo($original, PATHINFO_FILENAME)) ?: 'kep';
        $extension = strtolower(pathinfo($original, PATHINFO_EXTENSION) ?: 'jpg');

        $candidate = "{$base}.{$extension}";
        $counter = 2;

        while (StoreMedia::where('store_id', $storeId)->where('name', $candidate)->exists()) {
            $candidate = "{$base}-{$counter}.{$extension}";
            $counter++;
        }

        return $candidate;
    }
}
