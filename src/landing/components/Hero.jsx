import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Check, Menu, Search, Bell, LayoutDashboard, Calendar, ClipboardList, GitMerge, Users, CreditCard, BarChart2, MapPin, Trophy } from 'lucide-react';
import Button from '../../shared/components/Button';

const Hero = () => {
    return (
        <section className="relative overflow-hidden pt-20 md:pt-28 pb-16 md:pb-20">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #00000008 1px, transparent 1px), linear-gradient(to bottom, #00000008 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-regx-orange/15 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="max-w-6xl mx-auto px-4 relative">
                <div className="grid lg:grid-cols-[.88fr_1.12fr] gap-12 lg:gap-16 items-center">
                    
                    <div className="hero-copy z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 mb-6 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-regx-orange animate-pulse"></span>
                            <span className="bg-red-100 text-red-600 px-1.5 rounded uppercase text-[10px] tracking-wider">New</span>
                            Sports event management, reimagined
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                        </div>

                        <h1 className="font-display text-5xl sm:text-6xl lg:text-[68px] xl:text-[76px] leading-[.96] tracking-tight font-bold text-regx-dark">
                            Sports event<br />
                            <span className="text-regx-orange">management, simplified.</span>
                        </h1>

                        <p className="mt-6 text-base md:text-lg text-regx-muted leading-relaxed max-w-xl">
                            RegX helps arm wrestling federations, tournament organizers and other sports communities
                            manage athlete registration, competition categories, fixtures, payments and live results
                            in one connected platform.
                        </p>

                        <div className="flex flex-wrap gap-3 mt-8">
                            <Link to="/signup">
                                <Button size="lg" className="gap-2 shadow-lg shadow-regx-orange/30">
                                    Get started free <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                            <a href="#platform">
                                <Button variant="light" size="lg" className="gap-2">
                                    <Play className="w-4 h-4" fill="currentColor" /> Explore platform
                                </Button>
                            </a>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-xs font-medium text-gray-500">
                            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-regx-orange" /> No complicated setup</span>
                            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-regx-orange" /> Built for organizers</span>
                            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-regx-orange" /> Live event control</span>
                        </div>
                    </div>

                    <div className="relative z-10 hidden lg:block">
                        <div className="absolute -top-10 right-10 text-regx-orange font-medium text-sm rotate-12 bg-white px-3 py-1 rounded shadow-sm border border-regx-orange/20 z-20">
                            A smarter way<br/>to run sports ↘
                        </div>
                        
                        <div 
                            className="bg-white rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-200 overflow-hidden transition-transform duration-500 hover:rotate-0"
                            style={{ transform: 'perspective(1200px) rotateY(-4.5deg) rotateX(1.5deg)' }}
                        >
                            {/* Dashboard Top */}
                            <div className="flex items-center justify-between p-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Menu className="w-4 h-4 text-gray-500" />
                                    <span className="font-bold font-display text-sm tracking-tight text-gray-700">Reg<span className="text-regx-orange">X</span></span>
                                </div>
                                <div className="hidden sm:flex items-center bg-gray-50 rounded-md px-3 py-1.5 text-xs text-gray-400 border border-gray-100 w-[55%]">
                                    <Search className="w-3 h-3 mr-2 text-gray-400" />
                                    Search events, players, matches...
                                </div>
                                <div className="flex items-center gap-3">
                                    <Bell className="w-4 h-4 text-gray-400" />
                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-regx-orange flex items-center justify-center text-[10px] font-bold">AS</div>
                                </div>
                            </div>

                            {/* Dashboard Content */}
                            <div className="flex h-[380px]">
                                {/* Sidebar */}
                                <aside className="w-[120px] border-r border-gray-100 p-2 hidden sm:flex flex-col gap-1 shrink-0">
                                    {[
                                        { icon: LayoutDashboard, label: 'Dashboard', active: true },
                                        { icon: Calendar, label: 'Events' },
                                        { icon: ClipboardList, label: 'Registrations' },
                                        { icon: GitMerge, label: 'Matches' },
                                        { icon: Users, label: 'Players' },
                                        { icon: CreditCard, label: 'Payments' },
                                        { icon: BarChart2, label: 'Reports' },
                                    ].map((item, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] ${item.active ? 'bg-orange-50 text-regx-orange font-medium' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-default'}`}>
                                            <item.icon className="w-3.5 h-3.5 shrink-0" />
                                            {item.label}
                                        </div>
                                    ))}
                                </aside>

                                {/* Main */}
                                <div className="flex-1 p-4 bg-gray-50/80 overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <div className="text-[9px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Event Control Center</div>
                                            <h3 className="text-base font-bold text-gray-800 leading-tight">National Championship</h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-2 py-1 rounded-full text-[9px] font-bold tracking-wider border border-green-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> LIVE
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {[
                                            { label: 'Registrations', val: '1,284', up: '12%' },
                                            { label: 'Matches', val: '342', up: '8%' },
                                            { label: 'Payments', val: '₹8.4L', up: '18%' },
                                            { label: 'Completion', val: '76%', up: '6%' },
                                        ].map((m, i) => (
                                            <div key={i} className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                                <div className="text-[9px] text-gray-400 mb-1 leading-none">{m.label}</div>
                                                <div className="font-bold text-sm text-gray-700 leading-none mb-1">{m.val}</div>
                                                <div className="text-[8px] text-green-500 font-medium leading-none">↑ {m.up}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-[1.3fr_0.7fr] gap-3">
                                        {/* Live Matches */}
                                        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-gray-700">Live Matches</span>
                                                <span className="text-[9px] text-gray-400 hover:text-gray-600 cursor-default">View all</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                {[
                                                    { t1: 'KF', n1: 'Kochi Falcons', s1: '2', t2: 'RR', n2: 'Rohtak Rowdies', s2: '1' },
                                                    { t1: 'DP', n1: 'Delhi Panthers', s1: '3', t2: 'MP', n2: 'Mumbai Pro', s2: '0' },
                                                    { t1: 'CB', n1: 'Chennai Bulls', s1: '1', t2: 'HK', n2: 'Hyderabad Hawks', s2: '1' },
                                                ].map((match, i) => (
                                                    <div key={i} className="flex items-center justify-between text-[10px]">
                                                        <div className="flex items-center gap-1.5 w-[42%]">
                                                            <div className="w-[18px] h-[18px] rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-[7px] text-gray-600 shrink-0">{match.t1}</div>
                                                            <span className="truncate text-gray-700">{match.n1}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded text-[11px]">
                                                            <span>{match.s1}</span>
                                                            <span className="text-[8px] text-gray-400 font-normal">vs</span>
                                                            <span>{match.s2}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 justify-end w-[42%] text-right">
                                                            <span className="truncate text-gray-700">{match.n2}</span>
                                                            <div className="w-[18px] h-[18px] rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-[7px] text-gray-600 shrink-0">{match.t2}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Tournament Progress */}
                                        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col items-center justify-center">
                                            <div className="text-xs font-bold text-gray-700 w-full mb-3 text-left">Tournament progress</div>
                                            
                                            {/* Fake Donut Chart */}
                                            <div className="relative w-[72px] h-[72px] rounded-full border-[5px] border-gray-100 mb-4 flex items-center justify-center shrink-0">
                                                <div className="absolute inset-0 rounded-full border-[5px] border-regx-orange border-r-transparent border-t-transparent rotate-45"></div>
                                                <div className="absolute inset-0 rounded-full border-[5px] border-green-500 border-l-transparent border-b-transparent -rotate-12"></div>
                                                <span className="text-sm font-bold text-gray-700">76%</span>
                                            </div>

                                            <div className="w-full space-y-1.5">
                                                <div className="flex justify-between items-center text-[9px]">
                                                    <div className="flex items-center gap-1.5 text-gray-500"><div className="w-1.5 h-1.5 rounded-full bg-regx-orange"></div> Completed</div>
                                                    <span className="font-bold text-gray-600">38</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px]">
                                                    <div className="flex items-center gap-1.5 text-gray-500"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> In progress</div>
                                                    <span className="font-bold text-gray-600">12</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px]">
                                                    <div className="flex items-center gap-1.5 text-gray-500"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Upcoming</div>
                                                    <span className="font-bold text-gray-600">10</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom stats */}
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        <div className="bg-orange-50 border border-orange-100/50 rounded p-1.5 flex items-center gap-1.5 justify-center text-[9px] text-orange-700 font-medium">
                                            <Users className="w-3 h-3 text-orange-400" /> 1,284 athletes
                                        </div>
                                        <div className="bg-orange-50 border border-orange-100/50 rounded p-1.5 flex items-center gap-1.5 justify-center text-[9px] text-orange-700 font-medium">
                                            <MapPin className="w-3 h-3 text-orange-400" /> 12 venues
                                        </div>
                                        <div className="bg-orange-50 border border-orange-100/50 rounded p-1.5 flex items-center gap-1.5 justify-center text-[9px] text-orange-700 font-medium">
                                            <Trophy className="w-3 h-3 text-orange-400" /> 28 categories
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
