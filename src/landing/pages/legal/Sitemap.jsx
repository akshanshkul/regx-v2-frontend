import React from 'react';
import LegalPageLayout from './LegalPageLayout';
import { Link } from 'react-router-dom';

const Sitemap = () => {
    return (
        <LegalPageLayout title="Sitemap" lastUpdated="September 13, 2026">
            <p>
                Welcome to the RegX sitemap. Use the links below to navigate our platform.
            </p>

            <div className="grid md:grid-cols-3 gap-12 mt-12">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">Main Pages</h3>
                    <ul className="space-y-3 text-regx-orange font-medium">
                        <li><Link to="/" className="hover:underline">Home</Link></li>
                        <li><Link to="/pricing" className="hover:underline">Pricing</Link></li>
                        <li><Link to="/contact" className="hover:underline">Contact</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">Account</h3>
                    <ul className="space-y-3 text-regx-orange font-medium">
                        <li><Link to="/login" className="hover:underline">Log In</Link></li>
                        <li><Link to="/signup" className="hover:underline">Sign Up</Link></li>
                        <li><Link to="/dashboard" className="hover:underline">User Dashboard</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-4 border-b pb-2">Legal</h3>
                    <ul className="space-y-3 text-regx-orange font-medium">
                        <li><Link to="/terms" className="hover:underline">Terms & Conditions</Link></li>
                        <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
                        <li><Link to="/dpdp-policy" className="hover:underline">Data Protection Policy</Link></li>
                        <li><Link to="/refund" className="hover:underline">Refund Policy</Link></li>
                    </ul>
                </div>
            </div>
        </LegalPageLayout>
    );
};

export default Sitemap;
