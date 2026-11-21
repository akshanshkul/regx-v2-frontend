import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import Button from '../../shared/components/Button';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-4 sm:top-6 inset-x-0 z-50 px-4 flex justify-center">
            <nav className="relative w-full max-w-8xl bg-white/95 backdrop-blur-md rounded-[22px] px-3 sm:px-6 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 min-h-[64px]">
                <Link to="/" className="flex items-center text-xl font-bold font-display tracking-tight">
                    Reg<span className="text-regx-orange">X</span>
                </Link>

                <div className="hidden md:flex items-center gap-8 font-medium text-[13px] text-gray-500">
                    <a href="#platform" className="hover:text-gray-900 transition-colors">Platform</a>
                    <a href="#workflow" className="hover:text-gray-900 transition-colors">How it works</a>
                    <a href="#organizations" className="hover:text-gray-900 transition-colors">Organizations</a>
                    <Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
                    <Link to="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
                </div>

                <div className="flex items-center gap-2">
                    <Link to="/login" className="hidden sm:block text-[13px] font-semibold text-gray-700 hover:text-gray-900 transition-colors px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50">Log in</Link>
                    <Link to="/signup">
                        <Button variant="primary" className="rounded-full shadow-lg shadow-regx-orange/30 gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 text-[12px] sm:text-[13px] whitespace-nowrap">
                            Get started <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                    </Link>
                    <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex flex-col gap-4 md:hidden">
                        <div className="flex flex-col gap-3 font-medium text-sm text-gray-600">
                            <a href="#platform" onClick={() => setIsMenuOpen(false)} className="hover:text-regx-orange p-2 rounded-lg hover:bg-gray-50">Platform</a>
                            <a href="#workflow" onClick={() => setIsMenuOpen(false)} className="hover:text-regx-orange p-2 rounded-lg hover:bg-gray-50">How it works</a>
                            <a href="#organizations" onClick={() => setIsMenuOpen(false)} className="hover:text-regx-orange p-2 rounded-lg hover:bg-gray-50">Organizations</a>
                            <Link to="/pricing" onClick={() => setIsMenuOpen(false)} className="hover:text-regx-orange p-2 rounded-lg hover:bg-gray-50">Pricing</Link>
                            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="hover:text-regx-orange p-2 rounded-lg hover:bg-gray-50">Contact</Link>
                            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="hover:text-regx-orange p-2 rounded-lg hover:bg-gray-50 border-t border-gray-100 mt-2 pt-4">Log in</Link>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Navbar;
