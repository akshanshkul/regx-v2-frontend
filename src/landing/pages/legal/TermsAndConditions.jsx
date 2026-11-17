import React from 'react';
import LegalPageLayout from './LegalPageLayout';

const TermsAndConditions = () => {
    return (
        <LegalPageLayout title="Terms & Conditions" lastUpdated="September 13, 2026">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
                By accessing or using the RegX platform ("Platform"), you agree to be bound by these Terms and Conditions. 
                If you do not agree to these terms, please do not use our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. User Responsibilities</h2>
            <p>Whether you are an athlete, official, or organizer, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide accurate, current, and complete information during registration.</li>
                <li>Maintain the security of your password and account credentials.</li>
                <li>Not use the Platform for any illegal or unauthorized purpose.</li>
                <li>Not attempt to disrupt or compromise the integrity of our servers and networks.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Organizers and Events</h2>
            <p>
                RegX provides software to facilitate event management. We are not responsible for the actual execution, 
                safety, or logistics of the sports events listed on our Platform. Organizers are solely responsible for 
                ensuring their events comply with local laws, safety standards, and sporting federation rules.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Intellectual Property</h2>
            <p>
                All content on the Platform, including logos, software code, UI designs, and algorithms, are the property 
                of RegX and TechCov. You may not copy, modify, distribute, or reverse engineer any part of the Platform 
                without explicit written consent.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Limitation of Liability</h2>
            <p>
                In no event shall RegX be liable for any indirect, incidental, special, consequential, or punitive damages, 
                including loss of profits, data, or goodwill, arising out of your use of the Platform or participation in 
                events registered through the Platform.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Changes to Terms</h2>
            <p>
                We reserve the right to modify these terms at any time. Continued use of the Platform following any changes 
                indicates your acceptance of the new terms.
            </p>
        </LegalPageLayout>
    );
};

export default TermsAndConditions;
