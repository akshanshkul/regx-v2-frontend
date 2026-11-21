import React from 'react';
import LegalPageLayout from './LegalPageLayout';

const RefundPolicy = () => {
    return (
        <LegalPageLayout title="Refund Policy" lastUpdated="September 13, 2026">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. RegX Paisa Wallet Recharges</h2>
            <p>
                RP wallet recharge purchases are non-refundable. Any credit validity or expiry is shown for the selected recharge option before payment.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Athlete Event Registrations</h2>
            <p>
                RegX acts solely as a payment facilitator for sports federations and event organizers. 
                <strong>Refund policies for event registrations are determined strictly by the respective event organizer, not by RegX.</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>If you need to withdraw from a tournament and request a refund, you must contact the event organizer directly using the contact details provided on the event page.</li>
                <li>RegX cannot unilaterally issue refunds for athlete registration fees without the explicit authorization of the organizer.</li>
                <li>If the event is cancelled by the organizer, the organizer is responsible for initiating bulk refunds through the RegX dashboard.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Payment Gateway Fees</h2>
            <p>
                In the event a refund is approved by the organizer, please note that third-party payment gateway charges (such as Razorpay fees) 
                and RegX convenience fees may be non-refundable, depending on the specific event's policies.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Chargebacks and Disputes</h2>
            <p>
                If you initiate a chargeback with your bank without first attempting to resolve the refund with the event organizer, 
                your RegX account may be suspended pending investigation.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Contact</h2>
            <p>
                For questions regarding this refund policy, please contact billing@regx.in.
            </p>
        </LegalPageLayout>
    );
};

export default RefundPolicy;
