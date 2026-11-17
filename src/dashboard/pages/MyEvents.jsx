import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, MoreVertical, ExternalLink, ArrowRight, X, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchEvents,
    deleteEvent,
    setEventStatus,
    selectEventsStatus,
    makeSelectFilteredEvents,
} from '../../store/slices/eventsSlice';
import EventCardsSkeleton from '../components/EventCardsSkeleton';
import { encodeId } from '../../shared/utils/ids';

const PAGE_SIZE = 9; // 3 x 3 grid

const MyEvents = () => {
    const navigate = useNavigate();
    
    const dispatch = useDispatch();

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // One memoised selector instance per mount, so filtering does not recompute
    // on unrelated store updates.
    const selectFilteredEvents = useMemo(makeSelectFilteredEvents, []);
    const filteredEvents = useSelector((state) => selectFilteredEvents(state, searchQuery));

    const status = useSelector(selectEventsStatus);
    const isLoading = status === 'loading' || status === 'idle';

    // The thunk short-circuits when the list is already cached and fresh.
    useEffect(() => {
        dispatch(fetchEvents())
            .unwrap()
            .catch((message) => toast.error(message || 'Failed to load events'));
    }, [dispatch]);

    // UI States
    const [activeMenuId, setActiveMenuId] = useState(null);
    const menuRef = useRef(null);

    // Modal States
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    
    // Loading States
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // OTP State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpInputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeColor = (type) => {
        switch((type || '').toLowerCase()) {
            case 'sports': return 'bg-orange-50 text-orange-600 border-orange-200';
            case 'summit': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'conference': return 'bg-purple-50 text-purple-600 border-purple-200';
            case 'meeting': return 'bg-teal-50 text-teal-600 border-teal-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getStatusColor = (status) => {
        switch((status || '').toLowerCase()) {
            case 'live': return 'bg-green-50 text-green-600';
            case 'upcoming': return 'bg-blue-50 text-blue-600';
            case 'draft': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    // Navigation Action
    const handleNavigateToEvent = (e, id) => {
        e.stopPropagation();
        navigate(`/events/${encodeId(id)}`);
    };

    // Row Actions
    const handleActionClick = (e, action, event) => {
        e.stopPropagation();
        setActiveMenuId(null);
        setSelectedEvent(event);
        
        if (action === 'go') {
            navigate(`/events/${encodeId(event.id)}`);
        } else if (action === 'status') {
            setNewStatus(event.status);
            setStatusModalOpen(true);
        } else if (action === 'delete') {
            setDeleteModalOpen(true);
        }
    };

    // Update Status Action
    const handleUpdateStatus = () => {
        setIsUpdatingStatus(true);
        // Local-only for now: there is no status endpoint yet, so this updates
        // the store and will not survive a reload.
        dispatch(setEventStatus({ id: selectedEvent.id, status: newStatus }));
        toast.success('Event status updated locally.');
        setIsUpdatingStatus(false);
        setStatusModalOpen(false);
    };

    // OTP Handlers
    const handleOtpChange = (index, value) => {
        if (value.length > 1) {
            // Handle paste
            const pastedData = value.slice(0, 6).split('');
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (index + i < 6) newOtp[index + i] = char;
            });
            setOtp(newOtp);
            if (index + pastedData.length < 6) {
                otpInputRefs[index + pastedData.length].current.focus();
            } else {
                otpInputRefs[5].current.focus();
            }
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value !== '' && index < 5) {
            otpInputRefs[index + 1].current.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            otpInputRefs[index - 1].current.focus();
        }
    };

    const handleVerifyAndDelete = () => {
        const otpString = otp.join('');
        if (otpString.length < 6) {
            toast.error('Please enter the 6-digit OTP.');
            return;
        }
        
        setIsDeleting(true);

        // NOTE: the OTP is still checked client-side against a fixed code.
        // There is no send/verify OTP endpoint yet.
        if (otpString !== '123456') {
            toast.error('Invalid OTP. Please try again.');
            setIsDeleting(false);
            return;
        }

        dispatch(deleteEvent(selectedEvent.id))
            .unwrap()
            .then(() => {
                toast.success('Event deleted successfully.');
                setOtpModalOpen(false);
                setOtp(['', '', '', '', '', '']);
            })
            .catch((message) => toast.error(message || 'Failed to delete event.'))
            .finally(() => setIsDeleting(false));
    };

    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));

    // A deletion or a new search can leave us past the last page.
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const paginatedEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const rangeStart = filteredEvents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredEvents.length);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-display">My Events</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and organize all your events in one place.</p>
                </div>
                <button 
                    onClick={() => navigate('/events/create')}
                    className="flex items-center gap-2 bg-regx-orange hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    Create New Event
                </button>
            </div>

            {/* Events */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search events..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-all"
                        />
                    </div>
                </div>

                {/* Card grid */}
                <div className="p-4 min-h-[300px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {isLoading && <EventCardsSkeleton count={PAGE_SIZE} />}

                        {!isLoading && paginatedEvents.map((event) => (
                            <div
                                key={event.id}
                                onClick={(e) => handleNavigateToEvent(e, event.id)}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
                            >
                                {/* Banner */}
                                <div className="w-full aspect-[16/9] bg-gray-100 relative overflow-hidden">
                                    {event.banner_url ? (
                                        <img
                                            src={event.banner_url}
                                            alt={event.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-gray-300" />
                                        </div>
                                    )}

                                    {event.logo_url && (
                                        <img
                                            src={event.logo_url}
                                            alt=""
                                            className="absolute bottom-2 left-2 w-10 h-10 rounded-lg border-2 border-white object-cover shadow-sm"
                                        />
                                    )}
                                </div>

                                <div className="p-4 flex flex-col gap-3 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-regx-orange transition-colors">
                                            {event.name}
                                        </h3>

                                        {/* Actions */}
                                        <div
                                            className="relative shrink-0"
                                            ref={activeMenuId === event.id ? menuRef : null}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === event.id ? null : event.id);
                                                }}
                                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {activeMenuId === event.id && (
                                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50">
                                                    <div className="py-1">
                                                        <button
                                                            onClick={(e) => handleActionClick(e, 'go', event)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                                                        >
                                                            <ExternalLink className="w-4 h-4 text-gray-400" />
                                                            Go
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleActionClick(e, 'status', event)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                                                        >
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 ml-1 mr-1"></span>
                                                            Change Status
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleActionClick(e, 'delete', event)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getTypeColor(event.type)}`}>
                                            {event.type}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(event.status)}`}>
                                            {event.status}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            {new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate">
                                                {[event.venue, event.state].filter(Boolean).join(', ') || 'No venue set'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-[11px] text-gray-400">
                                            Created {new Date(event.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="text-xs font-medium text-regx-orange flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            View <ArrowRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!isLoading && filteredEvents.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-sm font-semibold text-gray-900">
                                {searchQuery ? 'No events match your search' : 'No events yet'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {searchQuery
                                    ? 'Try a different name, venue or type.'
                                    : 'Create your first event to see it listed here.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && filteredEvents.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">
                            Showing <span className="font-medium text-gray-700">{rangeStart}</span>
                            <span>&ndash;</span>
                            <span className="font-medium text-gray-700">{rangeEnd}</span> of{' '}
                            <span className="font-medium text-gray-700">{filteredEvents.length}</span> events
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            >
                                Previous
                            </button>

                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                        currentPage === i + 1
                                            ? 'bg-regx-orange text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Modal */}
            {statusModalOpen && selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-lg">Change Event Status</h3>
                            <button onClick={() => setStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium">Event Name</p>
                                <p className="font-semibold text-gray-900">{selectedEvent.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium">Current Status</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(selectedEvent.status)}`}>
                                    {selectedEvent.status}
                                </span>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">New Status</label>
                                <select 
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-regx-orange focus:ring-1 focus:ring-regx-orange"
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="Live">Live</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setStatusModalOpen(false)}
                                disabled={isUpdatingStatus}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateStatus}
                                disabled={isUpdatingStatus || newStatus === selectedEvent.status}
                                className="px-4 py-2 text-sm font-medium text-white bg-regx-orange rounded-lg hover:bg-orange-600 disabled:opacity-70 disabled:cursor-not-allowed w-32 flex justify-center"
                            >
                                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-xl mb-2">Delete Event?</h3>
                            <p className="text-gray-500 text-sm mb-1">Are you sure you want to delete</p>
                            <p className="font-semibold text-gray-900 text-sm mb-4 text-balance">"{selectedEvent.name}"?</p>
                            <p className="text-red-500 text-xs font-medium bg-red-50 py-2 rounded-lg">This action cannot be undone.</p>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button 
                                onClick={() => setDeleteModalOpen(false)}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setOtpModalOpen(true);
                                    toast.success('OTP sent to your registered contact.');
                                }}
                                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OTP Modal */}
            {otpModalOpen && selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-lg">Delete Event</h3>
                            <button onClick={() => setOtpModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 text-center mb-6">
                                An OTP has been sent to your<br/>registered contact.
                            </p>
                            
                            <p className="text-xs font-medium text-gray-900 mb-2 text-center">Enter OTP</p>
                            <div className="flex justify-center gap-2 mb-6">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={otpInputRefs[index]}
                                        type="text"
                                        maxLength={6}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className="w-10 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:border-regx-orange focus:ring-1 focus:ring-regx-orange outline-none bg-gray-50"
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </div>
                            
                            <div className="text-center">
                                <button className="text-xs font-medium text-regx-orange hover:underline">
                                    Resend OTP
                                </button>
                                <p className="text-[10px] text-gray-400 mt-1">Hint: try 123456</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button 
                                onClick={() => setOtpModalOpen(false)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleVerifyAndDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center"
                            >
                                {isDeleting ? 'Deleting...' : 'Verify & Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MyEvents;
