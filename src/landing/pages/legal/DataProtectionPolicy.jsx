import React from 'react';
import LegalPageLayout from './LegalPageLayout';

const DataProtectionPolicy = () => {
    return (
        <LegalPageLayout title="Data Protection Policy (DPDP Act 2023)" lastUpdated="September 19, 2026">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p>
                This Digital Personal Data Protection Policy outlines how RegX (Tenext services LLP) ("we," "our," "us") collects, 
                processes, and safeguards personal data in compliance with India's <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>.
                As a sports event management platform, we act as both a <strong>Data Fiduciary</strong> (when determining the purpose and means of processing data for our direct customers) 
                and a <strong>Data Processor</strong> (when processing data on behalf of organizers and federations).
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Lawful Basis for Processing</h2>
            <p>
                Under the DPDP Act, we process digital personal data based on the following lawful grounds:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Verifiable Consent:</strong> We obtain free, specific, informed, unconditional, and unambiguous consent with a clear affirmative action before processing your data.</li>
                <li><strong>Certain Legitimate Uses:</strong> Where you have voluntarily provided your personal data to us for a specified purpose without indicating objection.</li>
                <li><strong>Employment Purposes:</strong> For safeguarding employers from loss or liability, and providing benefits related to employment.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Data Minimization & Purpose Limitation</h2>
            <p>
                We restrict processing solely to specified, legitimate purposes disclosed to you when obtaining your consent. 
                We collect only the minimum personal data necessary to provide you with tournament brackets, live scoring, 
                registration processing, and organizational operations. We do not process data for any new or secondary purposes 
                without obtaining fresh, explicit consent.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Children's Data Processing</h2>
            <p>
                We recognize the heightened protection required for individuals under 18 years of age. 
                When an athlete under 18 registers on RegX:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>We strictly require and obtain verifiable parental or lawful guardian consent.</li>
                <li>We expressly prohibit behavioral monitoring, targeted advertising, and tracking of children.</li>
                <li>We do not process children's data in any manner likely to cause detrimental effects to their well-being.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Your Rights as a Data Principal</h2>
            <p>Under the DPDP Act, you possess fundamental rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Right to Information:</strong> You may request a summary of personal data processed by us and the identities of all Data Fiduciaries/Data Processors with whom we have shared your data.</li>
                <li><strong>Right to Correction & Erasure:</strong> You can request the correction of inaccurate data, completion of incomplete data, updating of data, and erasure of data no longer necessary for its original purpose.</li>
                <li><strong>Right to Grievance Redressal:</strong> We provide a readily available mechanism to register and resolve grievances.</li>
                <li><strong>Right to Nominate:</strong> You have the right to nominate another individual who, in the event of your death or incapacity, will exercise your rights under the DPDP Act.</li>
                <li><strong>Right to Withdraw Consent:</strong> You may withdraw your consent at any time. We will cease processing your personal data within a reasonable time unless such processing is required under applicable law.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Security Safeguards and Breach Notification</h2>
            <p>
                We implement robust technical and organizational measures to prevent personal data breaches, including 
                encryption, access control protocols, and continuous monitoring. 
                In the event of a personal data breach compromising confidentiality, integrity, or availability, 
                RegX will notify the <strong>Data Protection Board of India (DPBAI)</strong> and all affected Data Principals without undue delay, as required by the Act.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Data Retention and Cross-Border Transfers</h2>
            <p>
                We delete or fully anonymize personal data when it is no longer necessary for the purposes for which it was collected, or immediately upon withdrawal of your consent (subject to statutory retention obligations). 
                If data is transferred outside India, it will only be to countries not explicitly restricted by the Central Government, and subject to equal or stronger contractual safeguards.
            </p>

            {/* <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Contact the Data Protection Officer</h2>
            <p>
                If you wish to exercise your rights, file a grievance, or have questions about this DPDP compliance policy, 
                please contact our designated Data Protection Officer at:
            </p>
            <p className="mt-4 font-medium text-gray-900">
                Email: privacy@regx.techcov.in<br/>
                Address: RegX Legal Department, [Company Address]
            </p> */}
        </LegalPageLayout>
    );
};

export default DataProtectionPolicy;
