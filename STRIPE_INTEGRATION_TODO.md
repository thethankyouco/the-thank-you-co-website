# Stripe Integration TODO

This file is the single source of truth for the remaining Stripe Checkout setup.

The repository had no existing Stripe Checkout Session creation call, so this integration uses **Scenario B**. The server endpoint uses the Cloudflare Workers native `fetch` API to call Stripe directly, avoiding an unnecessary server SDK dependency and package-lock change.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [src/pages/api/create-checkout-session.ts](src/pages/api/create-checkout-session.ts)

| Field | Current Value | What to Set |
|-------|---------------|-------------|
| mode | payment | Keep `"payment"` for The Thank You Co.'s one-time product purchases. Change to `"subscription"` only if this checkout is later used for recurring billing. |
| line_items[0].price | price_... | Replace with the actual Stripe Price ID from the Stripe Dashboard or API. |

The current shop sells one-time physical goods, so `mode=payment` is the appropriate value for the present integration.

## Configured Parameters

These parameters were configured in Checkout Studio and are already set in the new server endpoint.

**Files containing these parameters:**
- [src/pages/api/create-checkout-session.ts](src/pages/api/create-checkout-session.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | form |
| mode | payment |
| billing_address_collection | required |
| phone_number_collection.enabled | false |
| automatic_tax.enabled | true |
| submit_type | pay |
| shipping_address_collection.allowed_countries | US |
| name_collection.individual.enabled | true |
| integration_identifier | custom_embedded_web_0001 |
| payment_method_collection | Omitted because mode is `payment`; the supplied integration rules require it only for `subscription` mode. |
| Stripe-Version header | 2026-03-25.dahlia; custom_checkout_payment_form_preview=v1 |

The repository did not have a Stripe server SDK installed, so there was no SDK version to inspect. The integration therefore uses the required `form` UI mode and calls the Stripe REST API with the required Dahlia preview version header.

## Client Checkout Form

The embedded form is implemented in:

- [src/pages/checkout.astro](src/pages/checkout.astro)

It loads Stripe.js directly from:

`https://js.stripe.com/dahlia/stripe.js`

The Stripe client is initialized with:

`custom_checkout_payment_form_1`

Configured appearance:

| Setting | Value |
|---------|-------|
| Background | #fff8ec |
| Primary | #207a76 |
| Text | #403d38 |
| Danger | #d94f3d |
| Success | #477a61 |
| Border radius | 4px |
| Base font size | 16px |
| Spacing unit | 4px |

## Environment Variables

Do **not** commit real Stripe keys to GitHub.

The integration expects these Cloudflare Worker environment bindings:

| Variable | Purpose |
|----------|---------|
| STRIPE_SECRET_KEY | Server-only Stripe secret key. Never expose this to browser code. |
| VITE_STRIPE_PUBLISHABLE_KEY | Stripe publishable key used to initialize Stripe.js. This key is safe to expose to the browser. |

### Production / Cloudflare

Set `STRIPE_SECRET_KEY` as a Cloudflare Worker **secret**.

Using Wrangler:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
```

Set `VITE_STRIPE_PUBLISHABLE_KEY` as a normal Cloudflare Worker text environment variable in the Cloudflare dashboard, or as an environment binding in your deployment configuration.

### Local development

Create a local `.dev.vars` file that is not committed:

```text
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

The existing `.gitignore` should continue to protect local environment files. Verify this before adding real credentials.

## Dependencies

No new npm dependency is required.

- Server: Cloudflare Workers native `fetch` calls Stripe's HTTPS API.
- Client: Stripe.js is loaded directly from Stripe's required hosted URL and is not bundled or self-hosted.

This keeps the integration surgical and avoids modifying `package.json` or `package-lock.json`.

## Project Structure

New files created:

```text
src/
  pages/
    checkout.astro
    api/
      create-checkout-session.ts
STRIPE_INTEGRATION_TODO.md
```

No existing application files were modified.

## How the Integration Works

1. A customer visits `/checkout`.
2. The page loads Stripe.js directly from Stripe.
3. The browser POSTs to `/api/create-checkout-session`.
4. The Cloudflare server endpoint creates a Checkout Session using the configured Checkout Studio parameters.
5. The endpoint returns `{ "client_secret": "..." }` as JSON.
6. The browser passes that client secret into `stripe.initCheckoutFormSdk(...)`.
7. Stripe renders the payment form inside `#checkout-form`.
8. The form's `confirm` event calls Stripe's Checkout Form confirmation action.

## Testing

Before using live keys, use Stripe **test mode** keys and a test Price ID.

Common Stripe test cards:

| Scenario | Card number |
|----------|-------------|
| Successful payment | 4242 4242 4242 4242 |
| Authentication required | 4000 0025 0000 3155 |

Use any future expiration date and any valid CVC while in test mode.

Test at minimum:

- Successful checkout.
- Required billing address.
- Required customer name.
- US shipping-address collection.
- Automatic tax calculation.
- Failed/declined payment behavior.
- Mobile layout.
- Stripe Dashboard receipt/payment visibility.

## Next Steps

1. Replace `price_...` in [src/pages/api/create-checkout-session.ts](src/pages/api/create-checkout-session.ts) with the real Stripe Price ID.
2. Add `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` to Cloudflare.
3. Deploy and test `/checkout` using Stripe test-mode keys.
4. Confirm the product's Stripe Tax code is correct in the Stripe Product Catalog.
5. Confirm the required tax registrations are configured in Stripe Tax before collecting tax in production.
6. Add fulfillment/order handling after Checkout works. The recommended production pattern is a verified Stripe webhook for `checkout.session.completed`; no webhook was added here because the requested integration was limited to the Checkout Session and embedded form.
7. Add order tracking/inventory logic when the site has a datastore or order model to attach it to.
8. Shipping pricing is not included because `shipping_options` was absent from the supplied Checkout Studio Field Intents. Configure a shipping rate in Checkout Studio first, then update the integration from the new Field Intents rather than adding an unconfigured parameter manually.

## Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/testing
