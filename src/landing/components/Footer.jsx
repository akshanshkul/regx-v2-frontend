import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-[#18181b] pt-16 pb-8 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
                    {/* Logo & Info */}
                    <div className="col-span-2 lg:col-span-1">
                        <Link to="/" className="inline-block text-xl font-bold font-display tracking-tight text-white mb-4">
                            Reg<span className="text-regx-orange">X</span>
                        </Link>
                        <p className="text-gray-400 text-xs leading-relaxed max-w-[250px]">
                            Sports event management technology for federations, leagues and organizers.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-white text-[9px] font-bold tracking-[0.2em] uppercase mb-6">Platform</h4>
                        <ul className="space-y-4 text-xs font-medium text-gray-400">
                            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="#workflow" className="hover:text-white transition-colors">How it works</a></li>
                            <li><a href="#organizations" className="hover:text-white transition-colors">Organizations</a></li>
                            <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link to="/sitemap" className="hover:text-white transition-colors">Sitemap</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white text-[9px] font-bold tracking-[0.2em] uppercase mb-6">Account</h4>
                        <ul className="space-y-4 text-xs font-medium text-gray-400">
                            <li><Link to="/login" className="hover:text-white transition-colors">Log in</Link></li>
                            <li><Link to="/signup" className="hover:text-white transition-colors">Sign up</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white text-[9px] font-bold tracking-[0.2em] uppercase mb-6">Company</h4>
                        <ul className="space-y-4 text-xs font-medium text-gray-400">
                            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                            <li><a href="https://techcov.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Techco V</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white text-[9px] font-bold tracking-[0.2em] uppercase mb-6">Legal</h4>
                        <ul className="space-y-4 text-xs font-medium text-gray-400">
                            <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/dpdp-policy" className="hover:text-white transition-colors">Data Protection Policy</Link></li>
                            <li><Link to="/refund" className="hover:text-white transition-colors">Refund Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] text-gray-500">
                        © 2026 RegX. All rights reserved.
                    </p>
                    <p className="text-[10px] text-gray-500">
                        Crafted by Techco V, a unit of Thread Services LLP.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
