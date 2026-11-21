import React, { useState } from 'react';
import { Mail, MapPin, Phone, MessageSquare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Contact = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        subject: 'General Inquiry',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(() => localStorage.getItem('contactSubmitted') === 'true');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const name = `${formData.firstName} ${formData.lastName}`.trim();
            await api.post('/contact', {
                name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message
            });
            toast.success('Your message has been sent successfully!');
            setSubmitted(true);
            localStorage.setItem('contactSubmitted', 'true');
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                subject: 'General Inquiry',
                message: ''
            });
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message || 'Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    const brandName=import.meta.env.VITE_APP_NAME || 'RegX';
    const legalName = import.meta.env.VITE_COMPANY_LEGAL_NAME || 'Techco V';
    const contactEmail = import.meta.env.VITE_COMPANY_CONTACT_EMAIL || 'support@regx.in';
    const contactNumber = import.meta.env.VITE_COMPANY_CONTACT_NUMBER || '+91 98765 43210';
    const address = import.meta.env.VITE_COMPANY_ADDRESS || 'Techco V Head Office, Kasganj, Uttar Pradesh, India 207231';

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": brandName,
        "legalName": legalName,
        "url": import.meta.env.VITE_APP_URI || "https://regx.in",
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": contactNumber,
            "email": contactEmail,
            "contactType": "sales support"
        },
        "address": {
            "@type": "PostalAddress",
            "streetAddress": address
        }
    };

    return (
        <div className="min-h-screen bg-[#Fbfaf8] pt-32 pb-24">
            <Helmet>
                <title>Contact Us | RegX</title>
                <meta name="description" content="Get in touch with the RegX team for support, sales, or partnership inquiries." />
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Helmet>

            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="text-regx-orange text-[10px] font-bold tracking-widest uppercase mb-3">Get in touch</div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                        We'd love to hear from you
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Whether you have a question about features, pricing, or need a custom solution, our team is ready to answer all your questions.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-12 max-w-8xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Contact Form */}
                    <div className="lg:col-span-2 p-8 md:p-12">
                        {submitted ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900">Request Sent!</h3>
                                <p className="text-gray-500 max-w-md">
                                    Your request has been successfully sent to our team. We will review it and get back to you shortly.
                                </p>
                                <Button 
                                    variant="outline" 
                                    className="mt-4 border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                        setSubmitted(false);
                                        localStorage.removeItem('contactSubmitted');
                                    }}
                                >
                                    Submit Another Request
                                </Button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h3>
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">First Name</label>
                                            <input type="text" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-colors" placeholder="John" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Last Name</label>
                                            <input type="text" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-colors" placeholder="Doe" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email</label>
                                        <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-colors" placeholder="john@example.com" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Subject</label>
                                        <select value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-colors bg-white">
                                            <option>General Inquiry</option>
                                            <option>Sales & Demo</option>
                                            <option>Technical Support</option>
                                            <option>Partnership</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Message</label>
                                        <textarea rows="4" required minLength={5} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-colors resize-none" placeholder="How can we help you?"></textarea>
                                    </div>

                                    <Button type="submit" variant="primary" isLoading={loading} className="w-full py-4 rounded-xl text-sm shadow-lg shadow-regx-orange/20">
                                        Send Message
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>

                    {/* Contact Information */}
                    <div className="bg-[#18181b] p-8 md:p-12 text-white relative overflow-hidden flex flex-col justify-between">
                        {/* Decorative background glow */}
                        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-regx-orange/20 rounded-full blur-[80px] pointer-events-none"></div>
                        <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>

                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-8">Contact Information</h3>
                            
                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <MessageSquare className="w-5 h-5 text-regx-orange" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Chat with us</div>
                                        <p className="text-sm font-medium text-white">{contactEmail}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <MapPin className="w-5 h-5 text-regx-orange" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Visit us</div>
                                        <p className="text-sm font-medium text-white leading-relaxed">
                                            {address.split(',').map((part, i) => (
                                                <React.Fragment key={i}>
                                                    {part.trim()}
                                                    {i !== address.split(',').length - 1 && <br />}
                                                </React.Fragment>
                                            ))}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Phone className="w-5 h-5 text-regx-orange" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Call us</div>
                                        <p className="text-sm font-medium text-white">Mon-Fri from 9am to 6pm</p>
                                        <p className="text-sm font-medium text-white">{contactNumber}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
