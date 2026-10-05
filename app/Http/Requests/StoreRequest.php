<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('slug')) {
            $this->merge([
                'slug' => strtolower(trim($this->input('slug'))),
            ]);
        }
    }

    public function rules(): array
    {
        $isCreatingStore = $this->isMethod('POST');

        return [
            'name' => [
                'required',
                'string',
                'max:120',
            ],

            'slug' => [
                'required',
                'string',
                'max:63',
                'alpha_dash',
                'unique:stores,slug',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],

            'contact_phone' => $isCreatingStore
                ? ['required', 'string', 'max:32']
                : ['sometimes', 'nullable', 'string', 'max:32'],

            'contact_email' => $isCreatingStore
                ? ['required', 'string', 'email', 'max:255']
                : ['sometimes', 'nullable', 'string', 'email', 'max:255'],
        ];
    }
}
