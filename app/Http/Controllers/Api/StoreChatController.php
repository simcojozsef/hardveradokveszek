<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConversation;
use App\Models\StoreMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoreChatController extends Controller
{
    public function session(Request $request): JsonResponse
    {
        return response()->json([
            'data' => ['authenticated' => $request->user('sanctum') !== null],
        ]);
    }

    public function start(Request $request, int $storeId): JsonResponse
    {
        $store = Store::query()->findOrFail($storeId);
        abort_unless($store->is_active, 404);
        abort_if((int) $store->user_id === (int) $request->user()->id, 403, 'You cannot chat with your own store.');

        $validated = $request->validate([
            'product_id' => ['required', 'integer'],
        ]);

        $product = Product::query()
            ->with('images')
            ->whereKey($validated['product_id'])
            ->where('store_id', $store->id)
            ->visibleForSale()
            ->firstOrFail();

        // The migration's unique(store_id, buyer_id) prevents duplicate threads.
        $conversation = StoreConversation::query()->firstOrCreate(
            [
                'store_id' => $store->id,
                'buyer_id' => $request->user()->id,
            ],
            ['product_id' => $product->id]
        );

        // One buyer/store thread is reused; its context follows the product
        // from which the buyer most recently opened the chat.
        if ((int) $conversation->product_id !== (int) $product->id) {
            $conversation->update(['product_id' => $product->id]);
        }

        return response()->json([
            'data' => [
                'id' => $conversation->id,
                'store' => [
                    'id' => $store->id,
                    'name' => $store->name,
                    'slug' => $store->slug,
                ],
                'product' => $this->productData($product),
                'viewer_id' => $request->user()->id,
            ],
        ]);
    }

    public function sellerConversations(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        if (! $store) {
            return response()->json(['data' => [
                'conversations' => [],
                'viewer_id' => $request->user()->id,
            ]]);
        }

        $viewerId = (int) $request->user()->id;

        $conversations = StoreConversation::query()
            ->select('store_conversations.*')
            ->where('store_id', $store->id)
            ->with(['buyer:id,name', 'product.images'])
            ->withCount([
                'messages as unread_count' => fn ($query) => $query
                    ->whereNull('read_at')
                    ->where('sender_id', '!=', $viewerId),
            ])
            ->addSelect([
                'last_message_body' => StoreMessage::query()
                    ->select('body')
                    ->whereColumn('conversation_id', 'store_conversations.id')
                    ->orderByDesc('id')
                    ->limit(1),
                'last_message_sender_id' => StoreMessage::query()
                    ->select('sender_id')
                    ->whereColumn('conversation_id', 'store_conversations.id')
                    ->orderByDesc('id')
                    ->limit(1),
                'last_message_created_at' => StoreMessage::query()
                    ->select('created_at')
                    ->whereColumn('conversation_id', 'store_conversations.id')
                    ->orderByDesc('id')
                    ->limit(1),
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn ($conversation) => [
                'id' => $conversation->id,
                'buyer' => [
                    'id' => $conversation->buyer_id,
                    'name' => $conversation->buyer?->name ?? 'Felhasználó',
                ],
                'product' => $conversation->product
                    ? $this->productData($conversation->product)
                    : null,
                'unread_count' => (int) $conversation->unread_count,
                'last_message' => $conversation->last_message_body ? [
                    'body' => $conversation->last_message_body,
                    'sender_id' => $conversation->last_message_sender_id,
                    'created_at' => $conversation->last_message_created_at,
                ] : null,
                'last_message_at' => $conversation->last_message_at,
            ]);

        return response()->json(['data' => [
            'conversations' => $conversations,
            'viewer_id' => $request->user()->id,
        ]]);
    }

    public function buyerConversations(Request $request): JsonResponse
    {
        $viewerId = (int) $request->user()->id;

        $conversations = StoreConversation::query()
            ->select('store_conversations.*')
            ->where('buyer_id', $viewerId)
            ->with(['store:id,name,slug', 'product.images'])
            ->withCount([
                'messages as unread_count' => fn ($query) => $query
                    ->whereNull('read_at')
                    ->where('sender_id', '!=', $viewerId),
            ])
            ->addSelect([
                'last_message_body' => StoreMessage::query()
                    ->select('body')
                    ->whereColumn('conversation_id', 'store_conversations.id')
                    ->orderByDesc('id')
                    ->limit(1),
                'last_message_sender_id' => StoreMessage::query()
                    ->select('sender_id')
                    ->whereColumn('conversation_id', 'store_conversations.id')
                    ->orderByDesc('id')
                    ->limit(1),
                'last_message_created_at' => StoreMessage::query()
                    ->select('created_at')
                    ->whereColumn('conversation_id', 'store_conversations.id')
                    ->orderByDesc('id')
                    ->limit(1),
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn ($conversation) => [
                'id' => $conversation->id,
                'store' => [
                    'id' => $conversation->store_id,
                    'name' => $conversation->store?->name ?? 'Üzlet',
                    'slug' => $conversation->store?->slug,
                ],
                'product' => $conversation->product
                    ? $this->productData($conversation->product)
                    : null,
                'unread_count' => (int) $conversation->unread_count,
                'last_message' => $conversation->last_message_body ? [
                    'body' => $conversation->last_message_body,
                    'sender_id' => $conversation->last_message_sender_id,
                    'created_at' => $conversation->last_message_created_at,
                ] : null,
                'last_message_at' => $conversation->last_message_at,
            ]);

        return response()->json([
            'data' => [
                'conversations' => $conversations,
                'viewer_id' => $viewerId,
            ],
        ]);
    }

    public function messages(Request $request, StoreConversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);
        $conversation->loadMissing('product.images');

        $conversation->messages()
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = $conversation->messages()
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (StoreMessage $message) => $this->messageData($message));

        return response()->json([
            'data' => [
                'messages' => $messages,
                'product' => $conversation->product
                    ? $this->productData($conversation->product)
                    : null,
                'viewer_id' => $request->user()->id,
            ],
        ]);
    }

    public function send(Request $request, StoreConversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);
        abort_unless($conversation->store->is_active, 404);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);
        $body = trim($validated['body']);
        if ($body === '') {
            return response()->json(['message' => 'Message cannot be empty.'], 422);
        }

        $message = DB::transaction(function () use ($conversation, $request, $body) {
            $message = $conversation->messages()->create([
                'sender_id' => $request->user()->id,
                'body' => $body,
            ]);
            $conversation->update(['last_message_at' => $message->created_at]);
            return $message;
        });

        return response()->json(['data' => $this->messageData($message)], 201);
    }

    private function authorizeParticipant(Request $request, StoreConversation $conversation): void
    {
        $conversation->loadMissing('store:id,user_id,is_active');
        $userId = (int) $request->user()->id;
        abort_unless(
            $userId === (int) $conversation->buyer_id
                || $userId === (int) $conversation->store->user_id,
            403
        );
    }

    private function messageData(StoreMessage $message): array
    {
        return [
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'body' => $message->body,
            'created_at' => $message->created_at,
            'read_at' => $message->read_at,
        ];
    }

    private function productData(Product $product): array
    {
        $image = $product->primaryImage();

        return [
            'id' => $product->id,
            'name' => $product->name,
            'url' => '/product/' . $product->id,
            'image' => $image ? asset('storage/' . $image->path) : null,
        ];
    }
}
