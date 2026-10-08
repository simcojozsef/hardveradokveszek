<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function messages(): array
    {
        return [
            'slug.prohibited' => 'A slug (üzlet aldomain) létrehozás után nem módosítható.',
        ];
    }

    public function rules(): array
    {
        /*
         * The slug is the store's subdomain and is fixed for the life of the
         * store. A request that tries to change it is rejected outright rather
         * than silently ignored, so a caller never believes it succeeded.
         */
        if ($this->has('slug')) {
            return [
                'slug' => ['prohibited'],
            ];
        }

        return [
            'name' => [
                'required',
                'string',
                'max:120',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'contact_phone' => [
                'nullable',
                'string',
                'max:32',
            ],

            'contact_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }
}