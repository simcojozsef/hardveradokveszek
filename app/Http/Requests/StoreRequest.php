<?php

namespace App\Http\Requests;

use App\Support\ReservedStoreSlugs;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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

    public function messages(): array
    {
        return [
            'slug.regex' => 'A slug csak kisbetűt, számot és kötőjelet tartalmazhat, és nem kezdődhet vagy végződhet kötőjellel.',
            'slug.not_in' => 'Ez a slug fenntartott, válassz másikat.',
            'slug.unique' => 'Ez a slug már foglalt, válassz másikat.',
            'slug.min' => 'A slug legalább 3 karakter legyen.',
        ];
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

            /*
             * The slug becomes the store's subdomain, so it must be a legal
             * DNS label and may not collide with a platform hostname. The
             * unique rule plus the reserved list is what stops a seller from
             * claiming admin.gigapiac.hu or api.gigapiac.hu.
             */
            'slug' => [
                'required',
                'string',
                'min:3',
                'max:63',
                'regex:' . ReservedStoreSlugs::pattern(),
                Rule::notIn(ReservedStoreSlugs::all()),
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
