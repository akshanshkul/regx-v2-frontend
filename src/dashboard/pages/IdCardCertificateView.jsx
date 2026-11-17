import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Eye, FileImage } from 'lucide-react';
import { useRouteIds } from '../../shared/utils/ids';

const IdCardCertificateView = () => {
  const { collectionId } = useRouteIds();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">View Cards & Certificates</h1>
          <p className="text-sm text-gray-500">Collection ID: {collectionId}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <FileImage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">View all generated cards and certificates here.</p>
      </div>
    </div>
  );
};

export default IdCardCertificateView;