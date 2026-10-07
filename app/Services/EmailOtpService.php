<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\TwoFactorCodeNotification;
use App\Notifications\VerifyEmailCodeNotification;

/*
 * One place that generates, sends and checks the emailed one-time codes.
 *
 * Codes are random 6-digit numbers, stored only as a hash on the user row,
 * and are invalidated the moment they are used or expire.
 */
class EmailOtpService
{
    public const LOGIN_CODE_TTL = 10;

    public const VERIFY_CODE_TTL = 60;

    public const MAX_ATTEMPTS = 5;

    /**
     * Generate a fresh login OTP, store it hashed and email it.
     */
    public function sendLoginCode(User $user): void
    {
        $code = $this->generateCode();

        $user->issueTwoFactorCode($code, self::LOGIN_CODE_TTL);

        $user->notify(
            new TwoFactorCodeNotification($code, self::LOGIN_CODE_TTL)
        );
    }

    /**
     * Generate a fresh email-verification code and email it.
     *
     * It reuses the same stored fields, because verification happens before
     * the account can ever log in, so the two codes never coexist.
     */
    public function sendVerificationCode(User $user): void
    {
        $code = $this->generateCode();

        $user->issueTwoFactorCode($code, self::VERIFY_CODE_TTL);

        $user->notify(
            new VerifyEmailCodeNotification($code, self::VERIFY_CODE_TTL)
        );
    }

    /**
     * Check a submitted code and, when correct, consume it.
     *
     * Returns false when there is no active code, it expired, it is wrong, or
     * too many wrong attempts already happened.
     */
    public function verify(User $user, string $code): bool
    {
        $user->refresh();

        if ($user->two_factor_attempts >= self::MAX_ATTEMPTS) {
            return false;
        }

        if (!$user->verifyTwoFactorCode($code)) {
            $user->increment('two_factor_attempts');

            return false;
        }

        $user->clearTwoFactorCode();

        return true;
    }

    /**
     * A 6-digit code with no leading-zero ambiguity for the user.
     */
    private function generateCode(): string
    {
        return str_pad(
            (string) random_int(0, 999999),
            6,
            '0',
            STR_PAD_LEFT
        );
    }
}
