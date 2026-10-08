<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\EmailOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private readonly EmailOtpService $otp,
    ) {
    }

    /**
     * Register a new account.
     *
     * The account is created but NOT signed in. A verification code is emailed
     * first; the account only becomes usable once the code is confirmed, which
     * is what stops automated signups.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
            'role' => $request->string('role')->toString(),
        ]);

        $this->otp->sendVerificationCode($user);

        return response()->json([
            'message' => 'Registration successful. Please verify your email.',
            'requires_verification' => true,
            'email' => $user->email,
        ], 201);
    }

    /**
     * Confirm the emailed code and finish registration.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'digits:6'],
        ]);

        $user = User::query()
            ->where('email', $validated['email'])
            ->first();

        if (!$user || $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Invalid verification data.',
            ], 422);
        }

        if (!$this->otp->verify($user, $validated['code'])) {
            return response()->json([
                'message' => 'The verification code is invalid or expired.',
            ], 422);
        }

        $user->markEmailAsVerified();

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Email verified.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Resend the registration verification code.
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()
            ->where('email', $validated['email'])
            ->first();

        // Always answer the same, so this cannot be used to enumerate accounts.
        if ($user && !$user->hasVerifiedEmail()) {
            $this->otp->sendVerificationCode($user);
        }

        return response()->json([
            'message' => 'If the address needs verification, a code was sent.',
        ]);
    }

    /**
     * Step 1 of login: check the credentials, then email a second-factor code.
     *
     * No session is granted here — the caller only learns that a code is on
     * the way.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $email = $request->string('email')->toString();
        $password = $request->string('password')->toString();

        $user = User::query()->where('email', $email)->first();

        // A Google-only account has no password: never let it in this way.
        if (!$user || !$user->password || !Hash::check($password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        /*
         * Exempt accounts sign in with the password alone.
         *
         * Must run BEFORE the verification branch: an exempt account has no
         * real mailbox, so trying to send it a verification code fails and
         * turns a valid login into a server error. The account is trusted
         * as-is, so it is marked verified on first sign-in.
         */
        if ($user->isTwoFactorExempt()) {
            if (!$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            Auth::login($user);

            if ($request->hasSession()) {
                $request->session()->regenerate();
            }

            return response()->json([
                'message' => 'Login successful.',
                'user' => new UserResource($user),
            ]);
        }

        if (!$user->hasVerifiedEmail()) {
            /*
             * Always send a fresh code. Trying to be clever here ("only send
             * when there is no live code") created a dead end: if an earlier
             * code never reached the inbox but was still unexpired in the
             * database, no new mail was sent and the user was locked out.
             * Now the act of asking for a code always produces one.
             */
            $this->otp->sendVerificationCode($user);

            return response()->json([
                'message' => 'Your email address is not verified yet.',
                'requires_verification' => true,
                'email' => $user->email,
            ], 422);
        }

        $this->otp->sendLoginCode($user);

        /*
         * The pending user is carried by a short-lived encrypted token rather
         * than the session: the challenge is a separate request and the
         * session cookie is not guaranteed to be the same one mid-login.
         */
        return response()->json([
            'message' => 'A login code was sent to your email address.',
            'requires_2fa' => true,
            'email' => $user->email,
            'two_factor_token' => $this->makeTwoFactorToken($user),
        ]);
    }

    /**
     * Step 2 of login: confirm the emailed code and grant the session.
     */
    public function twoFactorChallenge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'digits:6'],
            'two_factor_token' => ['required', 'string'],
        ]);

        $userId = $this->userIdFromTwoFactorToken(
            $validated['two_factor_token']
        );

        if (!$userId) {
            return response()->json([
                'message' => 'Your login session expired. Please sign in again.',
            ], 419);
        }

        $user = User::find($userId);

        if (!$user || !$this->otp->verify($user, $validated['code'])) {
            return response()->json([
                'message' => 'The login code is invalid or expired.',
            ], 422);
        }

        Auth::login($user);

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Resend the login code.
     */
    public function resendTwoFactor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'two_factor_token' => ['required', 'string'],
        ]);

        $userId = $this->userIdFromTwoFactorToken(
            $validated['two_factor_token']
        );

        if ($userId) {
            $user = User::find($userId);

            if ($user) {
                $this->otp->sendLoginCode($user);
            }
        }

        return response()->json([
            'message' => 'If your session is still active, a new code was sent.',
        ]);
    }

    /**
     * Encrypt the pending user id with a short lifetime, so it can travel to
     * the client and back without relying on the session surviving the step.
     */
    private function makeTwoFactorToken(User $user): string
    {
        return Crypt::encryptString(json_encode([
            'user_id' => $user->id,
            'expires_at' => now()->addMinutes(
                EmailOtpService::LOGIN_CODE_TTL
            )->timestamp,
        ]));
    }

    /**
     * Decode the token, rejecting anything tampered with or expired.
     */
    private function userIdFromTwoFactorToken(string $token): ?int
    {
        try {
            $payload = json_decode(
                Crypt::decryptString($token),
                true,
                flags: JSON_THROW_ON_ERROR
            );
        } catch (\Throwable) {
            return null;
        }

        $expiresAt = (int) ($payload['expires_at'] ?? 0);

        if ($expiresAt < now()->timestamp) {
            return null;
        }

        return (int) ($payload['user_id'] ?? 0) ?: null;
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}