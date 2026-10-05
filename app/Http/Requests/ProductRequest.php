<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProductRequest extends FormRequest
{
    // ProductController authorizes create/update using the existing ProductPolicy.
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        return [
            'name' => [$required, 'required', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'price' => [$required, 'required', 'numeric', 'min:0'],
            'stock' => [$required, 'required', 'integer', 'min:0'],
            'category_id' => [$this->isMethod('post') ? 'required_without:category_ids' : 'sometimes', 'integer', 'exists:categories,id'],
            'category_ids' => [$this->isMethod('post') ? 'required_without:category_id' : 'sometimes', 'array', 'min:1', 'max:100'],
            'category_ids.*' => ['required', 'integer', 'distinct', 'exists:categories,id'],
            'is_active' => ['sometimes', 'boolean'],
            'condition' => [$required, 'required', Rule::in(['new', 'used'])],
            'listing_type' => ['sometimes', 'required', Rule::in(['offer', 'wanted'])],
            'county_id' => ['sometimes', 'nullable', 'integer', 'exists:counties,id'],
            'settlement_id' => ['sometimes', 'nullable', 'integer', 'exists:settlements,id'],
            'county' => ['sometimes', 'nullable', 'string', 'max:100'],
            'settlement' => ['sometimes', 'nullable', 'string', 'max:100'],
            'brand' => ['sometimes', 'nullable', 'string', 'max:100'],
            'model' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shipping_available' => ['sometimes', 'boolean'],
            'shipping_methods' => ['sometimes', 'array', 'max:4'],
            'shipping_methods.*' => ['string', 'distinct', Rule::in(['foxpost', 'gls', 'magyar_posta', 'other'])],
            'contains_ai' => ['sometimes', 'boolean'],
            'has_warranty' => ['sometimes', 'boolean'],
            'warranty_expires_at' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'personal_pickup' => ['sometimes', 'boolean'],
            'is_trusted_seller' => ['prohibited'],
            // Server-owned lifecycle values use a dedicated authorized status action.
            'listing_status' => ['prohibited'], 'posted_at' => ['prohibited'],
            'expires_at' => ['prohibited'], 'sold_at' => ['prohibited'],
            'expired_at' => ['prohibited'], 'deleted_at' => ['prohibited'], 'removed_at' => ['prohibited'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            // Use stored values for omitted PATCH fields.
            $product = $this->route('product');
            $stored = is_object($product) ? $product : null;
            $shipping = $this->exists('shipping_available')
                ? $this->boolean('shipping_available') : ($stored?->shipping_available ?? false);
            $methods = $this->exists('shipping_methods')
                ? $this->input('shipping_methods') : ($stored?->shipping_methods ?? []);
            if ($shipping && (!is_array($methods) || count($methods) === 0)) {
                $validator->errors()->add('shipping_methods', 'Válassz legalább egy csomagküldési módot.');
            }
            $warranty = $this->exists('has_warranty')
                ? $this->boolean('has_warranty') : ($stored?->has_warranty ?? false);
            $expires = $this->exists('warranty_expires_at')
                ? $this->input('warranty_expires_at') : $stored?->warranty_expires_at;
            if ($warranty && !$expires) {
                $validator->errors()->add('warranty_expires_at', 'Add meg a garancia lejáratát.');
            }
        });
    }
}
