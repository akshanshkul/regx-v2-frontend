import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { initAuth } from './store/slices/authSlice';
import { useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Spinner from './shared/components/Spinner';

/*
 * The public registration form is the only page loaded eagerly.
 *
 * It is the one page most people ever see, it is opened on a phone from a
 * message, and nothing else on the site is on the way to it — so it ships in
 * the first chunk and starts rendering without a second round trip.
 *
 * Everything else is split out. Statically importing the dashboard here meant
 * a participant filling in a form downloaded the form builder, the fixture
 * engine, the certificate designer and the broadcast composer before they could
 * type their name.
 */
import PublicForm from './forms/pages/PublicForm';

const LandingLayout = lazy(() => import('./landing/layouts/LandingLayout'));
const Home = lazy(() => import('./landing/pages/Home'));
const Contact = lazy(() => import('./landing/pages/Contact'));
const PrivacyPolicy = lazy(() => import('./landing/pages/legal/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./landing/pages/legal/TermsAndConditions'));
const RefundPolicy = lazy(() => import('./landing/pages/legal/RefundPolicy'));
const DataProtectionPolicy = lazy(() => import('./landing/pages/legal/DataProtectionPolicy'));
const Sitemap = lazy(() => import('./landing/pages/legal/Sitemap'));
const AuthLayout = lazy(() => import('./auth/layouts/AuthLayout'));
const Login = lazy(() => import('./auth/pages/Login'));
const Signup = lazy(() => import('./auth/pages/Signup'));
const ForgotPassword = lazy(() => import('./auth/pages/ForgotPassword'));
const DashboardLayout = lazy(() => import('./dashboard/layouts/DashboardLayout'));
const Dashboard = lazy(() => import('./dashboard/pages/Dashboard'));
const MyEvents = lazy(() => import('./dashboard/pages/MyEvents'));
const EventDetails = lazy(() => import('./dashboard/pages/EventDetails'));
const CreateEditEvent = lazy(() => import('./dashboard/pages/CreateEditEvent'));
const Registrations = lazy(() => import('./dashboard/pages/Registrations'));
const Notifications = lazy(() => import('./dashboard/pages/Notifications'));
const TeamPermissions = lazy(() => import('./dashboard/pages/TeamPermissions'));
const Operations = lazy(() => import('./dashboard/pages/Operations'));
const OfflineForms = lazy(() => import('./dashboard/pages/operations/OfflineForms'));
const OfflineRegister = lazy(() => import('./dashboard/pages/operations/OfflineRegister'));
const StandaloneFixtures = lazy(() => import('./dashboard/pages/operations/StandaloneFixtures'));
const Profile = lazy(() => import('./dashboard/pages/Profile'));
const Settings = lazy(() => import('./dashboard/pages/Settings'));
const FormBuilder = lazy(() => import('./dashboard/pages/FormBuilder'));
const FormSubmissionsData = lazy(() => import('./dashboard/pages/FormSubmissionsData'));
const Reports = lazy(() => import('./dashboard/pages/Reports'));
const Subscription = lazy(() => import('./payments/pages/Subscription'));
const Payments = lazy(() => import('./dashboard/pages/Payments'));
const Payouts = lazy(() => import('./dashboard/pages/Payouts'));
const FormRedirect = lazy(() => import('./dashboard/pages/FormRedirect'));
const FixtureEngine = lazy(() => import('./dashboard/pages/fixtures/FixtureEngine'));
const FixtureCategory = lazy(() => import('./dashboard/pages/fixtures/FixtureCategory'));
const ScanStation = lazy(() => import('./dashboard/pages/fixtures/ScanStation'));
const PublicFixtureScreen = lazy(() => import('./fixtures/PublicFixtureScreen'));
const RefereeScreen = lazy(() => import('./fixtures/RefereeScreen'));
const MyEventScreen = lazy(() => import('./fixtures/MyEventScreen'));
const AcceptInvite = lazy(() => import('./dashboard/pages/AcceptInvite'));
const IdCardCertificateModule = lazy(() => import('./dashboard/pages/IdCardCertificateModule'));
const IdCardCertificateSetup = lazy(() => import('./dashboard/pages/IdCardCertificateSetup'));
const IdCardCertificateView = lazy(() => import('./dashboard/pages/IdCardCertificateView'));
const IdCardCertificateConnect = lazy(() => import('./dashboard/pages/IdCardCertificateConnect'));
const IdCardCertificateCollection = lazy(() => import('./dashboard/pages/IdCardCertificateCollection'));
const WeighIn = lazy(() => import('./dashboard/pages/operations/WeighIn'));
const Attendance = lazy(() => import('./dashboard/pages/operations/Attendance'));
const Guide = lazy(() => import('./dashboard/pages/Guide'));
const BroadCast = lazy(() => import('./dashboard/pages/operations/BroadCast'));
const NotFound = lazy(() => import('./shared/pages/NotFound'));

const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const RequireGuest = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  const dispatch = useDispatch();

  // Exchange a stored token for the current user on boot.
  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
    <Routes>
      {/* Public Routes */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<div className="py-32 text-center text-2xl">Pricing</div>} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundPolicy />} />
        <Route path="/dpdp-policy" element={<DataProtectionPolicy />} />
        <Route path="/sitemap" element={<Sitemap />} />
      </Route>

      {/* Public registration form — no layout, no auth */}
      <Route path="/form/:slug" element={<PublicForm />} />

      {/* The hall screen. Public by design: it goes on a projector. */}

      {/* Auth Routes */}
      <Route element={<RequireGuest><AuthLayout /></RequireGuest>}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="my-events" element={<MyEvents />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="team-permissions" element={<TeamPermissions />} />
        <Route path="guide" element={<Guide />} />
        <Route path="operations" element={<Operations />} />
        <Route path="profile" element={<Profile />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="billing" element={<div className="p-6">Billing (Coming soon)</div>} />
        {/* The forms list, reachable from the sidebar. Forms are no longer
            only about events, so they get a home that is not under one. */}
        <Route path="forms" element={<Registrations />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="settings" element={<Settings />} />



        {/* ID Card & Certificate Module — nested under /dashboard */}
        <Route path="certificates">
          <Route index element={<IdCardCertificateModule />} />
          <Route path="setup/:collectionId" element={<IdCardCertificateSetup />} />
          <Route path="view/:collectionId" element={<IdCardCertificateView />} />
          <Route path="connect/:collectionId" element={<IdCardCertificateConnect />} />
          <Route path="collection/:collectionId" element={<IdCardCertificateCollection />} />
        </Route>

        <Route path="broadcast" element={<BroadCast />} />
      </Route>
      <Route path="/events/create" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<CreateEditEvent />} />
      </Route>
      <Route path="/events/:id/edit" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<CreateEditEvent />} />
      </Route>
      {/* A form id alone is unique, so /forms/6 is a reasonable thing to type
          or paste — and what someone wants at it is the registrations, not the
          builder. The builder is a click away from there, or at /forms/6/edit. */}
      <Route path="/forms/:formId" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<FormSubmissionsData />} />
        <Route path="data" element={<FormSubmissionsData />} />
        <Route path="edit" element={<FormRedirect />} />
        {/* The builder for a form that belongs to no event, so there is no
            event id to put in the path. */}
        <Route path="builder" element={<FormBuilder />} />
        <Route path="fixture" element={<FixtureEngine />} />
        {/* A results desk: just the scan box. Listed before :category so it wins. */}
        <Route path="fixture/scan" element={<ScanStation />} />
        <Route path="fixture/:category" element={<FixtureCategory />} />
      </Route>
      <Route path="/events/:eventId/form/:formId/fixture" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<FixtureEngine />} />
        <Route path="scan" element={<ScanStation />} />
        <Route path=":category" element={<FixtureCategory />} />
      </Route>
      <Route path="/events/:eventId/forms/:formId" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<FormBuilder />} />
        <Route path="data" element={<FormSubmissionsData />} />
      </Route>
      <Route path="/events/registrations" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<Registrations />} />
      </Route>
      <Route path="/events/:id" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index element={<EventDetails />} />
      </Route>
      {/* Joining someone else's account. Signing in is what proves who is accepting. */}
      <Route path="/invite/:token" element={<RequireAuth><AcceptInvite /></RequireAuth>} />

      {/* The hall board, for a screen at the venue. No sign-in: the link is the key. */}
      <Route path="/draw/:token" element={<PublicFixtureScreen />} />
      {/* An athlete's own page. The signed link is the key; it shows that registration only. */}
      <Route path="/me/:token" element={<MyEventScreen />} />
      {/* A referee's phone at one table. The link is the key; it opens that table only. */}
      <Route path="/ref/:token" element={<RefereeScreen />} />
      <Route path="/operations" element={<RequireAuth> <DashboardLayout /> </RequireAuth>} >
        <Route path="weigh-in" element={<WeighIn />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="offline" element={<OfflineForms />} />
        <Route path="offline/:formId" element={<OfflineRegister />} />
        <Route path="fixtures" element={<StandaloneFixtures />} />
        <Route path="fixtures/:collectionId" element={<StandaloneFixtures />} />
        <Route path="fixtures/:collectionId/:fixtureId" element={<StandaloneFixtures />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Toaster position="top-right" />
      <AppRoutes />
    </GoogleOAuthProvider>
  );
}

export default App;
