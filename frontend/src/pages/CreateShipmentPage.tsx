import Layout from '../components/Layout';
import ShipmentForm from '../components/ShipmentForm';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateShipmentPage() {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <button
            onClick={() => navigate('/shipments')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Shipments
          </button>
          <h1 className="text-xl font-bold text-slate-100">Create Shipment</h1>
          <p className="text-xs text-slate-500 mt-1">Fill in the details to register a new shipment</p>
        </div>
        <ShipmentForm />
      </div>
    </Layout>
  );
}
