import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../../shared/components/Button';
import Spinner from '../../shared/components/Spinner';
import Input from '../../shared/components/Input';
import toast from 'react-hot-toast';
import { CheckCircle2, Receipt, CreditCard, XCircle } from 'lucide-react';

const Subscription = () => {
    const { user } = useAuth();

    // Tab State
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'history'

    // Data States
    const [plans, setPlans] = useState([]);
    const [activeSub, setActiveSub] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Checkout States
    const [coupon, setCoupon] = useState('');
    const [couponData, setCouponData] = useState(null);
    const [verifyingCoupon, setVerifyingCoupon] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [plansRes, subRes, paymentRes] = await Promise.all([
                    api.get('/plans'),
                    api.get('/subscription'),
                    api.get('/payment/history')
                ]);

                if (plansRes.success) setPlans(plansRes.data);
                if (subRes.success) setActiveSub(subRes.data.active);
                if (paymentRes.success) setPayments(paymentRes.data);
            } catch (error) {
                console.error('Failed to load subscription data', error);
                toast.error('Failed to load some subscription details.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleApplyCoupon = async () => {
        if (!coupon || !selectedPlan) return;
        setVerifyingCoupon(true);
        try {
            const res = await api.post('/coupon/validate', {
                code: coupon,
                plan_price: selectedPlan.price
            });
            if (res.success) {
                setCouponData(res.data);
                toast.success('Coupon applied!');
            }
        } catch (error) {
            setCouponData(null);
            toast.error(error.response?.data?.message || 'Invalid coupon');
        } finally {
            setVerifyingCoupon(false);
        }
    };

    const handleSubscribe = async (plan) => {
        setSelectedPlan(plan);
        setCoupon('');
        setCouponData(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const processPayment = async () => {
        setPaying(true);
        try {
            const orderRes = await api.post('/payment/create-order', {
                plan_id: selectedPlan.id,
                coupon_code: couponData ? coupon : null
            });

            if (!orderRes.success) throw new Error('Order creation failed');
            const { order_id, amount, key_id, currency } = orderRes.data;

            const options = {
                key: key_id,
                amount: amount,
                currency: currency,
                name: "RegX",
                description: `Subscription to ${selectedPlan.name}`,
                order_id: order_id,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.post('/payment/verify', {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        if (verifyRes.success) {
                            toast.success('Payment successful!');
                            window.location.reload();
                        }
                    } catch (error) {
                        toast.error('Payment verification failed.');
                    }
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                },
                theme: { color: "#EC4D2D" }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(response.error.description);
            });
            rzp.open();

        } catch (error) {
            toast.error('Payment initialization failed');
        } finally {
            setPaying(false);
        }
    };

    if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className=" mx-auto pb-16">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 font-display">Manage Subscription</h1>
                <p className="text-sm text-gray-500 mt-1">
                    View your current plan, upgrade to unlock more features, or access your payment history.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-6 border-b border-gray-200 mb-8">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-4 px-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'details'
                            ? 'border-regx-orange text-regx-orange'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    <CreditCard className="w-4 h-4" />
                    Subscription Details
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 px-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'history'
                            ? 'border-regx-orange text-regx-orange'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    <Receipt className="w-4 h-4" />
                    Payment History
                </button>
            </div>

            {/* Tab 1: Subscription Details */}
            {activeTab === 'details' && (
                <div className="space-y-12 animate-in fade-in duration-300">

                    {/* Active Subscription Banner */}
                    {activeSub ? (
                        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-700">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-regx-orange opacity-20 blur-3xl mix-blend-screen pointer-events-none"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold tracking-wide uppercase mb-4 border border-green-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        Active Plan
                                    </div>
                                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                                        {activeSub.plan_name}
                                    </h2>
                                    <p className="text-gray-400">
                                        Your subscription automatically renews on <span className="text-white font-medium">{new Date(activeSub.end_date).toLocaleDateString()}</span>.
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <button
                                        onClick={() => toast('Cancellation is not fully implemented yet')}
                                        className="px-6 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all font-medium text-sm shadow-sm"
                                    >
                                        Cancel Subscription
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-orange-900 mb-1">No Active Subscription</h3>
                                <p className="text-orange-700 text-sm">Select a plan below to start using premium features.</p>
                            </div>
                        </div>
                    )}

                    {/* Plans Grid or Checkout */}
                    {!selectedPlan ? (
                        <div>
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
                                <p className="text-gray-500 mt-2">Choose the perfect plan for your registration needs.</p>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {plans.map(plan => {
                                    const isCurrent = activeSub?.plan_id == plan.id;
                                    return (
                                        <div
                                            key={plan.id}
                                            className={`relative flex flex-col bg-white rounded-3xl p-8 transition-all duration-300 ${isCurrent
                                                    ? 'ring-2 ring-regx-orange shadow-xl scale-[1.02]'
                                                    : 'border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1'
                                                }`}
                                        >
                                            {isCurrent && (
                                                <div className="absolute top-0 right-6 -mt-3 px-3 py-1 bg-gradient-to-r from-regx-orange to-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                                                    Current Plan
                                                </div>
                                            )}

                                            <div className="mb-6">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                                                    <span className="text-gray-500 font-medium">/{plan.billing_period}</span>
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <ul className="space-y-4 mb-8">
                                                    {plan.features && plan.features.map((feature, i) => (
                                                        <li key={i} className="flex items-start text-sm text-gray-600">
                                                            <CheckCircle2 className="w-5 h-5 text-regx-orange shrink-0 mr-3 mt-0.5 opacity-80" />
                                                            <span className="leading-tight">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <Button
                                                variant={isCurrent ? 'light' : 'primary'}
                                                className="w-full h-12 text-base font-semibold"
                                                disabled={isCurrent}
                                                onClick={() => handleSubscribe(plan)}
                                            >
                                                {isCurrent ? 'Current Plan' : 'Select Plan'}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-gray-50 px-8 py-6 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900">Checkout</h3>
                                <button
                                    onClick={() => setSelectedPlan(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                                    title="Cancel checkout"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-medium text-gray-900">{selectedPlan.name} Plan</span>
                                    <span className="font-semibold">₹{selectedPlan.price}</span>
                                </div>

                                {couponData && (
                                    <div className="flex justify-between items-center text-green-600 bg-green-50 p-4 rounded-xl border border-green-100">
                                        <div className="flex flex-col">
                                            <span className="font-medium">Discount applied</span>
                                            <span className="text-sm opacity-80">Code: {coupon}</span>
                                        </div>
                                        <span className="font-bold">-₹{couponData.discount}</span>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-2xl font-extrabold text-gray-900">
                                    <span>Total</span>
                                    <span>₹{couponData ? couponData.final_amount : selectedPlan.price}</span>
                                </div>

                                {!couponData && (
                                    <div className="flex gap-3 pt-6">
                                        <Input
                                            placeholder="Have a coupon code?"
                                            value={coupon}
                                            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                                            className="flex-1 bg-gray-50"
                                        />
                                        <Button variant="outline" onClick={handleApplyCoupon} isLoading={verifyingCoupon}>
                                            Apply
                                        </Button>
                                    </div>
                                )}

                                <Button
                                    className="w-full h-14 mt-6 text-lg font-bold shadow-lg shadow-regx-orange/30 transition-all hover:-translate-y-0.5"
                                    onClick={processPayment}
                                    isLoading={paying}
                                >
                                    Pay Securely
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Payment History */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900">Subscription Invoices</h2>
                        <p className="text-sm text-gray-500 mt-1">Review your past subscription charges and payment status.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold">Plan</th>
                                    <th className="px-6 py-4 font-semibold">Amount</th>
                                    <th className="px-6 py-4 font-semibold">Order ID</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {payments.length > 0 ? (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                                                {new Date(payment.created_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                                                {payment.plan_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">
                                                ₹{payment.amount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                                                {payment.razorpay_order_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold ${payment.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        payment.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center">
                                            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                            <p className="font-semibold text-gray-900">No payment history</p>
                                            <p className="text-sm text-gray-500 mt-1">You haven't made any subscription payments yet.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subscription;
