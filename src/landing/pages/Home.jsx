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
import MediaShowcase from '../components/MediaShowcase';
import ProductFeatureShowcase from '../components/ProductFeatureShowcase';
import FAQs from '../components/FAQs';
import PlatformCapabilities from '../components/PlatformCapabilities';
import { FAQ_ITEMS } from '../components/faqItems';
import { ShieldCheck, Trophy, Landmark, GraduationCap, Medal } from 'lucide-react';

const siteUrl = 'https://regx.techcov.in/';
const pageTitle = "RegX | India's First Arm Wrestling Fixture Application";
const pageDescription = 'RegX is India’s first fixture application for arm wrestling and other sports. Manage athlete registration, competition categories, tournament draws, live results and reports in one platform.';
const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'RegX',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: pageDescription,
        featureList: [
            'Online sports event registration',
            'Athlete categories and entry management',
            'Tournament fixtures and draws',
            'Live event results and reports',
        ],
    },
    {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: answer,
            },
        })),
    },
];

const Home = () => {
    return (
        <div>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta name="keywords" content="arm wrestling fixtures India, arm wrestling tournament software, sports event management India, tournament registration, sports fixtures, RegX" />
                <meta name="robots" content="index, follow, max-image-preview:large" />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="RegX" />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:url" content={siteUrl} />
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={pageDescription} />
                <link rel="canonical" href={siteUrl} />
                {structuredData.map((data) => (
                    <script key={data['@type']} type="application/ld+json">
                        {JSON.stringify(data)}
                    </script>
                ))}
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
            <ProductFeatureShowcase />
            <Workflow />
            <MediaShowcase />
            <PlatformCapabilities />
            <CustomDashboard />
            <BetterWay />
            <Impact />
            <Testimonials />
            <FAQs />
            <CTA />
        </div>
    );
};

export default Home;
