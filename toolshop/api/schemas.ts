// =============================================================================
// toolshop/api/schemas.ts — Response contracts (runtime-validated with Zod)
// =============================================================================
// Shapes verified against the live API (2026-10-09) and the Laravel sources.
// Objects are .passthrough(): a NEW field does not break the contract, a
// MISSING or RE-TYPED field does — that is the regression we want to catch.
// =============================================================================

import { z } from 'zod';

/** Toolshop ids are 26-char ULIDs (products upper-case, carts lower-case). */
export const Ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/i, 'ULID expected');

export const Status = z.object({ app_name: z.literal('Toolshop'), environment: z.string(), version: z.string() }).passthrough();

export const BrandRef = z.object({ id: Ulid, name: z.string().min(1) }).passthrough();
export const CategoryRef = z.object({ id: Ulid, name: z.string().min(1), slug: z.string().min(1) }).passthrough();

export const Product = z
  .object({
    id: Ulid,
    name: z.string().min(1),
    description: z.string(),
    price: z.number().positive(),
    is_location_offer: z.boolean(),
    is_rental: z.boolean(),
    in_stock: z.boolean(),
    is_eco_friendly: z.boolean(),
    co2_rating: z.enum(['A', 'B', 'C', 'D', 'E']),
    brand: BrandRef,
    category: CategoryRef,
    product_image: z.object({ file_name: z.string() }).passthrough(),
  })
  .passthrough();
export type Product = z.infer<typeof Product>;

export const ProductPage = z
  .object({
    current_page: z.number().int().positive(),
    data: z.array(Product),
    from: z.number().int().nullable(),
    last_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    to: z.number().int().nullable(),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
export type ProductPage = z.infer<typeof ProductPage>;

export const Brand = z.object({ id: Ulid, name: z.string().min(1), slug: z.string().min(1) }).passthrough();

export type CategoryNode = { id: string; name: string; slug: string; sub_categories?: CategoryNode[] };
export const CategoryNode: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({ id: Ulid, name: z.string(), slug: z.string(), sub_categories: z.array(CategoryNode).optional() }).passthrough(),
);

export const CartItem = z
  .object({
    id: Ulid,
    cart_id: Ulid,
    product_id: Ulid,
    quantity: z.number().int().min(1),
    discount_percentage: z.number().nullable(),
    product: z.object({ id: Ulid, name: z.string(), price: z.number() }).passthrough(),
  })
  .passthrough();

export const Cart = z
  .object({
    id: Ulid,
    additional_discount_percentage: z.number().nullable(),
    cart_items: z.array(CartItem),
  })
  .passthrough();
export type Cart = z.infer<typeof Cart>;

export const Token = z.object({ access_token: z.string().min(20), token_type: z.literal('bearer'), expires_in: z.number().positive() }).passthrough();

export const User = z
  .object({ id: Ulid, first_name: z.string(), last_name: z.string(), email: z.string().email() })
  .passthrough()
  // Security contract: sensitive columns must never be serialised
  .refine((u) => !('password' in u) && !('role' in u) && !('failed_login_attempts' in u) && !('totp_secret' in u), {
    message: 'sensitive field exposed in user payload',
  });

export const Invoice = z
  .object({
    id: Ulid,
    invoice_number: z.string().regex(/^INV-\d{4}/),
    total: z.number().nonnegative(),
    subtotal: z.number().nonnegative(),
    billing_city: z.string(),
    billing_country: z.string(),
  })
  .passthrough();

export const ValidationError = z.object({ message: z.string(), errors: z.record(z.array(z.string())).optional() }).passthrough();
/**
 * Field names in a 422 body. Toolshop uses TWO formats (finding TEXP-005):
 *   inline validation  -> { message, errors: { field: [..] } }
 *   FormRequest classes -> { field: [..] }            (register, products, brands…)
 */
export function errorFields(body: unknown): string[] {
  const b = (body ?? {}) as { errors?: Record<string, unknown> } & Record<string, unknown>;
  if (b.errors && typeof b.errors === 'object') return Object.keys(b.errors);
  return Object.keys(b).filter((k) => k !== 'message' && Array.isArray(b[k]));
}

export const MessageBody = z.object({ message: z.string() }).passthrough();
export const ErrorBody = z.object({ error: z.string() }).passthrough();

export const Address = z.object({ city: z.string(), country: z.string(), postcode: z.string(), state: z.string(), street: z.string(), house_number: z.string() }).passthrough();
export type Address = z.infer<typeof Address>;

/** Parse and return a readable error instead of a Zod stack trace. */
export function expectSchema<T>(schema: z.ZodType<T>, data: unknown, label = 'payload'): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`${label} does not match its contract:\n${issues}`);
  }
  return result.data;
}
