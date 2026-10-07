<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Throwable;

/*
 * Google authentication.
 *
 * The app is a React SPA that authenticates with session cookies (Sanctum),
 * but a social login has to be a full-page redirect to Google and back, so
 * these routes live in the web group. On return we log the user into the
 * session and then bounce them back into the SPA, which picks the session up
 * on its next /api/me call.
 */
class SocialAuthController extends Controller
{
    private const PROVIDER = 'google';

    /*
     * Send the visitor to Google.
     *
     * The intended role (buyer/seller) cannot be inferred from Google, so the
     * register page passes it along and we stash it in the session until the
     * callback comes back.
     */
    public function redirect(Request $request): RedirectResponse
    {
        $role = $request->query('role');

        if (in_array($role, ['buyer', 'seller'], true)) {
            $request->session()->put('social.role', $role);
        }

        $intended = $request->query('intended');

        if (is_string($intended) && $this->isSafeRedirect($intended)) {
            $request->session()->put('social.intended', $intended);
        }

        return Socialite::driver(self::PROVIDER)->redirect();
    }

    /*
     * Handle Google's callback, then return the visitor to the SPA.
     */
    public function callback(Request $request): RedirectResponse
    {
        if ($request->filled('error')) {
            return $this->fail('A Google bejelentkezést megszakítottad.');
        }

        try {
            $googleUser = Socialite::driver(self::PROVIDER)->user();
        } catch (Throwable $exception) {
            Log::error('Google authentication failed.', [
                'message' => $exception->getMessage(),
            ]);

            return $this->fail('Nem sikerült a Google bejelentkezés.');
        }

        $email = $googleUser->getEmail();

        if (!$email) {
            return $this->fail(
                'A Google fiók nem adott meg e-mail címet.'
            );
        }

        try {
            $user = $this->resolveUser($googleUser, $email, $request);
        } catch (Throwable $exception) {
            Log::error('Google account provisioning failed.', [
                'message' => $exception->getMessage(),
            ]);

            return $this->fail('Nem sikerült a fiók létrehozása.');
        }

        Auth::login($user, remember: true);

        $request->session()->regenerate();

        $request->session()->forget(['social.role', 'social.intended']);

        return redirect()->to($this->intendedPath($request, $user));
    }

    /*
     * Find the account behind this Google identity, or create it.
     *
     * Matching order:
     *   1. the stored Google id (stable, survives an email change)
     *   2. the email address, which links Google to an existing account
     *      only when Google reports the address as verified
     */
    private function resolveUser(
        SocialiteUser $googleUser,
        string $email,
        Request $request
    ): User {
        $providerId = (string) $googleUser->getId();

        $user = User::query()
            ->where('provider', self::PROVIDER)
            ->where('provider_id', $providerId)
            ->first();

        if ($user) {
            $this->syncProfile($user, $googleUser);

            return $user;
        }

        $existing = User::query()
            ->where('email', $email)
            ->first();

        if ($existing) {
            /*
             * Only link automatically when Google vouches for the address,
             * so an unverified Google email can never take over an account.
             */
            if (!$this->isEmailVerified($googleUser)) {
                abort(409, 'E-mail már használatban.');
            }

            $this->syncProfile($existing, $googleUser);

            return $existing;
        }

        return User::create([
            'name' => $this->resolveName($googleUser, $email),
            'email' => $email,
            'password' => null,
            'role' => $this->resolveRole($request),
            'provider' => self::PROVIDER,
            'provider_id' => $providerId,
            'avatar_url' => $googleUser->getAvatar(),
            'email_verified_at' => now(),
        ]);
    }

    /*
     * Refresh the Google-sourced fields on an existing account.
     */
    private function syncProfile(User $user, SocialiteUser $googleUser): void
    {
        $user->fill([
            'provider' => self::PROVIDER,
            'provider_id' => (string) $googleUser->getId(),
            'avatar_url' => $googleUser->getAvatar() ?: $user->avatar_url,
        ]);

        if (!$user->email_verified_at) {
            $user->email_verified_at = now();
        }

        $user->save();
    }

    private function resolveName(SocialiteUser $googleUser, string $email): string
    {
        $name = trim((string) $googleUser->getName());

        if ($name !== '') {
            return Str::limit($name, 100, '');
        }

        // Fall back to the local part of the address when Google sends none.
        return Str::limit(Str::before($email, '@'), 100, '');
    }

    /*
     * A role can never come from Google, so it is either the one chosen on the
     * register page or the safe default.
     */
    private function resolveRole(Request $request): string
    {
        $role = $request->session()->pull('social.role', 'buyer');

        return in_array($role, ['buyer', 'seller'], true)
            ? $role
            : 'buyer';
    }

    private function isEmailVerified(SocialiteUser $googleUser): bool
    {
        $raw = $googleUser->getRaw();

        return (bool) ($raw['email_verified'] ?? false);
    }

    /*
     * Where to drop the visitor once they are signed in.
     */
    private function intendedPath(Request $request, User $user): string
    {
        $intended = $request->session()->pull('social.intended');

        if (is_string($intended) && $this->isSafeRedirect($intended)) {
            return $intended;
        }

        return match ($user->role) {
            'seller' => '/seller',
            'admin' => '/admin',
            default => '/buyer',
        };
    }

    /*
     * Only allow same-site absolute paths, so a crafted link cannot bounce
     * the visitor to another host.
     */
    private function isSafeRedirect(string $path): bool
    {
        return str_starts_with($path, '/')
            && !str_starts_with($path, '//');
    }

    private function fail(string $message): RedirectResponse
    {
        return redirect()->to(
            '/login?social_error=' . urlencode($message)
        );
    }
}
