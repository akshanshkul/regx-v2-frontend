import React from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Workflow from '../components/Workflow';
import BetterWay from '../components/BetterWay';
import Impact from '../components/Impact';
import CustomDashboard from '../components/CustomDashboard';
import Testimonials from '../components/Testimonials';
import CTA from '../components/CTA';
import { ShieldCheck, Trophy, Landmark, GraduationCap, Medal } from 'lucide-react';

const Home = () => {
    return (
        <div>
            <Helmet>
                <title>RegX | Modern Sports Event Management Platform</title>
                <meta name="description" content="RegX helps sports federations, leagues and organizers manage registrations, fixtures, payments and live results — all in one powerful platform." />
                <meta name="keywords" content="sports management, event registration, tournament fixtures, live scoring, RegX, league management" />
                <link rel="canonical" href="https://regx.techcov.in" />
            </Helmet>
            <Hero />
            {/* Trust Section */}
            <section className="border-y border-regx-line bg-white py-7">
                <div className="max-w-6xl mx-auto px-4">
                    <p className="text-center text-[10px] md:text-xs tracking-[0.18em] uppercase text-gray-400 mb-5 font-semibold">
                        Trusted by sports organizations across India
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 text-gray-500 text-[11px] font-bold tracking-[0.1em]">
                        <span className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> UPAWA</span>
                        <span className="flex items-center gap-2"><Trophy className="w-3.5 h-3.5" /> PRO PANJA LEAGUE</span>
                        <span className="flex items-center gap-2"><Landmark className="w-3.5 h-3.5" /> FEDERATIONS</span>
                        <span className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> COLLEGES</span>
                        <span className="flex items-center gap-2"><Medal className="w-3.5 h-3.5" /> SPORTS CLUBS</span>
                    </div>
                </div>
            </section>
            
            <Features />
            <Workflow />
            <CustomDashboard />
            <BetterWay />
            <Impact />
            <Testimonials />
            <CTA />
        </div>
    );
};

export default Home;
