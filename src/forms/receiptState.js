/**
 * What the receipt screen should say.
 *
 * Pulled out of the page because the wrong answer here is worse than a broken
 * layout: a participant who reads "your entry is confirmed" while a fee is
 * outstanding walks away believing they are registered when they are not.
 *
 * Three states, and only three:
 *   settled   nothing is owed, or it has been paid — safe to say confirmed
 *   inFlight  money is moving and we are waiting to hear
 *   owing     a fee is outstanding, however it is to be collected
 *
 * `payable` is separate from `owing`: a fee can be owed on a form that does not
 * take money, in which case there is nothing for a button to do.
 */

const IN_FLIGHT = ['opening', 'verifying', 'pending'];

export const receiptState = (receipt = {}, payment = {}) => {
    const paid = payment.stage === 'paid';
    const settled = paid || !receipt.paymentDue;
    const inFlight = !settled && IN_FLIGHT.includes(payment.stage);

    return {
        settled,
        inFlight,
        owing: !settled && !inFlight,
        // Only a form set to collect online can be paid from this page.
        payable: !settled && receipt.paymentMode === 'online',

        heading: settled
            ? 'Registration confirmed'
            : inFlight
              ? 'Registration received'
              : 'Almost done — payment required',

        // The organiser's own wording usually says the entry is confirmed, so
        // it is held back until that is true.
        message: settled
            ? (receipt.confirmation
                || `Thank you — your registration is confirmed${receipt.paymentDue ? ' and paid.' : '.'}`)
            : inFlight
              ? 'Your details are saved. We are just confirming the payment.'
              : 'Your details are saved, but your place is not confirmed until the fee is paid.',
    };
};
