<?php

namespace App\Http\Requests;

use App\Models\BillingProfile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/*
 * Billing identity collected before checkout.
 *
 * The country list is intentionally open (a plain ISO-3166 alpha-2 value):
 * the marketplace already serves sellers outside Hungary and the tax
 * configuration is finalised with the accountant, so the form must not
 * invent a restricted country set.
 */
class BillingProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in([BillingProfile::INDIVIDUAL, BillingProfile::COMPANY])],
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255'],
            'country' => ['required', 'string', 'size:2'],
            'postal_code' => ['required', 'string', 'max:20'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:255'],
            // Required for a company; ignored for an individual.
            'tax_number' => [
                Rule::requiredIf(fn () => $this->input('type') === BillingProfile::COMPANY),
                'nullable',
                'string',
                'max:32',
            ],
        ];
    }
}
