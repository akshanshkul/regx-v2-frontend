import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingLayout from '../landing/layouts/LandingLayout';
import Home from '../landing/pages/Home';

import PrivacyPolicy from '../landing/pages/legal/PrivacyPolicy';
import TermsAndConditions from '../landing/pages/legal/TermsAndConditions';
import RefundPolicy from '../landing/pages/legal/RefundPolicy';
import DataProtectionPolicy from '../landing/pages/legal/DataProtectionPolicy';
import Sitemap from '../landing/pages/legal/Sitemap';
import Contact from '../landing/pages/Contact';

// Placeholder pages for later
const Pricing = () => <div className="py-32 text-center text-2xl font-bold">Pricing Page (Coming soon)</div>;

const PublicRoutes = () => {
    return (
        <Routes>
            <Route element={<LandingLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/refund" element={<RefundPolicy />} />
                <Route path="/dpdp-policy" element={<DataProtectionPolicy />} />
                <Route path="/sitemap" element={<Sitemap />} />
            </Route>
        </Routes>
    );
};

export default PublicRoutes;
