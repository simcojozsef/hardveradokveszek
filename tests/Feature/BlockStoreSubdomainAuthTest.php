<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BlockStoreSubdomainAuthTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['app.domain' => 'gigapiac.hu']);
    }

    /**
     * Every mutating auth endpoint must be refused on a store subdomain.
     */
    public static function blockedPaths(): array
    {
        return [
            'login' => ['api/auth/login', 'POST'],
            'register' => ['api/auth/register', 'POST'],
            'logout' => ['api/auth/logout', 'POST'],
            'social redirect' => ['auth/google/redirect', 'GET'],
            'social callback' => ['auth/google/callback', 'GET'],
        ];
    }

    #[DataProvider('blockedPaths')]
    public function test_auth_is_blocked_on_a_store_subdomain(string $path, string $verb): void
    {
        $response = $this->json($verb, "https://pcbolt.gigapiac.hu/{$path}");

        $response->assertStatus(403);
    }

    public function test_reading_the_session_is_allowed_on_a_store_subdomain(): void
    {
        // Reaching the controller (401 = not signed in) proves the middleware
        // did not block the request.
        $this->getJson('https://pcbolt.gigapiac.hu/api/me')
            ->assertStatus(401);
    }

    /**
     * The apex domain and its www alias are the real login surface. Reaching
     * the controller (a validation 422, not a 403) proves the middleware let
     * the request through.
     */
    public function test_auth_is_allowed_on_the_apex_domain(): void
    {
        $this->json('POST', 'https://gigapiac.hu/api/auth/login')
            ->assertStatus(422);
    }

    public function test_auth_is_allowed_on_the_www_alias(): void
    {
        $this->json('POST', 'https://www.gigapiac.hu/api/auth/login')
            ->assertStatus(422);
    }

    public function test_auth_is_allowed_on_localhost(): void
    {
        $this->json('POST', 'http://localhost/api/auth/login')
            ->assertStatus(422);
    }
}
