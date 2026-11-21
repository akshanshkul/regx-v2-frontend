import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import Button from '../../shared/components/Button';

const features = [
    {
        id: 'registration',
        kicker: 'Athlete registration',
        title: 'Collect sports registrations online',
        description: 'Create event registration forms that work on phones and desktops. Collect athlete details, let participants choose eligible categories, and review every entry from one organizer dashboard.',
        points: ['Online entry forms', 'Athlete and category details', 'Centralized registration lists'],
    },
    {
        id: 'fixtures',
        kicker: 'Arm wrestling fixtures',
        title: 'Organize categories, draws and tournament fixtures',
        description: 'Prepare arm wrestling competitions with category-based athlete entries and fixture tools. Keep draws and match progress organized for officials throughout the event.',
        points: ['Age, weight, gender and hand categories', 'Category-based draws', 'Fixture progress at the venue'],
    },
    {
        id: 'results',
        kicker: 'Live event operations',
        title: 'Keep match results and event reporting connected',
        description: 'Record match outcomes as competitions progress, share published fixture information with participants, and use event reports to review registrations and results after the tournament.',
        points: ['Match outcome tracking', 'Shareable event information', 'Post-event reports'],
    },
];

const ProductFeatureShowcase = () => {
    const [videos, setVideos] = useState({});
    const [loading, setLoading] = useState(true);
    const [videoError, setVideoError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;

        api.get('/landing/videos')
            .then((response) => {
                if (!response?.success || !Array.isArray(response.data?.videos)) {
                    throw new Error(response?.message || 'Could not load product videos.');
                }

                if (active) {
                    setVideos(Object.fromEntries(response.data.videos.map((video) => [video.id, video.url])));
                }
            })
            .catch((error) => {
                if (active) {
                    setVideoError(
                        error.response?.data?.messages?.error
                        || error.response?.data?.message
                        || error.message
                        || 'Product videos are temporarily unavailable.'
                    );
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [retry]);

    const retryVideos = () => {
        setVideos({});
        setVideoError('');
        setLoading(true);
        setRetry((value) => value + 1);
    };

    return (
        <div>
            {features.map((feature, index) => (
                <section
                    key={feature.id}
                    id={`regx-${feature.id}`}
                    className={`${index % 2 === 0 ? 'bg-[#Fbfaf8]' : 'bg-white'} py-16 md:py-24`}
                >
                    <div className={`mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:gap-16 ${index % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-regx-orange">
                                {feature.kicker}
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                                {feature.title}
                            </h2>
                            <p className="mt-5 text-base leading-7 text-gray-600">
                                {feature.description}
                            </p>
                            <ul className="mt-6 space-y-3">
                                {feature.points.map((point) => (
                                    <li key={point} className="flex items-start gap-2 text-sm text-gray-700">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-regx-orange" />
                                        {point}
                                    </li>
                                ))}
                            </ul>
                            {index === features.length - 1 && (
                                <Link to="/signup" className="mt-7 inline-flex">
                                    <Button>
                                        Start organizing with RegX <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <figure className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 shadow-xl">
                            {videos[feature.id] ? (
                                <video
                                    className="aspect-video w-full object-contain"
                                    controls
                                    playsInline
                                    preload="none"
                                    aria-label={`${feature.kicker} product demo`}
                                >
                                    <source src={videos[feature.id]} type="video/mp4" />
                                    Your browser does not support HTML video.
                                </video>
                            ) : (
                                <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/80">
                                    <p>
                                        {loading
                                            ? 'Loading product demo…'
                                            : (videoError || 'Product demo temporarily unavailable.')}
                                    </p>
                                    {!loading && index === 0 && (
                                        <button
                                            type="button"
                                            onClick={retryVideos}
                                            className="font-semibold text-white underline underline-offset-4"
                                        >
                                            Try again
                                        </button>
                                    )}
                                </div>
                            )}
                            <figcaption className="border-t border-white/10 px-4 py-3 text-sm font-medium text-white/90">
                                RegX {feature.kicker.toLowerCase()} demo
                            </figcaption>
                        </figure>
                    </div>
                </section>
            ))}
        </div>
    );
};

export default ProductFeatureShowcase;
