import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit2,
  Trash2,
  History,
  BarChart3,
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const BusinessOutcomes = () => {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubOutcomes, setExpandedSubOutcomes] = useState({});
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubOutcomeModal, setShowSubOutcomeModal] = useState(false);
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [kpiHistory, setKpiHistory] = useState(null);

  // Form states
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const response = await api.get('/business-outcomes/tree');
      setTree(response.data);
      // Expand all by default
      const catExpanded = {};
      const subExpanded = {};
      response.data.forEach(cat => {
        catExpanded[cat.id] = true;
        cat.sub_outcomes.forEach(sub => {
          subExpanded[sub.id] = false;
        });
      });
      setExpandedCategories(catExpanded);
      setExpandedSubOutcomes(subExpanded);
    } catch (error) {
      toast.error('Failed to load business outcomes');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubOutcome = (id) => {
    setExpandedSubOutcomes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getProgressColor = (progress) => {
    if (progress >= 70) return 'text-emerald-600';
    if (progress >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressBg = (progress) => {
    if (progress >= 70) return 'bg-emerald-500';
    if (progress >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getChartColor = (progress) => {
    if (progress >= 70) return '#10b981';
    if (progress >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getTrendIcon = (progress) => {
    if (progress >= 70) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    if (progress >= 40) return <Minus className="w-3.5 h-3.5 text-amber-500" />;
    return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  };

  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return '-';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  // CRUD Handlers
  const handleAddCategory = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '' });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (cat, e) => {
    e.stopPropagation();
    setEditingItem(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (editingItem) {
        await api.put(`/business-outcomes/categories/${editingItem.id}`, formData);
        toast.success('Category updated');
      } else {
        await api.post('/business-outcomes/categories', formData);
        toast.success('Category created');
      }
      setShowCategoryModal(false);
      fetchTree();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this category and all its sub-outcomes and KPIs?')) {
      try {
        await api.delete(`/business-outcomes/categories/${id}`);
        toast.success('Category deleted');
        fetchTree();
      } catch (error) {
        toast.error('Failed to delete category');
      }
    }
  };

  const handleAddSubOutcome = (categoryId, e) => {
    e.stopPropagation();
    setEditingItem(null);
    setParentId(categoryId);
    setFormData({ name: '', description: '' });
    setShowSubOutcomeModal(true);
  };

  const handleEditSubOutcome = (sub, e) => {
    e.stopPropagation();
    setEditingItem(sub);
    setFormData({ name: sub.name, description: sub.description || '' });
    setShowSubOutcomeModal(true);
  };

  const handleSaveSubOutcome = async () => {
    try {
      if (editingItem) {
        await api.put(`/business-outcomes/sub-outcomes/${editingItem.id}`, formData);
        toast.success('Sub-outcome updated');
      } else {
        await api.post('/business-outcomes/sub-outcomes', { ...formData, category_id: parentId });
        toast.success('Sub-outcome created');
      }
      setShowSubOutcomeModal(false);
      fetchTree();
    } catch (error) {
      toast.error('Failed to save sub-outcome');
    }
  };

  const handleDeleteSubOutcome = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this sub-outcome and all its KPIs?')) {
      try {
        await api.delete(`/business-outcomes/sub-outcomes/${id}`);
        toast.success('Sub-outcome deleted');
        fetchTree();
      } catch (error) {
        toast.error('Failed to delete sub-outcome');
      }
    }
  };

  const handleAddKPI = (subOutcomeId, e) => {
    e.stopPropagation();
    setEditingItem(null);
    setParentId(subOutcomeId);
    setFormData({ 
      name: '', 
      description: '', 
      current_value: '', 
      target_value: '', 
      baseline_value: '',
      unit: '%',
      direction: 'increase'
    });
    setShowKPIModal(true);
  };

  const handleEditKPI = (kpi, e) => {
    e.stopPropagation();
    setEditingItem(kpi);
    setFormData({ 
      name: kpi.name, 
      description: kpi.description || '', 
      current_value: kpi.current_value ?? '', 
      target_value: kpi.target_value ?? '', 
      baseline_value: kpi.baseline_value ?? '',
      unit: kpi.unit || '%',
      direction: kpi.direction || 'increase'
    });
    setShowKPIModal(true);
  };

  const handleSaveKPI = async () => {
    try {
      const data = {
        ...formData,
        current_value: formData.current_value !== '' ? parseFloat(formData.current_value) : null,
        target_value: formData.target_value !== '' ? parseFloat(formData.target_value) : null,
        baseline_value: formData.baseline_value !== '' ? parseFloat(formData.baseline_value) : null,
      };
      
      if (editingItem) {
        await api.put(`/business-outcomes/kpis/${editingItem.id}`, data);
        toast.success('KPI updated');
      } else {
        await api.post('/business-outcomes/kpis', { ...data, sub_outcome_id: parentId });
        toast.success('KPI created');
      }
      setShowKPIModal(false);
      fetchTree();
    } catch (error) {
      toast.error('Failed to save KPI');
    }
  };

  const handleDeleteKPI = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this KPI?')) {
      try {
        await api.delete(`/business-outcomes/kpis/${id}`);
        toast.success('KPI deleted');
        fetchTree();
      } catch (error) {
        toast.error('Failed to delete KPI');
      }
    }
  };

  const handleViewHistory = async (kpi, e) => {
    e.stopPropagation();
    try {
      const response = await api.get(`/business-outcomes/kpis/${kpi.id}/history`);
      setKpiHistory(response.data);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error('Failed to load history');
    }
  };

  // Prepare chart data from history
  const prepareChartData = (history, kpi) => {
    if (!history || history.length === 0) return [];
    return history
      .slice()
      .reverse()
      .map(entry => ({
        date: new Date(entry.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: entry.value,
      }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="business-outcomes-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-lato-light">
          Category → Sub-Outcomes → KPIs
        </p>
        <Button
          onClick={handleAddCategory}
          size="sm"
          className="text-white rounded-lg font-lato-bold text-xs"
          style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Category
        </Button>
      </div>

      {/* Tree View - Streamlined */}
      <div className="space-y-3">
        {tree.map((category) => {
          const isCatExpanded = expandedCategories[category.id];
          
          // Calculate category progress
          let totalProgress = 0;
          let kpiCount = 0;
          category.sub_outcomes.forEach(sub => {
            sub.kpis.forEach(kpi => {
              totalProgress += kpi.progress_percent;
              kpiCount++;
            });
          });
          const avgProgress = kpiCount > 0 ? totalProgress / kpiCount : 0;

          return (
            <Card key={category.id} className="border border-gray-200 shadow-sm rounded-lg overflow-hidden">
              {/* Category Header - Streamlined */}
              <div
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer"
                data-testid={`category-${category.id}`}
              >
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => toggleCategory(category.id)}
                >
                  {isCatExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-lato-bold text-gray-900">{category.name}</span>
                  <span className="text-xs text-gray-400 font-lato-light">
                    {category.sub_outcomes_count} sub-outcomes
                  </span>
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${getProgressBg(avgProgress)}`} style={{ width: `${avgProgress}%` }} />
                  </div>
                  <span className={`text-xs font-lato-bold ${getProgressColor(avgProgress)}`}>
                    {avgProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleAddSubOutcome(category.id, e)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Add Sub-Outcome"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => handleEditCategory(category, e)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteCategory(category.id, e)}
                    className="p-1 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>

              {/* Sub-Outcomes */}
              {isCatExpanded && (
                <div className="bg-white">
                  {category.sub_outcomes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">No sub-outcomes</div>
                  ) : (
                    category.sub_outcomes.map((subOutcome) => {
                      const isSubExpanded = expandedSubOutcomes[subOutcome.id];
                      const subProgress = subOutcome.kpis.length > 0
                        ? subOutcome.kpis.reduce((sum, kpi) => sum + kpi.progress_percent, 0) / subOutcome.kpis.length
                        : 0;

                      return (
                        <div key={subOutcome.id} className="border-t border-gray-100">
                          {/* Sub-Outcome Row */}
                          <div
                            className="w-full flex items-center justify-between p-2.5 pl-8 hover:bg-gray-50 transition-all cursor-pointer"
                            data-testid={`sub-outcome-${subOutcome.id}`}
                          >
                            <div 
                              className="flex items-center gap-3 flex-1"
                              onClick={() => toggleSubOutcome(subOutcome.id)}
                            >
                              {isSubExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#FE5B1B]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[#FE5B1B]" />
                              )}
                              <span className="text-sm text-gray-700">{subOutcome.name}</span>
                              <span className="text-xs text-gray-400 font-lato-light">
                                {subOutcome.kpis_count} KPIs
                              </span>
                              <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full ${getProgressBg(subProgress)}`} style={{ width: `${subProgress}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleAddKPI(subOutcome.id, e)}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Add KPI"
                              >
                                <Plus className="w-3 h-3 text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => handleEditSubOutcome(subOutcome, e)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Edit2 className="w-3 h-3 text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteSubOutcome(subOutcome.id, e)}
                                className="p-1 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>

                          {/* KPIs */}
                          {isSubExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-2 space-y-2">
                              {subOutcome.kpis.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2 text-center">No KPIs</p>
                              ) : (
                                subOutcome.kpis.map((kpi) => (
                                  <div
                                    key={kpi.id}
                                    className="bg-white rounded border border-gray-100 p-3 hover:shadow-sm transition-all"
                                    data-testid={`kpi-${kpi.id}`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-lato-bold text-gray-800">{kpi.name}</span>
                                        {getTrendIcon(kpi.progress_percent)}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={(e) => handleViewHistory(kpi, e)}
                                          className="p-1 hover:bg-gray-100 rounded"
                                          title="View Trend"
                                        >
                                          <BarChart3 className="w-3 h-3 text-gray-400" />
                                        </button>
                                        <button
                                          onClick={(e) => handleEditKPI(kpi, e)}
                                          className="p-1 hover:bg-gray-100 rounded"
                                        >
                                          <Edit2 className="w-3 h-3 text-gray-400" />
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteKPI(kpi.id, e)}
                                          className="p-1 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                          <span className="text-gray-500">
                                            {formatValue(kpi.current_value, kpi.unit)}
                                          </span>
                                          <span className="text-gray-400">
                                            → {formatValue(kpi.target_value, kpi.unit)}
                                          </span>
                                        </div>
                                        <Progress value={kpi.progress_percent} className="h-1.5" />
                                      </div>
                                      <span className={`text-sm font-lato-bold ${getProgressColor(kpi.progress_percent)}`}>
                                        {kpi.progress_percent.toFixed(0)}%
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {tree.length === 0 && (
        <Card className="border-2 border-dashed border-gray-200 rounded-lg">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">No business outcomes yet</p>
            <Button onClick={handleAddCategory} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add First Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ETO, Quality"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Outcome Modal */}
      <Dialog open={showSubOutcomeModal} onOpenChange={setShowSubOutcomeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Sub-Outcome' : 'Add Sub-Outcome'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Material Readiness"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubOutcomeModal(false)}>Cancel</Button>
            <Button onClick={handleSaveSubOutcome}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Modal */}
      <Dialog open={showKPIModal} onOpenChange={setShowKPIModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit KPI' : 'Add KPI'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Quote Cycle Time"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Current Value</label>
                <Input
                  type="number"
                  value={formData.current_value ?? ''}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Value</label>
                <Input
                  type="number"
                  value={formData.target_value ?? ''}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Baseline Value</label>
                <Input
                  type="number"
                  value={formData.baseline_value ?? ''}
                  onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="%, days, etc."
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Direction</label>
              <Select
                value={formData.direction || 'increase'}
                onValueChange={(value) => setFormData({ ...formData, direction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase (higher is better)</SelectItem>
                  <SelectItem value="decrease">Decrease (lower is better)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKPIModal(false)}>Cancel</Button>
            <Button onClick={handleSaveKPI}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal with Chart */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>KPI Trend: {kpiHistory?.kpi?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {kpiHistory?.history?.length > 0 ? (
              <>
                {/* Trend Chart */}
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareChartData(kpiHistory.history, kpiHistory.kpi)}>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value) => [`${value} ${kpiHistory.kpi?.unit || ''}`, 'Value']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={getChartColor(kpiHistory.kpi?.progress_percent || 0)}
                        strokeWidth={2}
                        dot={{ fill: getChartColor(kpiHistory.kpi?.progress_percent || 0), strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Baseline</p>
                    <p className="font-lato-bold">{kpiHistory.kpi?.baseline_value} {kpiHistory.kpi?.unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Current</p>
                    <p className="font-lato-bold">{kpiHistory.kpi?.current_value} {kpiHistory.kpi?.unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Target</p>
                    <p className="font-lato-bold">{kpiHistory.kpi?.target_value} {kpiHistory.kpi?.unit}</p>
                  </div>
                </div>

                {/* History List */}
                <div className="max-h-32 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiHistory.history.map((entry, i) => (
                        <tr key={entry.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-600">
                            {new Date(entry.recorded_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right font-lato-bold">
                            {entry.value} {kpiHistory.kpi?.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center py-8">No history available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessOutcomes;
