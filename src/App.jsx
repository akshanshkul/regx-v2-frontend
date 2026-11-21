import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { initAuth } from './store/slices/authSlice';
import { useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';
import Spinner from './shared/components/Spinner';
import api, { MAINTENANCE_EVENT } from './services/api';

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
const Pricing = lazy(() => import('./landing/pages/Pricing'));
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
const WalletOverview = lazy(() => import('./dashboard/pages/wallet/WalletOverview'));
const WalletRecharge = lazy(() => import('./dashboard/pages/wallet/WalletRecharge'));
const WalletRechargeHistory = lazy(() => import('./dashboard/pages/wallet/WalletRechargeHistory'));
const WalletTransactions = lazy(() => import('./dashboard/pages/wallet/WalletTransactions'));
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
  const navigate = useNavigate();
  const location = useLocation();
  const [isEnableInspect, setIsEnableInspect] = useState(true);
  const [appConfigLoaded, setAppConfigLoaded] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isManagementAllowed, setIsManagementAllowed] = useState(true);
  const redirected = useRef(false);

  useEffect(() => {
    const showMaintenance = () => {
      setIsMaintenanceMode(true);
      setIsManagementAllowed(false);
      setAppConfigLoaded(true);
    };

    window.addEventListener(MAINTENANCE_EVENT, showMaintenance);

    return () => {
      window.removeEventListener(MAINTENANCE_EVENT, showMaintenance);
    };
  }, []);

  // Exchange a stored token for the current user on boot.
  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  useEffect(() => {
    let active = true;

    api.get('/app/config')
      .then((response) => {
        const enabled = response?.data?.isEnableInspect;
        const maintenance = response?.data?.isMaintenanceMode;
        const allowed = response?.data?.isManagementAllowed;
        if (active && typeof enabled === 'boolean') {
          setIsEnableInspect(enabled);
        }
        if (active) {
          setIsMaintenanceMode(maintenance === true);
          setIsManagementAllowed(allowed !== false);
          setAppConfigLoaded(true);
        }
      })
      .catch((error) => {
        console.warn('Could not load browser inspection settings:', error);
        if (active) {
          setAppConfigLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isEnableInspect) {
      return undefined;
    }

    let resizeTimer;
    const sampleWindow = () => ({
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
    });
    let previous = sampleWindow();

    const redirectHome = () => {
      if (location.pathname === '/' || redirected.current) {
        return;
      }

      redirected.current = true;
      navigate('/', { replace: true });
    };

    const initialCheckTimer = window.setTimeout(() => {
      const current = sampleWindow();
      const desktop = window.innerWidth >= 768
        && window.matchMedia('(pointer: fine)').matches;
      const toolsAlreadyDocked = desktop
        && (
          current.outerWidth - current.innerWidth > 360
          || current.outerHeight - current.innerHeight > 360
        );

      if (toolsAlreadyDocked) {
        redirectHome();
      }
    }, 700);

    const onKeyDown = (event) => {
      const key = (event.key || '').toLowerCase();
      const desktopShortcut = event.ctrlKey && event.shiftKey;
      const macShortcut = event.metaKey && event.altKey;
      const devToolsShortcut = key === 'f12'
        || ((desktopShortcut || macShortcut)
          && ['i', 'j', 'c'].includes(key));

      if (!devToolsShortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      redirectHome();
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const current = sampleWindow();
        const desktop = window.innerWidth >= 768
          && window.matchMedia('(pointer: fine)').matches;
        const zoomChanged = Math.abs(current.pixelRatio - previous.pixelRatio) > 0.01;
        const browserResized = Math.abs(current.outerWidth - previous.outerWidth) > 24
          || Math.abs(current.outerHeight - previous.outerHeight) > 24;
        const previousWidthGap = previous.outerWidth - previous.innerWidth;
        const previousHeightGap = previous.outerHeight - previous.innerHeight;
        const currentWidthGap = current.outerWidth - current.innerWidth;
        const currentHeightGap = current.outerHeight - current.innerHeight;
        const dockedToolsLikely = desktop
          && !zoomChanged
          && !browserResized
          && (
            (currentWidthGap > 300 && currentWidthGap - previousWidthGap > 180)
            || (currentHeightGap > 300 && currentHeightGap - previousHeightGap > 180)
          );

        previous = current;

        if (dockedToolsLikely) {
          redirectHome();
        }
      }, 300);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(initialCheckTimer);
    };
  }, [isEnableInspect, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname !== '/') {
      redirected.current = false;
    }
  }, [location.pathname]);

  if (!appConfigLoaded) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (isMaintenanceMode && !isManagementAllowed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6 text-center">
        <section className="max-w-md">
          <h1 className="text-3xl font-bold text-gray-900">We will be back soon</h1>
          <p className="mt-3 text-gray-600">
            RegX is temporarily unavailable while we carry out maintenance. Please try again later.
          </p>
        </section>
      </main>
    );
  }

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
        <Route path="/pricing" element={<Pricing />} />
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
        <Route path="subscription" element={<Navigate to="/dashboard/wallet" replace />} />
        <Route path="billing" element={<Navigate to="/dashboard/wallet" replace />} />
        {/* The forms list, reachable from the sidebar. Forms are no longer
            only about events, so they get a home that is not under one. */}
        <Route path="forms" element={<Registrations />} />
        <Route path="payments" element={<Payments />} />
        <Route path="wallet" element={<WalletOverview />} />
        <Route path="wallet/recharge" element={<WalletRecharge />} />
        <Route path="wallet/recharge-history" element={<WalletRechargeHistory />} />
        <Route path="wallet/transactions" element={<WalletTransactions />} />
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
  return (
    <>
      <Toaster position="top-right" />
      <AppRoutes />
    </>
  );
}

export default App;
