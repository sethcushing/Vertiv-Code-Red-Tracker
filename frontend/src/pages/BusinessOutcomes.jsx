import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  BarChart3,
  Target,
  Layers,
  Activity,
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

const CATEGORY_COLORS = {
  0: { bg: 'bg-gradient-to-br from-orange-500 to-red-600', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
  1: { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  2: { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
  3: { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600' },
  4: { bg: 'bg-gradient-to-br from-amber-500 to-yellow-600', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
};

const BusinessOutcomes = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
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
      // Initialize sub-outcome expansion - collapsed by default
      const subExpanded = {};
      response.data.forEach(cat => {
        cat.sub_outcomes.forEach(sub => {
          subExpanded[sub.id] = false; // Collapsed by default
        });
      });
      setExpandedSubOutcomes(subExpanded);
    } catch (error) {
      toast.error('Failed to load business outcomes');
    } finally {
      setLoading(false);
    }
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

  const getProgressBgLight = (progress) => {
    if (progress >= 70) return 'bg-emerald-100';
    if (progress >= 40) return 'bg-amber-100';
    return 'bg-red-100';
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

  // Calculate category stats
  const getCategoryStats = (category) => {
    let totalProgress = 0;
    let kpiCount = 0;
    let onTrack = 0;
    let atRisk = 0;
    let offTrack = 0;
    
    category.sub_outcomes.forEach(sub => {
      sub.kpis.forEach(kpi => {
        totalProgress += kpi.progress_percent;
        kpiCount++;
        if (kpi.progress_percent >= 70) onTrack++;
        else if (kpi.progress_percent >= 40) atRisk++;
        else offTrack++;
      });
    });
    
    return {
      avgProgress: kpiCount > 0 ? totalProgress / kpiCount : 0,
      kpiCount,
      onTrack,
      atRisk,
      offTrack
    };
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
  const prepareChartData = (history) => {
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
    <div className="space-y-6" data-testid="business-outcomes-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-lato-light">
          Business outcome categories with KPI tracking
        </p>
        <Button
          onClick={handleAddCategory}
          data-testid="add-category-btn"
          size="sm"
          className="text-white rounded-lg font-lato-bold text-xs"
          style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Category
        </Button>
      </div>

      {/* Card-based Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tree.map((category, categoryIndex) => {
          const colorScheme = CATEGORY_COLORS[categoryIndex % 5];
          const stats = getCategoryStats(category);

          return (
            <Card 
              key={category.id} 
              className={`border-0 shadow-md rounded-xl overflow-hidden`}
              data-testid={`category-card-${category.id}`}
            >
              {/* Category Header */}
              <div className={`${colorScheme.bg} p-4 text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-lg uppercase tracking-wide">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-white/80 text-xs mt-1 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => handleAddSubOutcome(category.id, e)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Add Sub-Outcome"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleEditCategory(category, e)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCategory(category.id, e)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Ring */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="white"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(stats.avgProgress / 100) * 176} 176`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{stats.avgProgress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-2xl font-bold">{stats.onTrack}</p>
                      <p className="text-[10px] text-white/70 uppercase">On Track</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-2xl font-bold">{stats.atRisk}</p>
                      <p className="text-[10px] text-white/70 uppercase">At Risk</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-2xl font-bold">{stats.offTrack}</p>
                      <p className="text-[10px] text-white/70 uppercase">Off Track</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Outcomes & KPIs */}
              <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                {category.sub_outcomes.length === 0 ? (
                  <div className="p-6 text-center">
                    <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No sub-outcomes yet</p>
                    <Button
                      onClick={(e) => handleAddSubOutcome(category.id, e)}
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Sub-Outcome
                    </Button>
                  </div>
                ) : (
                  category.sub_outcomes.map((subOutcome) => {
                    const isSubExpanded = expandedSubOutcomes[subOutcome.id];
                    const subProgress = subOutcome.kpis.length > 0
                      ? subOutcome.kpis.reduce((sum, kpi) => sum + kpi.progress_percent, 0) / subOutcome.kpis.length
                      : 0;

                    return (
                      <div key={subOutcome.id} className="border-b border-gray-100 last:border-b-0">
                        {/* Sub-Outcome Row */}
                        <div
                          className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-all cursor-pointer ${colorScheme.light}`}
                          onClick={() => toggleSubOutcome(subOutcome.id)}
                          data-testid={`sub-outcome-${subOutcome.id}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isSubExpanded ? (
                              <ChevronDown className={`w-4 h-4 ${colorScheme.text} flex-shrink-0`} />
                            ) : (
                              <ChevronRight className={`w-4 h-4 ${colorScheme.text} flex-shrink-0`} />
                            )}
                            <span className="text-sm font-lato-bold text-gray-800 truncate">
                              {subOutcome.name}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {subOutcome.kpis_count} KPIs
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getProgressBg(subProgress)}`} 
                                style={{ width: `${subProgress}%` }} 
                              />
                            </div>
                            <span className={`text-xs font-lato-bold w-8 text-right ${getProgressColor(subProgress)}`}>
                              {subProgress.toFixed(0)}%
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddKPI(subOutcome.id, e); }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Add KPI"
                              >
                                <Plus className="w-3 h-3 text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditSubOutcome(subOutcome, e); }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Edit2 className="w-3 h-3 text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSubOutcome(subOutcome.id, e); }}
                                className="p-1 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* KPIs */}
                        {isSubExpanded && (
                          <div className="bg-white px-3 pb-3 space-y-2">
                            {subOutcome.kpis.length === 0 ? (
                              <div className="text-center py-3">
                                <p className="text-xs text-gray-400 mb-2">No KPIs</p>
                                <button
                                  onClick={(e) => handleAddKPI(subOutcome.id, e)}
                                  className={`text-xs ${colorScheme.text} hover:underline`}
                                >
                                  + Add KPI
                                </button>
                              </div>
                            ) : (
                              subOutcome.kpis.map((kpi) => (
                                <div
                                  key={kpi.id}
                                  className={`rounded-lg border ${colorScheme.border} p-3 hover:shadow-sm transition-all`}
                                  data-testid={`kpi-${kpi.id}`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Activity className={`w-3.5 h-3.5 ${colorScheme.text} flex-shrink-0`} />
                                      <span className="text-sm font-lato-bold text-gray-800 truncate">
                                        {kpi.name}
                                      </span>
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
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-gray-600 font-medium">
                                          {formatValue(kpi.current_value, kpi.unit)}
                                        </span>
                                        <span className="text-gray-400">
                                          Target: {formatValue(kpi.target_value, kpi.unit)}
                                        </span>
                                      </div>
                                      <div className={`h-2 rounded-full ${getProgressBgLight(kpi.progress_percent)} overflow-hidden`}>
                                        <div 
                                          className={`h-full ${getProgressBg(kpi.progress_percent)} rounded-full transition-all`}
                                          style={{ width: `${kpi.progress_percent}%` }}
                                        />
                                      </div>
                                    </div>
                                    <span className={`text-lg font-heading font-bold ${getProgressColor(kpi.progress_percent)}`}>
                                      {kpi.progress_percent.toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                            {subOutcome.kpis.length > 0 && (
                              <button
                                onClick={(e) => handleAddKPI(subOutcome.id, e)}
                                className={`w-full text-center py-2 text-xs ${colorScheme.text} hover:bg-gray-50 rounded-lg transition-colors`}
                              >
                                + Add KPI
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tree.length === 0 && (
        <Card className="border-2 border-dashed border-gray-200 rounded-xl">
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-heading font-bold text-gray-700 mb-2">No Business Outcomes Yet</h3>
            <p className="text-gray-500 mb-6 text-sm">Start by creating your first outcome category</p>
            <Button 
              onClick={handleAddCategory} 
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
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
                    <LineChart data={prepareChartData(kpiHistory.history)}>
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
                      {kpiHistory.history.map((entry) => (
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
