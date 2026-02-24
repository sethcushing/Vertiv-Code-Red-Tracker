import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Building2,
  Truck,
  Plus,
  Trash2,
  Settings,
  Loader2,
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [businessUnits, setBusinessUnits] = useState([]);
  const [deliveryStages, setDeliveryStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBusinessUnit, setNewBusinessUnit] = useState('');
  const [newDeliveryStage, setNewDeliveryStage] = useState('');
  const [addingBU, setAddingBU] = useState(false);
  const [addingDS, setAddingDS] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/config');
      setBusinessUnits(res.data.business_units || []);
      setDeliveryStages(res.data.delivery_stages || []);
    } catch (error) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBusinessUnit = async (e) => {
    e.preventDefault();
    if (!newBusinessUnit.trim()) return;

    try {
      setAddingBU(true);
      const res = await api.post('/config/business-units', { name: newBusinessUnit.trim() });
      setBusinessUnits(res.data);
      setNewBusinessUnit('');
      toast.success('Business unit added');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add business unit');
    } finally {
      setAddingBU(false);
    }
  };

  const handleDeleteBusinessUnit = async (name) => {
    if (!window.confirm(`Delete "${name}" from business units?`)) return;

    try {
      const res = await api.delete(`/config/business-units/${encodeURIComponent(name)}`);
      setBusinessUnits(res.data.business_units);
      toast.success('Business unit deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete business unit');
    }
  };

  const handleAddDeliveryStage = async (e) => {
    e.preventDefault();
    if (!newDeliveryStage.trim()) return;

    try {
      setAddingDS(true);
      const res = await api.post('/config/delivery-stages', { name: newDeliveryStage.trim() });
      setDeliveryStages(res.data);
      setNewDeliveryStage('');
      toast.success('Delivery stage added');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add delivery stage');
    } finally {
      setAddingDS(false);
    }
  };

  const handleDeleteDeliveryStage = async (name) => {
    if (!window.confirm(`Delete "${name}" from delivery stages?`)) return;

    try {
      const res = await api.delete(`/config/delivery-stages/${encodeURIComponent(name)}`);
      setDeliveryStages(res.data.delivery_stages);
      toast.success('Delivery stage deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete delivery stage');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="admin-settings-loading">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-settings-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FE5B1B]/25">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-sm text-gray-500">Manage system configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Units */}
        <Card className="rounded-2xl shadow-glass border-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}>
          <CardHeader className="pb-3 border-b border-gray-100/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-[#FE5B1B]/10 rounded-xl">
                <Building2 className="w-5 h-5 text-[#FE5B1B]" />
              </div>
              Business Units
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Add Form */}
            <form onSubmit={handleAddBusinessUnit} className="flex gap-2">
              <Input
                value={newBusinessUnit}
                onChange={(e) => setNewBusinessUnit(e.target.value)}
                placeholder="Enter new business unit"
                className="flex-1 rounded-xl border-gray-200 focus:border-[#FE5B1B] focus:ring-[#FE5B1B]/20"
                data-testid="new-business-unit-input"
              />
              <Button
                type="submit"
                disabled={addingBU || !newBusinessUnit.trim()}
                className="text-white rounded-xl shadow-lg shadow-[#FE5B1B]/25 hover:shadow-xl hover:shadow-[#FE5B1B]/30 transition-all"
                style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
                data-testid="add-business-unit-btn"
              >
                {addingBU ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </form>

            {/* List */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {businessUnits.map((unit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                  data-testid={`business-unit-${unit.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="text-sm font-medium text-gray-700">{unit}</span>
                  <button
                    onClick={() => handleDeleteBusinessUnit(unit)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                    data-testid={`delete-bu-${unit.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {businessUnits.length === 0 && (
                <p className="text-center text-gray-400 py-4">No business units configured</p>
              )}
            </div>

            <p className="text-xs text-gray-400">
              {businessUnits.length} business unit{businessUnits.length !== 1 ? 's' : ''} configured
            </p>
          </CardContent>
        </Card>

        {/* Delivery Stages */}
        <Card className="rounded-2xl shadow-glass border-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}>
          <CardHeader className="pb-3 border-b border-gray-100/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-violet-500/10 rounded-xl">
                <Truck className="w-5 h-5 text-violet-600" />
              </div>
              Delivery Stages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Add Form */}
            <form onSubmit={handleAddDeliveryStage} className="flex gap-2">
              <Input
                value={newDeliveryStage}
                onChange={(e) => setNewDeliveryStage(e.target.value)}
                placeholder="Enter new delivery stage"
                className="flex-1 rounded-xl border-gray-200 focus:border-[#FE5B1B] focus:ring-[#FE5B1B]/20"
                data-testid="new-delivery-stage-input"
              />
              <Button
                type="submit"
                disabled={addingDS || !newDeliveryStage.trim()}
                className="text-white rounded-xl shadow-lg shadow-[#FE5B1B]/25 hover:shadow-xl hover:shadow-[#FE5B1B]/30 transition-all"
                style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
                data-testid="add-delivery-stage-btn"
              >
                {addingDS ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </form>

            {/* List */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {deliveryStages.map((stage, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl group transition-all duration-200 hover:shadow-sm"
                  style={{ background: 'rgba(249,250,251,0.8)' }}
                  data-testid={`delivery-stage-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#FE5B1B]/10 text-[#FE5B1B] text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{stage}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDeliveryStage(stage)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                    data-testid={`delete-ds-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {deliveryStages.length === 0 && (
                <p className="text-center text-gray-400 py-4">No delivery stages configured</p>
              )}
            </div>

            <p className="text-xs text-gray-400 font-lato-light">
              {deliveryStages.length} delivery stage{deliveryStages.length !== 1 ? 's' : ''} configured
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Changes to Business Units and Delivery Stages will be reflected immediately 
            across all Initiative and Project detail pages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
