import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Keyboard, Loader2, QrCode, ScanLine } from 'lucide-react';
import ResultScanner from './ResultScanner';
import { useFixtureState } from './fixtureData';
import { encodeId, useRouteIds } from '../../../shared/utils/ids';

/**
 * A screen just for scanning winners: /forms/{id}/fixture/scan
 *
 * For a results desk with a barcode or QR scanner: one big box that keeps the
 * cursor, a sound for every scan, the match picker when someone is waiting in
 * several categories, and a long list of what was recorded. Same rules as the
 * box on the fixture page — the waiting match of that registration is won.
 */
const ScanStation = () => {
    const { eventId, formId } = useRouteIds();
    const stored = useFixtureState(formId);
    const [recorded, setRecorded] = useState(0);

    const back = eventId
        ? `/events/${encodeId(eventId)}/form/${encodeId(formId)}/fixture`
        : `/forms/${encodeId(formId)}/fixture`;

    const anyStarted = stored.categories.some((item) => ['started', 'completed'].includes(item.status));

    useEffect(() => {
        document.title = 'Scan winners';
    }, []);

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-center gap-3">
                <Link to={back} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Back to fixture engine">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500">Fixture engine</p>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ScanLine className="w-5 h-5 text-regx-orange" /> Scan winners</h1>
                </div>
                {recorded > 0 && (
                    <span className="ml-auto rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 tabular-nums">
                        {recorded} recorded here
                    </span>
                )}
            </div>

            {stored.loading ? (
                <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !anyStarted ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                    No category has been started yet, so there is no match to record. Start categories on the fixture page first.
                </p>
            ) : (
                <ResultScanner formId={formId} enabled keepFocus camera historySize={40} onRecorded={() => setRecorded((n) => n + 1)} />
            )}

            <section className="grid gap-3 sm:grid-cols-3 text-sm text-gray-600">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="font-semibold text-gray-900 flex items-center gap-2"><Camera className="w-4 h-4 text-regx-orange" /> With a phone</p>
                    <p className="mt-1">Tap <strong>Use camera</strong> and hold the winner&apos;s ID card QR or barcode in the square. Each card counts once; it pauses while you pick a match. Needs the site on https.</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="font-semibold text-gray-900 flex items-center gap-2"><QrCode className="w-4 h-4 text-regx-orange" /> With a scanner</p>
                    <p className="mt-1">Plug in a USB or Bluetooth barcode / QR scanner and scan the winner&apos;s ID card or registration QR. It records straight away — one beep means saved.</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="font-semibold text-gray-900 flex items-center gap-2"><Keyboard className="w-4 h-4 text-regx-orange" /> By hand</p>
                    <p className="mt-1">Type the registration number (e.g. REG-5WAM339J) and press Enter. Three beeps mean they are waiting in more than one category — press 1–9 to pick the match, Esc to cancel.</p>
                </div>
            </section>
        </div>
    );
};

export default ScanStation;
