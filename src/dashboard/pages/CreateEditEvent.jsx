import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    ArrowLeft, 
    Upload, 
    Image as ImageIcon,
    Save,
    Calendar,
    MapPin,
    Trophy,
    AlignLeft,
    Tag,
    Navigation,
    Users,
    Building2,
    Mail,
    Phone,
    LifeBuoy,
    MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchEvent,
    createEvent,
    updateEvent,
    selectEventById,
} from '../../store/slices/eventsSlice';
import {
    fetchEventTypes,
    fetchEventSubtypes,
    selectEventTypes,
    selectEventTypesStatus,
    selectSubtypesFor,
    fetchOrganizationRelations,
    selectOrganizationRelations,
} from '../../store/slices/eventTypesSlice';
import { fetchSettings, selectSettings } from '../../store/slices/settingsSlice';
import { selectUser } from '../../store/slices/authSlice';
import EventFormSkeleton from '../components/EventFormSkeleton';
import LocationPicker from '../components/LocationPicker';
import { prepareUpload, formatBytes } from '../../shared/utils/imageCompress';
import { encodeId } from '../../shared/utils/ids';
import { useRouteIds } from '../../shared/utils/ids';

// Mock data removed

const CreateEditEvent = () => {
    const { id } = useRouteIds();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isEditMode = Boolean(id); // If there's an ID, we are in Edit Mode
    
    const dispatch = useDispatch();

    const [isSaving, setIsSaving] = useState(false);

    const cachedEvent = useSelector(selectEventById(id));
    const eventTypes = useSelector(selectEventTypes);
    const typesStatus = useSelector(selectEventTypesStatus);
    const settings = useSelector(selectSettings);
    const relations = useSelector(selectOrganizationRelations);
    const currentUser = useSelector(selectUser);

    const [formData, setFormData] = useState({
        name: '',
        typeId: '',
        subtypeId: '',
        shortDescription: '',
        description: '',
        date: '',
        venue: '',
        address: '',
        state: '',
        pincode: '',
        mapLink: '',
        organizerName: '',
        organizerEmail: '',
        organizerPhone: '',
        organizationName: '',
        organizationRelation: '',
        organizationRelationCustom: '',
        supportEmail: '',
        supportPhone: '',
        supportWhatsapp: '',
        status: 'Draft'
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);

    // Cached subtypes for whichever type is currently selected.
    const eventSubtypes = useSelector(selectSubtypesFor(formData.typeId));

    // In edit mode the form is ready once the event is in the store; in create
    // mode it only waits for the type options.
    const isLoadingForm = (isEditMode && !cachedEvent) || typesStatus === 'idle' || typesStatus === 'loading';

    // Lookup data and user defaults. Both thunks no-op when already cached.
    useEffect(() => {
        dispatch(fetchEventTypes());
        dispatch(fetchOrganizationRelations());
        if (!isEditMode) dispatch(fetchSettings());
    }, [dispatch, isEditMode]);

    // Load the event being edited.
    useEffect(() => {
        if (!isEditMode || !id) return;

        dispatch(fetchEvent(id))
            .unwrap()
            .catch(() => toast.error('Failed to load event details.'));
    }, [dispatch, id, isEditMode]);

    // Mirror the cached event into the editable form.
    useEffect(() => {
        if (!isEditMode || !cachedEvent) return;

        setFormData({
            name: cachedEvent.name || '',
            typeId: cachedEvent.type_id ? String(cachedEvent.type_id) : '',
            subtypeId: cachedEvent.subtype_id ? String(cachedEvent.subtype_id) : '',
            shortDescription: cachedEvent.short_description || '',
            description: cachedEvent.description || '',
            date: cachedEvent.date || '',
            venue: cachedEvent.venue || '',
            address: cachedEvent.address || '',
            state: cachedEvent.state || '',
            pincode: cachedEvent.pincode || '',
            mapLink: cachedEvent.map_link || '',
            organizerName: cachedEvent.organizer_name || '',
            organizerEmail: cachedEvent.organizer_email || '',
            organizerPhone: cachedEvent.organizer_phone || '',
            organizationName: cachedEvent.organization_name || '',
            organizationRelation: cachedEvent.organization_relation || '',
            organizationRelationCustom: cachedEvent.organization_relation_custom || '',
            supportEmail: cachedEvent.support_email || '',
            supportPhone: cachedEvent.support_phone || '',
            supportWhatsapp: cachedEvent.support_whatsapp || '',
            status: cachedEvent.status || 'Draft'
        });

        if (cachedEvent.logo_url) setLogoPreview(cachedEvent.logo_url);
        if (cachedEvent.banner_url) setBannerPreview(cachedEvent.banner_url);
    }, [isEditMode, cachedEvent]);

    // Apply the user's configured defaults to a brand new event.
    useEffect(() => {
        if (isEditMode || eventTypes.length === 0) return;

        // The stored default is a type name; resolve it to an id, else fall
        // back to the first available type.
        const preferred =
            eventTypes.find((t) => t.name === settings?.default_event_type) ?? eventTypes[0];

        setFormData(prev => ({
            ...prev,
            ...(preferred ? { typeId: String(preferred.id) } : {}),
            ...(settings?.default_event_status ? { status: settings.default_event_status } : {}),
        }));
    }, [isEditMode, eventTypes, settings]);

    // Seed the organiser from the signed-in user, once, for a new event. Only
    // fills blanks so it never overwrites something already typed.
    useEffect(() => {
        if (isEditMode || !currentUser) return;

        setFormData(prev => ({
            ...prev,
            organizerName: prev.organizerName || currentUser.name || '',
            organizerEmail: prev.organizerEmail || currentUser.email || '',
            organizerPhone: prev.organizerPhone || currentUser.phone || '',
        }));
    }, [isEditMode, currentUser]);

    // Subtypes for the selected type; cached per type by the slice.
    useEffect(() => {
        if (formData.typeId) dispatch(fetchEventSubtypes(formData.typeId));
    }, [dispatch, formData.typeId]);

    // Auto-select a subtype for a new event once the options arrive.
    useEffect(() => {
        if (isEditMode) return;

        if (eventSubtypes.length > 0 && !formData.subtypeId) {
            setFormData(prev => ({ ...prev, subtypeId: String(eventSubtypes[0].id) }));
        } else if (eventSubtypes.length === 0 && formData.subtypeId) {
            setFormData(prev => ({ ...prev, subtypeId: '' }));
        }
    }, [isEditMode, eventSubtypes, formData.subtypeId]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    /**
     * Images are resized here before they are ever sent.
     *
     * A picture straight off a phone is commonly several megabytes — larger
     * than the server will accept in one request, and far larger than a logo
     * or banner needs to be. Shrinking it in the browser keeps the upload well
     * inside the limit and makes the stored file the one the page renders.
     */
    const handleFileChange = async (e, type) => {
        const original = e.target.files[0];
        if (!original) return;

        // Let the same file be picked again after a failure.
        e.target.value = '';

        const bounds = type === 'logo'
            ? { maxWidth: 800, maxHeight: 800 }
            : { maxWidth: 2400, maxHeight: 1400 };

        const { file, saved, error } = await prepareUpload(original, bounds);

        if (error) {
            toast.error(error);
            return;
        }

        if (saved > 100 * 1024) {
            toast.success(
                `${type === 'logo' ? 'Logo' : 'Banner'} optimised: ` +
                `${formatBytes(original.size)} to ${formatBytes(file.size)}`
            );
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'logo') {
                setLogoFile(file);
                setLogoPreview(reader.result);
            } else {
                setBannerFile(file);
                setBannerPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.typeId || !formData.date || !formData.venue) {
            toast.error('Please fill all required fields.');
            return;
        }

        if (formData.organizationRelation === 'custom' && !formData.organizationRelationCustom.trim()) {
            toast.error('Describe how the organisation is involved.');
            return;
        }

        setIsSaving(true);

        const payload = { fields: formData, logoFile, bannerFile };

        try {
            await dispatch(
                isEditMode ? updateEvent({ id, ...payload }) : createEvent(payload)
            ).unwrap();

            toast.success(`Event "${formData.name}" ${isEditMode ? 'updated' : 'created'} successfully!`);
            navigate('/dashboard/my-events');
        } catch (message) {
            toast.error(message || 'Failed to save event.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (isEditMode) {
            navigate(`/events/${encodeId(id)}`);
        } else {
            navigate('/dashboard/my-events');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleCancel}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 font-display">
                            {isEditMode ? 'Edit Event Details' : 'Create New Event'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isEditMode ? 'Update your event settings and media.' : 'Set up all the necessary details for your upcoming event.'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleCancel}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || isLoadingForm}
                        className="flex items-center gap-2 px-5 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-70"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Event')}
                    </button>
                </div>
            </div>

            {isLoadingForm ? (
                <EventFormSkeleton />
            ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Form Sections */}
                <div className="xl:col-span-2 space-y-6">
                    
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                            <Trophy className="w-5 h-5 text-gray-400" />
                            <h3 className="font-bold text-gray-900">Basic Information</h3>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Name <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Summer Armwrestling Championship"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type of Event</label>
                                <select 
                                    name="typeId"
                                    value={formData.typeId}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none bg-white"
                                >
                                    {eventTypes.length === 0 && <option value="">Loading…</option>}
                                    {eventTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Subtype
                                </label>
                                <select
                                    name="subtypeId"
                                    value={formData.subtypeId}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange transition-all bg-gray-50 text-sm appearance-none"
                                >
                                    {eventSubtypes.length === 0 && (
                                        <option value="">No subtypes available</option>
                                    )}
                                    {eventSubtypes.map((subtype) => (
                                        <option key={subtype.id} value={subtype.id}>
                                            {subtype.name}
                                            {subtype.format ? ` (${subtype.format})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Short Description (Tag/Catchphrase)</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text"
                                    name="shortDescription"
                                    value={formData.shortDescription}
                                    onChange={handleChange}
                                    placeholder="e.g., The biggest showdown of the year!"
                                    maxLength={100}
                                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-right">{formData.shortDescription?.length || 0}/100</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
                            <div className="relative">
                                <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <textarea 
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={5}
                                    placeholder="Write a comprehensive description about schedules, rules, speakers, or anything attendees should know..."
                                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Date & Location */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <h3 className="font-bold text-gray-900">Date & Location</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Date <span className="text-red-500">*</span>
                            </label>
                            <div className="relative w-full md:w-1/2">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Venue Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text"
                                    name="venue"
                                    value={formData.venue}
                                    onChange={handleChange}
                                    placeholder="e.g., Pragati Maidan Exhibition Center"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                                <input 
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Street address, block, or area"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <input 
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    placeholder="e.g., Uttar Pradesh"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                                <input 
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    placeholder="e.g., 207123"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Navigation className="w-4 h-4 text-gray-400" />
                                        Event Location
                                    </span>
                                </label>
                                <LocationPicker
                                    value={formData.mapLink}
                                    onChange={(mapLink) => setFormData((prev) => ({ ...prev, mapLink }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Organiser */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                            <Users className="w-5 h-5 text-gray-400" />
                            <h3 className="font-bold text-gray-900">Organiser</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organiser name</label>
                            <input
                                type="text"
                                name="organizerName"
                                value={formData.organizerName}
                                onChange={handleChange}
                                placeholder="Who people should contact about this event"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        name="organizerEmail"
                                        value={formData.organizerEmail}
                                        onChange={handleChange}
                                        placeholder="organiser@example.com"
                                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        name="organizerPhone"
                                        value={formData.organizerPhone}
                                        onChange={handleChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Organisation */}
                        <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-4 mt-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <h4 className="text-sm font-semibold text-gray-900">Organisation</h4>
                                <span className="text-xs text-gray-400">Optional</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Organisation name
                                    </label>
                                    <input
                                        type="text"
                                        name="organizationName"
                                        value={formData.organizationName}
                                        onChange={handleChange}
                                        placeholder="e.g., Tenext Services LLP"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        How are they involved?
                                    </label>
                                    <select
                                        name="organizationRelation"
                                        value={formData.organizationRelation}
                                        onChange={handleChange}
                                        disabled={!formData.organizationName}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="">Not specified</option>
                                        {relations.map((relation) => (
                                            <option key={relation.key} value={relation.key}>
                                                {relation.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {formData.organizationRelation === 'custom' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Custom wording <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="organizationRelationCustom"
                                            value={formData.organizationRelationCustom}
                                            onChange={handleChange}
                                            placeholder="e.g., Hosted at the campus of"
                                            maxLength={120}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {formData.organizationName && (
                                <p className="text-xs text-gray-500 mt-3">
                                    Shown on the event as:{' '}
                                    <span className="font-medium text-gray-700">
                                        {(formData.organizationRelation === 'custom'
                                            ? formData.organizationRelationCustom
                                            : relations.find((r) => r.key === formData.organizationRelation)?.label
                                        ) || '—'}{' '}
                                        {formData.organizationName}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Attendee support */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                            <LifeBuoy className="w-5 h-5 text-gray-400" />
                            <h3 className="font-bold text-gray-900">Attendee support</h3>
                        </div>

                        <p className="text-xs text-gray-500 -mt-2">
                            Shown publicly so people registering know where to get help. Leave blank to fall
                            back to the organiser contact above.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        name="supportEmail"
                                        value={formData.supportEmail}
                                        onChange={handleChange}
                                        placeholder="support@example.com"
                                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Support number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        name="supportPhone"
                                        value={formData.supportPhone}
                                        onChange={handleChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    WhatsApp <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <div className="relative">
                                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        name="supportWhatsapp"
                                        value={formData.supportWhatsapp}
                                        onChange={handleChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Content (Media & Publish) */}
                <div className="space-y-6">
                    {/* Event Status */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Publish Status</h3>
                        <select 
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none bg-white"
                        >
                            <option value="Draft">Save as Draft</option>
                            <option value="Upcoming">Publish as Upcoming</option>
                            <option value="Live">Publish as Live Now</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Draft events are hidden from the public registration portal.
                        </p>
                    </div>

                    {/* Media Uploads */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                        <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Event Media</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Event Logo</label>
                            <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                                {(logoPreview || isEditMode) ? (
                                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 overflow-hidden border border-gray-200 group-hover:scale-105 transition-transform">
                                        <img src={logoPreview || `https://api.dicebear.com/7.x/shapes/svg?seed=${formData.name}`} alt="Logo" className="w-full h-full object-cover p-1" />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                                        <ImageIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                )}
                                <p className="text-xs font-medium text-regx-orange">
                                    {(logoPreview || isEditMode) ? 'Click to replace logo' : 'Click to upload logo'}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-1">PNG, JPG (1:1 Ratio)</p>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Poster / Banner</label>
                            <label className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group overflow-hidden aspect-video relative">
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                                {(bannerPreview || isEditMode) && (
                                    <img src={bannerPreview || `https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&h=400&fit=crop`} alt="Event Banner" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                                )}
                                <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 ${(bannerPreview || isEditMode) ? 'bg-black/20 group-hover:bg-black/40 transition-colors' : ''}`}>
                                    <Upload className={`w-8 h-8 mb-2 group-hover:-translate-y-1 transition-transform drop-shadow-md ${(bannerPreview || isEditMode) ? 'text-white' : 'text-gray-400'}`} />
                                    <p className={`text-xs font-medium mb-1 drop-shadow-md ${(bannerPreview || isEditMode) ? 'text-white' : 'text-regx-orange'}`}>
                                        {(bannerPreview || isEditMode) ? 'Replace YouTube Thumbnail Size' : 'Upload YouTube Thumbnail Size'}
                                    </p>
                                    <p className={`text-[10px] drop-shadow-md ${(bannerPreview || isEditMode) ? 'text-gray-200' : 'text-gray-500'}`}>1280 x 720px (16:9 ratio)</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

            </div>
            )}
        </div>
    );
};

export default CreateEditEvent;
