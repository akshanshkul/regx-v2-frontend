import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Link2 } from 'lucide-react';
import { useRouteIds } from '../../shared/utils/ids';

const IdCardCertificateConnect = () => {
  const { collectionId } = useRouteIds();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connect</h1>
          <p className="text-sm text-gray-500">Collection ID: {collectionId}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Connect integrations and external sources here.</p>
      </div>
    </div>
  );
};

export default IdCardCertificateConnect;