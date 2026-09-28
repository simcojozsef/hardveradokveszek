<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => [
                'required',
                'string',
                'max:100',
            ],

            'last_name' => [
                'required',
                'string',
                'max:100',
            ],

            'bank_name' => [
                'required',
                'string',
                'max:150',
            ],

            'iban' => [
                'required',
                'string',
                'max:64',
            ],

            'swift_code' => [
                'required',
                'string',
                'max:32',
            ],

            'account_number' => [
                'required',
                'string',
                'max:64',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
            ],

            'phone' => [
                'required',
                'string',
                'max:40',
            ],
        ];
    }
}