import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Target, Plus, ChevronRight, TrendingUp, TrendingDown, Minus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

const EnterpriseMetrics = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    target_value: '',
    current_value: '',
    unit: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, categoriesRes] = await Promise.all([
        api.get('/enterprise-metrics'),
        api.get('/config/metric-categories')
      ]);
      setMetrics(metricsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null
      };

      if (editingMetric) {
        await api.put(`/enterprise-metrics/${editingMetric.id}`, payload);
        toast.success('Metric updated');
      } else {
        await api.post('/enterprise-metrics', payload);
        toast.success('Metric created');
      }
      
      setIsDialogOpen(false);
      setEditingMetric(null);
      setFormData({ name: '', description: '', category: '', target_value: '', current_value: '', unit: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save metric');
    }
  };

  const handleEdit = (metric) => {
    setEditingMetric(metric);
    setFormData({
      name: metric.name,
      description: metric.description || '',
      category: metric.category,
      target_value: metric.target_value?.toString() || '',
      current_value: metric.current_value?.toString() || '',
      unit: metric.unit || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (metricId) => {
    if (!window.confirm('Delete this metric? It will be unlinked from all initiatives.')) return;
    try {
      await api.delete(`/enterprise-metrics/${metricId}`);
      toast.success('Metric deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete metric');
    }
  };

  const getProgressColor = (current, target) => {
    if (!current || !target) return 'bg-gray-300';
    const ratio = current / target;
    if (ratio >= 0.9) return 'bg-green-500';
    if (ratio >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (current, target) => {
    if (!current || !target) return <Minus className="w-4 h-4 text-gray-400" />;
    const ratio = current / target;
    if (ratio >= 1) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (ratio >= 0.8) return <Minus className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = [];
    acc[metric.category].push(metric);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="enterprise-metrics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-gray-900 uppercase tracking-tight">
            Core Business Outcomes
          </h2>
          <p className="text-sm text-gray-500 font-lato-light mt-1">
            Track key performance indicators aligned to initiatives
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingMetric(null);
            setFormData({ name: '', description: '', category: '', target_value: '', current_value: '', unit: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-metric-btn"
              className="text-white rounded-xl font-lato-bold shadow-lg"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Outcome
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingMetric ? 'Edit Outcome' : 'Create Business Outcome'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-lato-regular">Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quote-to-Order Cycle Time"
                  required
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-lato-regular">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-lato-regular">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the metric"
                  className="rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="font-lato-regular">Target</Label>
                  <Input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder="90"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-lato-regular">Current</Label>
                  <Input
                    type="number"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                    placeholder="75"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-lato-regular">Unit</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="%"
                    className="rounded-lg"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full text-white rounded-lg font-lato-bold" style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}>
                  {editingMetric ? 'Update Outcome' : 'Create Outcome'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {categories.map((cat) => {
          const catMetrics = groupedMetrics[cat] || [];
          const onTarget = catMetrics.filter(m => m.current_value && m.target_value && m.current_value >= m.target_value * 0.9).length;
          return (
            <Card key={cat} className="border-0 shadow-md rounded-xl">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-lato-regular uppercase tracking-wider">{cat}</p>
                <p className="text-2xl font-heading font-bold text-gray-900 mt-1">{catMetrics.length}</p>
                <p className="text-xs text-gray-400 font-lato-light">{onTarget} on target</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metrics by Category */}
      {categories.map((category) => {
        const catMetrics = groupedMetrics[category] || [];
        if (catMetrics.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-lg font-heading font-bold text-gray-800 uppercase tracking-tight">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catMetrics.map((metric) => {
                const progress = metric.target_value && metric.current_value 
                  ? Math.min(100, (metric.current_value / metric.target_value) * 100)
                  : 0;

                return (
                  <Card 
                    key={metric.id} 
                    data-testid={`metric-card-${metric.id}`}
                    className="border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/enterprise-metrics/${metric.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-[#FE5B1B]" />
                            <h4 className="font-lato-bold text-gray-900 line-clamp-1">{metric.name}</h4>
                          </div>
                          {metric.description && (
                            <p className="text-xs text-gray-500 font-lato-light mt-1 line-clamp-2">{metric.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(metric); }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(metric.id); }}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500 font-lato-light">
                            {metric.current_value ?? '-'} {metric.unit}
                          </span>
                          <span className="font-lato-bold text-gray-900">
                            Target: {metric.target_value ?? '-'} {metric.unit}
                          </span>
                        </div>
                        <Progress value={progress} className={`h-2 ${getProgressColor(metric.current_value, metric.target_value)}`} />
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(metric.current_value, metric.target_value)}
                          <span className="text-xs text-gray-500 font-lato-light">
                            {metric.initiative_count} initiative{metric.initiative_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#FE5B1B] transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {metrics.length === 0 && (
        <Card className="border-2 border-dashed border-gray-200 rounded-xl">
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-lato-bold text-gray-600 mb-2">No Enterprise Metrics Yet</h3>
            <p className="text-sm text-gray-400 font-lato-light mb-4">
              Create metrics to track key performance indicators across your initiatives
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="text-white rounded-lg font-lato-bold"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Metric
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnterpriseMetrics;
