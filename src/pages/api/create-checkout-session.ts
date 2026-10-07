import type { APIRoute } from 'astro';

export const prerender = false;

type StripeCheckoutSessionResponse = {
	client_secret?: string | null;
	error?: {
		message?: string;
	};
};

export const POST: APIRoute = async ({ locals }) => {
	const env = locals.runtime.env as Record<string, string | undefined>;
	const secretKey = env.STRIPE_SECRET_KEY;

	if (!secretKey) {
		return new Response(
			JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured.' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	const params = new URLSearchParams({
		ui_mode: 'form',
		mode: 'payment',
		billing_address_collection: 'required',
		'phone_number_collection[enabled]': 'false',
		'automatic_tax[enabled]': 'true',
		submit_type: 'pay',
		'shipping_address_collection[allowed_countries][0]': 'US',
		'name_collection[individual][enabled]': 'true',
		integration_identifier: 'custom_embedded_web_0001',
		'line_items[0][price]': 'price_...',
		'line_items[0][quantity]': '1',
	});

	const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Stripe-Version':
				'2026-03-25.dahlia; custom_checkout_payment_form_preview=v1',
		},
		body: params,
	});

	const session = (await stripeResponse.json()) as StripeCheckoutSessionResponse;

	if (!stripeResponse.ok || !session.client_secret) {
		return new Response(
			JSON.stringify({
				error:
					session.error?.message ??
					'Stripe did not return a Checkout Session client secret.',
			}),
			{
				status: stripeResponse.status || 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	return new Response(JSON.stringify({ client_secret: session.client_secret }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
