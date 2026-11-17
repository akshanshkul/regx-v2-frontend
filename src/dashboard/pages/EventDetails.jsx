import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Calendar, 
    MapPin, 
    Edit, 
    Share2, 
    Users, 
    Eye,
    ChevronRight,
    Image as ImageIcon,
    Navigation,
    Info,
    Clock,
    Building2,
    Mail,
    Phone,
    LifeBuoy,
    MessageCircle,
    FileText
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchEvent,
    selectEventById,
    selectEventDetailStatus,
} from '../../store/slices/eventsSlice';
import EventDetailsSkeleton from '../components/EventDetailsSkeleton';
import EventLocationMap from '../components/EventLocationMap';
import EventForms from '../components/EventForms';
import { parseLatLng } from '../../shared/utils/mapLink';
import { encodeId } from '../../shared/utils/ids';
import { useRouteIds } from '../../shared/utils/ids';

// Mock data removed in favor of API

const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
        case 'live': return 'bg-green-50 text-green-600';
        case 'upcoming': return 'bg-blue-50 text-blue-600';
        case 'draft': return 'bg-gray-100 text-gray-600';
        default: return 'bg-gray-50 text-gray-600';
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * One label/value line. Renders an explicit placeholder rather than vanishing,
 * so an empty field reads as "not set" instead of looking like a bug.
 */
const DetailRow = ({ label, value, mono = false, children }) => (
    <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:pt-0.5">{label}</dt>
        <dd className={`sm:col-span-2 text-sm ${value ? 'text-gray-900' : 'text-gray-400 italic'} ${mono ? 'font-mono text-xs' : ''} break-words`}>
            {children ?? value ?? 'Not set'}
        </dd>
    </div>
);

const EventDetails = () => {
    const { id } = useRouteIds();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    const dispatch = useDispatch();

    // Served straight from the cache when arriving from the events list, so the
    // page paints immediately and only revalidates in the background.
    const event = useSelector(selectEventById(id));
    const detailStatus = useSelector(selectEventDetailStatus);

    // Only show the skeleton when there is nothing cached to show.
    const isLoading = !event && detailStatus !== 'failed';

    React.useEffect(() => {
        dispatch(fetchEvent(id));
    }, [dispatch, id]);

    // Coordinates for the read-only map, when the saved link carries them.
    const coords = parseLatLng(event?.map_link);

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'forms', label: 'Forms' },
        { id: 'settings', label: 'Settings' }
    ];



    if (isLoading) {
        return <EventDetailsSkeleton />;
    }

    if (!event) {
        return <div className="p-8 text-center text-gray-500">Event not found.</div>;
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Breadcrumb / Back Button */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <button 
                    onClick={() => navigate('/dashboard/my-events')}
                    className="hover:text-regx-orange transition-colors flex items-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Events
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="text-gray-900 font-medium truncate max-w-[200px]">{event.name}</span>
            </div>

            {/* Header Section with Poster and Logo */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Event Poster Banner (16:9 aspect ratio container logic) */}
                <div className="w-full aspect-[4/1] md:aspect-[5/1] lg:aspect-[6/1] bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    <ImageIcon className="w-10 h-10 text-gray-300 absolute" />
                    {event.banner_url ? (
                        <img src={event.banner_url} alt="Event Banner" className="w-full h-full object-cover" />
                    ) : (
                        <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&h=400&fit=crop" alt="Event Banner Default" className="w-full h-full object-cover opacity-60" />
                    )}
                </div>
                
                <div className="p-6 pt-0 relative flex flex-col md:flex-row md:items-start justify-between gap-6">
                    {/* Event Logo */}
                    <div className="flex flex-col md:flex-row gap-5">
                        <div className="w-24 h-24 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center -mt-12 relative z-10 overflow-hidden shrink-0">
                            {event.logo_url ? (
                                <img src={event.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${event.name}`} alt="Logo" className="w-full h-full object-cover p-2" />
                            )}
                        </div>
                        
                        <div className="mt-3">
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-gray-900 font-display">{event.name}</h1>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(event.status)}`}>
                                    {event.status}
                                </span>
                            </div>
                            
                            {event.short_description && (
                                <p className="text-gray-600 font-medium mb-3">{event.short_description}</p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <div className="px-2.5 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-700 border border-gray-200">
                                    {event.type} {event.subtype ? `• ${event.subtype}` : ''}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(event.date)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />
                                    {event.venue}, {event.state}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="px-6 pb-6 flex items-center gap-3 border-t border-gray-100 pt-4">
                    <div className="hidden md:flex gap-3 ml-auto">
                        <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm flex items-center gap-2 border border-white/20">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                        <button 
                            onClick={() => navigate(`/events/${encodeId(event.id)}/edit`)}
                            className="bg-regx-orange hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" /> Edit Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6 overflow-x-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id 
                                    ? 'border-regx-orange text-regx-orange' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="py-2">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Details */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* About Event */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <Info className="w-5 h-5 text-gray-400" />
                                    About this Event
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                    {event.description || 'No detailed description provided.'}
                                </p>
                            </div>

                            {/* Full event information */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    Event information
                                </h3>

                                <dl className="divide-y divide-gray-100">
                                    <DetailRow label="Event name" value={event.name} />
                                    {/* <DetailRow label="Event ID" value={String(event.id)} mono /> */}
                                    <DetailRow label="Type" value={event.type} />
                                    <DetailRow label="Subtype" value={event.subtype} />
                                    <DetailRow label="Status">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(event.status)}`}>
                                            {event.status}
                                        </span>
                                    </DetailRow>
                                    <DetailRow label="Date" value={formatDate(event.date)} />
                                    <DetailRow label="Tagline" value={event.short_description} />
                                    <DetailRow label="Venue" value={event.venue} />
                                    <DetailRow label="Address" value={event.address} />
                                    <DetailRow label="State" value={event.state} />
                                    <DetailRow label="PIN code" value={event.pincode} mono />
                                    {/* <DetailRow label="Coordinates" value={coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : null} mono /> */}
                                    {/* <DetailRow label="Map link">
                                        {event.map_link ? (
                                            <a
                                                href={event.map_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-regx-orange hover:underline break-all"
                                            >
                                                {event.map_link}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 italic">Not set</span>
                                        )}
                                    </DetailRow> */}
                                    <DetailRow label="Organiser" value={event.organizer_name} />
                                    <DetailRow label="Organiser email" value={event.organizer_email} />
                                    <DetailRow label="Organiser phone" value={event.organizer_phone} />
                                    <DetailRow label="Organisation" value={event.organization_name} />
                                    <DetailRow label="Involvement" value={event.organization_relation_label} />
                                    <DetailRow label="Support email" value={event.support_email} />
                                    <DetailRow label="Support phone" value={event.support_phone} />
                                    <DetailRow label="Support WhatsApp" value={event.support_whatsapp} />
                                    <DetailRow label="Logo">
                                        {event.logo_url ? (
                                            <span className="inline-flex items-center gap-2">
                                                <img src={event.logo_url} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
                                                <span className="text-gray-500 text-xs">Uploaded</span>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">Not uploaded</span>
                                        )}
                                    </DetailRow>
                                    <DetailRow label="Banner">
                                        {event.banner_url ? (
                                            <span className="inline-flex items-center gap-2">
                                                <img src={event.banner_url} alt="" className="w-16 h-8 rounded object-cover border border-gray-200" />
                                                <span className="text-gray-500 text-xs">Uploaded</span>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">Not uploaded</span>
                                        )}
                                    </DetailRow>
                                    {/* <DetailRow label="Created" value={formatDateTime(event.created_at)} />
                                    <DetailRow label="Last updated" value={formatDateTime(event.updated_at)} /> */}
                                </dl>
                            </div>

                        </div>

                        {/* Sidebar Details */}
                        <div className="space-y-6">
                            {/* Page Views */}
                            <div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-gray-50 text-gray-400 rounded-xl">
                                        <Eye className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Page Views</p>
                                        <h3 className="text-2xl font-bold text-gray-300">—</h3>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mt-2">
                                    Page views are not being tracked yet.
                                </p>
                            </div>

                            {/* Venue Card */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                    Venue & Location
                                </h3>
                                
                                <div>
                                    <p className="font-bold text-gray-900 text-sm mb-1">{event.venue}</p>
                                    <p className="text-gray-500 text-sm">{event.address}</p>
                                    <p className="text-gray-500 text-sm">{event.state} - {event.pincode}</p>
                                </div>

                                {coords && <EventLocationMap position={coords} />}

                                {event.map_link && (
                                    <a 
                                        href={event.map_link} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-regx-orange text-sm font-medium hover:underline mt-2"
                                    >
                                        <Navigation className="w-4 h-4" />
                                        View on Google Maps
                                    </a>
                                )}
                            </div>

                            {/* Organiser */}
                            {(event.organizer_name || event.organizer_email || event.organizer_phone || event.organization_name) && (
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Users className="w-5 h-5 text-gray-400" />
                                        Organiser
                                    </h3>

                                    {event.organizer_name && (
                                        <p className="font-bold text-gray-900 text-sm">{event.organizer_name}</p>
                                    )}

                                    <div className="space-y-2">
                                        {event.organizer_email && (
                                            <a
                                                href={`mailto:${event.organizer_email}`}
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-regx-orange transition-colors break-all"
                                            >
                                                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                                                {event.organizer_email}
                                            </a>
                                        )}

                                        {event.organizer_phone && (
                                            <a
                                                href={`tel:${event.organizer_phone}`}
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-regx-orange transition-colors"
                                            >
                                                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                                {event.organizer_phone}
                                            </a>
                                        )}
                                    </div>

                                    {event.organization_name && (
                                        <div className="pt-3 border-t border-gray-100">
                                            {event.organization_relation_label && (
                                                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                                                    {event.organization_relation_label}
                                                </p>
                                            )}
                                            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                                {event.organization_name}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Support */}
                            {(event.support_email || event.support_phone || event.support_whatsapp) && (
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <LifeBuoy className="w-5 h-5 text-gray-400" />
                                        Attendee support
                                    </h3>

                                    <div className="space-y-2">
                                        {event.support_email && (
                                            <a
                                                href={`mailto:${event.support_email}`}
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-regx-orange transition-colors break-all"
                                            >
                                                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                                                {event.support_email}
                                            </a>
                                        )}

                                        {event.support_phone && (
                                            <a
                                                href={`tel:${event.support_phone}`}
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-regx-orange transition-colors"
                                            >
                                                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                                {event.support_phone}
                                            </a>
                                        )}

                                        {event.support_whatsapp && (
                                            <a
                                                href={`https://wa.me/${event.support_whatsapp.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-regx-orange transition-colors"
                                            >
                                                <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
                                                {event.support_whatsapp}
                                                <span className="text-[11px] text-gray-400">WhatsApp</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* System Info */}
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-2">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    System Info
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created At</p>
                                        <p className="text-sm font-semibold text-gray-900">{formatDateTime(event.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</p>
                                        <p className="text-sm font-semibold text-gray-900">{formatDateTime(event.updated_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'forms' && <EventForms eventId={id} />}

                {activeTab !== 'overview' && activeTab !== 'forms' && (
                    <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            {activeTab === 'forms' && <Users className="w-8 h-8" />}
                            {activeTab === 'settings' && <Edit className="w-8 h-8" />}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 capitalize">{activeTab}</h3>
                        <p className="text-gray-500 text-sm mt-1 max-w-sm">
                            This section is under construction. It will contain all the necessary tools to manage your event's {activeTab}.
                        </p>
                    </div>
                )}
            </div>


        </div>
    );
};

export default EventDetails;
