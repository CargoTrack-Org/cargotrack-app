import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { ShipmentDocument } from '../types';
import { Upload, File, Download, Paperclip } from 'lucide-react';

interface Props {
  shipmentId: string;
  documents: ShipmentDocument[];
  onUploaded: () => void;
}

const DOC_TYPES = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'SHIPPING_LABEL', label: 'Shipping Label' },
  { value: 'PROOF_OF_DELIVERY', label: 'Proof of Delivery' },
  { value: 'CUSTOMS', label: 'Customs Document' },
];

export default function DocumentUpload({ shipmentId, documents, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState('INVOICE');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      await api.post(`/documents/shipment/${shipmentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded');
      onUploaded();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (doc: ShipmentDocument) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Paperclip className="w-3.5 h-3.5" />
        Documents
      </h3>

      {/* Upload controls */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700/50">
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600 hover:text-slate-100 cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-6">
          <File className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <p className="text-xs text-slate-600">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700/50 group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <File className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{doc.originalName}</p>
                  <p className="text-xs text-slate-600">
                    {DOC_TYPES.find((t) => t.value === doc.documentType)?.label} · {formatFileSize(doc.fileSize)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(doc)}
                className="p-2 text-slate-600 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
