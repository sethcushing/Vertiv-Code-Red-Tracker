import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { 
  ChevronRight, 
  ChevronDown, 
  Target, 
  TrendingUp,
  TrendingDown,
  Minus,
  Boxes,
  BarChart3,
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

const BusinessOutcomes = () => {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubOutcomes, setExpandedSubOutcomes] = useState({});

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const response = await api.get('/business-outcomes/tree');
      setTree(response.data);
      // Expand all categories by default
      const catExpanded = {};
      const subExpanded = {};
      response.data.forEach(cat => {
        catExpanded[cat.id] = true;
        cat.sub_outcomes.forEach(sub => {
          subExpanded[sub.id] = true;
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
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (direction, progress) => {
    if (progress >= 80) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (progress >= 50) {
      return <Minus className="w-4 h-4 text-yellow-500" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return '-';
    return `${value}${unit ? ` ${unit}` : ''}`;
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
        <div>
          <h2 className="text-xl font-heading font-bold text-gray-900 uppercase tracking-tight">
            Business Outcomes
          </h2>
          <p className="text-sm text-gray-500 font-lato-light mt-1">
            Track KPIs across categories: Category → Sub-Outcomes → KPIs
          </p>
        </div>
      </div>

      {/* Tree View */}
      <div className="space-y-4">
        {tree.map((category) => {
          const isCatExpanded = expandedCategories[category.id];
          
          // Calculate category-level progress (average of all KPIs)
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
            <Card key={category.id} className="border-0 shadow-lg rounded-xl overflow-hidden">
              {/* Category Level (Level 1) */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all"
                data-testid={`category-${category.id}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Boxes className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-heading font-bold text-xl text-white uppercase tracking-tight">
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-slate-300 font-lato-light">
                        {category.sub_outcomes_count} sub-outcome{category.sub_outcomes_count !== 1 ? 's' : ''}
                      </span>
                      <div className="w-24">
                        <Progress value={avgProgress} className="h-1.5 bg-white/20" />
                      </div>
                      <span className="text-sm text-slate-300 font-lato-light">
                        {avgProgress.toFixed(0)}% progress
                      </span>
                    </div>
                  </div>
                </div>
                {isCatExpanded ? (
                  <ChevronDown className="w-6 h-6 text-white" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Sub-Outcomes Level (Level 2) */}
              {isCatExpanded && (
                <div className="bg-white">
                  {category.sub_outcomes.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-400 font-lato-light text-sm">No sub-outcomes defined</p>
                    </div>
                  ) : (
                    category.sub_outcomes.map((subOutcome) => {
                      const isSubExpanded = expandedSubOutcomes[subOutcome.id];
                      
                      // Calculate sub-outcome progress
                      const subProgress = subOutcome.kpis.length > 0
                        ? subOutcome.kpis.reduce((sum, kpi) => sum + kpi.progress_percent, 0) / subOutcome.kpis.length
                        : 0;

                      return (
                        <div key={subOutcome.id} className="border-t border-gray-100">
                          {/* Sub-Outcome Row */}
                          <button
                            onClick={() => toggleSubOutcome(subOutcome.id)}
                            className="w-full flex items-center justify-between p-4 pl-8 hover:bg-orange-50/50 transition-all"
                            data-testid={`sub-outcome-${subOutcome.id}`}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center shadow">
                                <Target className="w-5 h-5 text-white" />
                              </div>
                              <div className="text-left flex-1">
                                <h4 className="font-lato-bold text-gray-900">{subOutcome.name}</h4>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-gray-500 font-lato-light">
                                    {subOutcome.kpis_count} KPI{subOutcome.kpis_count !== 1 ? 's' : ''}
                                  </span>
                                  <div className="w-20">
                                    <Progress value={subProgress} className="h-1.5" />
                                  </div>
                                  <span className="text-xs text-gray-500 font-lato-light">
                                    {subProgress.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isSubExpanded ? (
                              <ChevronDown className="w-5 h-5 text-[#FE5B1B]" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-[#FE5B1B]" />
                            )}
                          </button>

                          {/* KPIs Level (Level 3) */}
                          {isSubExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100 pl-16 pr-4 py-3">
                              {subOutcome.kpis.length === 0 ? (
                                <p className="text-gray-400 font-lato-light text-sm py-2">No KPIs defined</p>
                              ) : (
                                <div className="space-y-3">
                                  {subOutcome.kpis.map((kpi) => (
                                    <div
                                      key={kpi.id}
                                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                                      data-testid={`kpi-${kpi.id}`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                          <BarChart3 className="w-5 h-5 text-gray-400" />
                                          <div className="flex-1">
                                            <h5 className="font-lato-bold text-gray-800">{kpi.name}</h5>
                                            {kpi.description && (
                                              <p className="text-xs text-gray-500 font-lato-light mt-0.5">{kpi.description}</p>
                                            )}
                                          </div>
                                        </div>
                                        {getTrendIcon(kpi.direction, kpi.progress_percent)}
                                      </div>
                                      
                                      {/* KPI Progress */}
                                      <div className="mt-3">
                                        <div className="flex items-center justify-between text-sm mb-1">
                                          <span className="text-gray-500 font-lato-light">
                                            Current: <span className="font-lato-bold text-gray-700">{formatValue(kpi.current_value, kpi.unit)}</span>
                                          </span>
                                          <span className="text-gray-500 font-lato-light">
                                            Target: <span className="font-lato-bold text-gray-700">{formatValue(kpi.target_value, kpi.unit)}</span>
                                          </span>
                                        </div>
                                        <div className="relative">
                                          <Progress 
                                            value={kpi.progress_percent} 
                                            className={`h-2 ${getProgressColor(kpi.progress_percent)}`}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                          {kpi.baseline_value !== null && kpi.baseline_value !== undefined && (
                                            <span className="text-xs text-gray-400 font-lato-light">
                                              Baseline: {formatValue(kpi.baseline_value, kpi.unit)}
                                            </span>
                                          )}
                                          <span className={`text-xs font-lato-bold ml-auto ${
                                            kpi.progress_percent >= 80 ? 'text-green-600' :
                                            kpi.progress_percent >= 50 ? 'text-yellow-600' : 'text-red-600'
                                          }`}>
                                            {kpi.progress_percent.toFixed(0)}% progress
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
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
        <Card className="border-2 border-dashed border-gray-200 rounded-xl">
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-lato-bold text-gray-600 mb-2">No Business Outcomes</h3>
            <p className="text-sm text-gray-400 font-lato-light">
              Create business outcome categories to start tracking KPIs
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BusinessOutcomes;
