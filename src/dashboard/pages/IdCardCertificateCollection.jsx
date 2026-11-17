import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowLeft, CalendarDays, CheckCircle2, ExternalLink,
  FileImage, Folder, Loader2, RefreshCw, Settings, Users,
} from 'lucide-react';
import api from '../../services/api';
import { useRouteIds } from '../../shared/utils/ids';

const dateTime = (value) => {
  if (!value) return 'Not yet';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
};

const statusClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'generated':
      return 'bg-green-50 text-green-700';
    case 'failed':
      return 'bg-red-50 text-red-700';
    case 'processing':
    case 'pending':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const IdCardCertificateCollection = () => {
  const { collectionId } = useRouteIds();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState(null);
  const [generatedError, setGeneratedError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    setGeneratedError(null);

    try {
      const response = await api.get(`/certificates/${collectionId}`);
      const record = response?.data;

      if (!record || typeof record !== 'object') {
        throw new Error('The collection response was empty.');
      }

      setCollection(record);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Could not load this collection.');
      setCollection(null);
    }

    try {
      const response = await api.get(`/certificates/${collectionId}/generated`);
      const result = response?.data?.generated;

      setGenerated(result && typeof result === 'object' ? result : null);
    } catch (loadError) {
      setGeneratedError(loadError?.response?.data?.message || loadError.message || 'Could not load generated cards.');
      setGenerated(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, [collectionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-regx-orange" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate('/dashboard/certificates')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to collections
        </button>
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || 'Collection not found.'}
        </div>
      </div>
    );
  }

  const isIdCard = Number(collection.type) === 2;
  const setupPath = `/dashboard/certificates/setup/${collectionId}`;
  const batches = Array.isArray(generated?.batches) ? generated.batches : [];
  const files = Array.isArray(generated?.files) ? generated.files : [];
  const collectionStatus = collection.status || 'draft';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/certificates')}
            aria-label="Back to collections"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-gray-900">{collection.name || 'Untitled collection'}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(collectionStatus)}`}>
                {collectionStatus}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {isIdCard ? 'ID card collection' : 'Certificate collection'}
              {collection.description ? ` · ${collection.description}` : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 pl-11 sm:pl-0">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate(setupPath)}
            className="inline-flex items-center gap-2 rounded-lg bg-regx-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Settings className="h-4 w-4" />
            {collection.template_url ? 'Edit layout' : 'Set up card'}
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Recipients"
          value={collection.recipient_count ?? collection.data_count ?? '—'}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Generated"
          value={generated?.total_generated ?? collection.generated_count ?? 0}
        />
        <SummaryCard
          icon={CalendarDays}
          label="Last generated"
          value={dateTime(collection.generated_at)}
          compact
        />
        <SummaryCard
          icon={FileImage}
          label="Artwork"
          value={collection.template_url ? 'Uploaded' : 'Not uploaded'}
          compact
        />
      </section>

      {generatedError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Collection details loaded, but generated cards could not be retrieved: {generatedError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Generated cards and certificates</h2>
            <p className="mt-1 text-xs text-gray-500">
              {generated?.message || 'Downloads from each generation batch appear here.'}
            </p>
          </div>
          {generated?.combined_pdf_url && generated?.files_available !== false && (
            <a
              href={generated.combined_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Download latest batch
            </a>
          )}
        </div>

        {batches.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {batches.map((batch) => (
              <div key={batch.batch_id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{batch.batch_id}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {batch.count} {batch.count === 1 ? 'file' : 'files'} · {dateTime(batch.generated_at)}
                  </p>
                </div>
                {batch.files_available ? (
                  batch.batch_id === generated?.batch_id && generated?.combined_pdf_url ? (
                    <a
                      href={generated.combined_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 sm:self-auto"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Download PDF
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Individual files are listed in the latest batch only.</span>
                  )
                ) : (
                  <span className="text-xs text-gray-400">Files are no longer available</span>
                )}
              </div>
            ))}
          </div>
        ) : files.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {files.map((file) => (
              <div key={file.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.certificate_number || `Certificate ${file.id}`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{dateTime(file.created_at)}</p>
                </div>
                {file.download_url && (
                  <a
                    href={file.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 sm:self-auto"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Folder className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-700">Nothing generated yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              Set up the artwork and fields, then generate this collection to see its files here.
            </p>
            <button
              type="button"
              onClick={() => navigate(setupPath)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Open setup
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, compact = false }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="rounded-lg bg-orange-50 p-2 text-regx-orange">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`truncate font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-xl'}`}>{value}</p>
    </div>
  </div>
);

export default IdCardCertificateCollection;
