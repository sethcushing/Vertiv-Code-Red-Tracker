import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const StrategicInitiativeForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Not Started',
    executive_sponsor: '',
    business_outcome_ids: [],
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/business-outcomes/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleToggleOutcome = (categoryId) => {
    const current = formData.business_outcome_ids || [];
    const updated = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    setFormData({ ...formData, business_outcome_ids: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/strategic-initiatives', formData);
      toast.success('Initiative created');
      navigate(`/strategic-initiatives/${response.data.id}`);
    } catch (error) {
      toast.error('Failed to create initiative');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-heading font-bold text-gray-900">New Strategic Initiative</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-gray-200">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ETO Transformation"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the initiative"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="Discovery">Discovery</SelectItem>
                    <SelectItem value="Frame">Frame</SelectItem>
                    <SelectItem value="Work In Progress">Work In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Executive Sponsor</label>
                <Input
                  value={formData.executive_sponsor}
                  onChange={(e) => setFormData({ ...formData, executive_sponsor: e.target.value })}
                  placeholder="Name of sponsor"
                  className="mt-1"
                />
              </div>
            </div>

            {categories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Link to Business Outcomes</label>
                <div className="mt-2 space-y-2">
                  {categories.map(cat => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={formData.business_outcome_ids.includes(cat.id)}
                        onChange={() => handleToggleOutcome(cat.id)}
                        className="w-4 h-4 text-[#FE5B1B] rounded"
                      />
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-sm text-gray-400">{cat.sub_outcomes_count} sub-outcomes</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Initiative'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default StrategicInitiativeForm;
