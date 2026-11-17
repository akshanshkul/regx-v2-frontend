import React from 'react';
import LegalPageLayout from './LegalPageLayout';

const PrivacyPolicy = () => {
    return (
        <LegalPageLayout title="Privacy Policy" lastUpdated="September 13, 2026">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <p>
                When you use RegX to register for sports events or manage leagues, we may collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Personal Identification Information:</strong> Name, email address, phone number, date of birth, and government ID (if required by event organizers).</li>
                <li><strong>Sports Profile Data:</strong> Weight categories, belt ranks, club affiliation, and past match statistics.</li>
                <li><strong>Payment Information:</strong> Transaction IDs and billing details (we do not store full credit card numbers; these are handled securely by Razorpay).</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Facilitate event registrations and create tournament fixtures/brackets.</li>
                <li>Process payments and subscriptions.</li>
                <li>Send important updates regarding match timings, rule changes, and organizational announcements.</li>
                <li>Improve our platform's functionality and user experience.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Data Sharing and Third Parties</h2>
            <p>
                We do not sell your personal data. We only share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Event Organizers:</strong> Organizers of the events you register for receive the data necessary to run the event.</li>
                <li><strong>Service Providers:</strong> Third-party processors like Razorpay for payments and AWS for secure cloud hosting.</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our legal rights.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Cookies and Tracking</h2>
            <p>
                We use cookies to maintain your session (like keeping you logged into the dashboard) and to analyze site traffic. 
                You can configure your browser to reject cookies, though some platform features may not function properly.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Contact Us</h2>
            <p>
                For any privacy-related queries, please review our separate Data Protection Policy or email us at privacy@regx.in.
            </p>
        </LegalPageLayout>
    );
};

export default PrivacyPolicy;
