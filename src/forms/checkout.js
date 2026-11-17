/**
 * Driving the Razorpay checkout from a registration page.
 *
 * The browser is never the authority on whether a payment succeeded — it only
 * carries Razorpay's answer back for the server to verify. So everything here
 * ends in a call to our own API, and the answer it gives is the one the page
 * shows.
 *
 * Every way out of the checkout is handled: paid, declined, dismissed, and the
 * script failing to load at all.
 */

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

let loading = null;

/**
 * Loads the checkout script once, however many times this is called.
 *
 * Rejects rather than hanging when it cannot load — an ad blocker, an offline
 * phone — so the page can say the payment could not be opened instead of
 * showing a spinner forever.
 */
export const loadCheckout = () => {
    if (window.Razorpay) return Promise.resolve(window.Razorpay);

    loading ??= new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${SCRIPT}"]`);
        const script = existing ?? document.createElement('script');

        const done = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('unavailable')));

        script.addEventListener('load', done);
        script.addEventListener('error', () => {
            loading = null;
            reject(new Error('unavailable'));
        });

        if (!existing) {
            script.src = SCRIPT;
            script.async = true;
            document.body.appendChild(script);
        }
    });

    return loading;
};

/**
 * Opens the checkout and resolves with what happened.
 *
 * @param {object} intent  The payment block the API returned with the submission
 * @param {object} payer   Name, email and phone to prefill, if the form asked
 *
 * @returns {Promise<{outcome: 'paid'|'failed'|'dismissed', response?: object, error?: object}>}
 */
export const openCheckout = async (intent, payer = {}) => {
    const Razorpay = await loadCheckout();

    return new Promise((resolve) => {
        // Guards against both handlers firing — dismissing after a success, or
        // a failure followed by the modal closing — so the page is told once.
        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        const checkout = new Razorpay({
            key: intent.keyId,
            order_id: intent.orderId,
            amount: intent.amount,
            currency: intent.currency,
            name: intent.name,
            description: intent.description,
            prefill: {
                name: payer.name || '',
                email: payer.email || '',
                contact: payer.phone || '',
            },
            notes: { reference: intent.reference },
            theme: { color: '#F26522' },
            // Nothing here is trusted; it is carried to our API to be verified.
            handler: (response) => finish({ outcome: 'paid', response }),
            modal: {
                ondismiss: () => finish({ outcome: 'dismissed' }),
                escape: true,
                confirm_close: true,
            },
        });

        checkout.on('payment.failed', (event) =>
            finish({ outcome: 'failed', error: event?.error ?? {} })
        );

        checkout.open();
    });
};
