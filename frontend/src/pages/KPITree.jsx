import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { 
  ChevronRight, 
  ChevronDown, 
  Target, 
  Layers, 
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  PlayCircle,
  ArrowLeft,
  Boxes
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  'Not Started': { icon: Pause, color: 'bg-gray-100', textColor: 'text-gray-600', borderColor: 'border-gray-300' },
  'Discovery': { icon: Target, color: 'bg-blue-100', textColor: 'text-blue-600', borderColor: 'border-blue-300' },
  'Frame': { icon: Clock, color: 'bg-purple-100', textColor: 'text-purple-600', borderColor: 'border-purple-300' },
  'Work In Progress': { icon: PlayCircle, color: 'bg-yellow-100', textColor: 'text-yellow-600', borderColor: 'border-yellow-300' },
  'Implemented': { icon: CheckCircle2, color: 'bg-green-100', textColor: 'text-green-600', borderColor: 'border-green-300' },
};

const KPITree = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedOutcomes, setExpandedOutcomes] = useState({});
  const [expandedStatuses, setExpandedStatuses] = useState({});

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const response = await api.get('/kpi-tree');
      setTree(response.data);
      // Expand all categories by default
      const catExpanded = {};
      const outcomeExpanded = {};
      response.data.forEach(cat => {
        catExpanded[cat.category] = true;
        cat.outcomes.forEach(outcome => {
          outcomeExpanded[outcome.id] = true;
        });
      });
      setExpandedCategories(catExpanded);
      setExpandedOutcomes(outcomeExpanded);
    } catch (error) {
      toast.error('Failed to load KPI tree');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleOutcome = (outcomeId) => {
    setExpandedOutcomes(prev => ({ ...prev, [outcomeId]: !prev[outcomeId] }));
  };

  const toggleStatus = (key) => {
    setExpandedStatuses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getConfidenceColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-4" : "space-y-6"} data-testid="kpi-tree-page">
      {/* Header - only show when not embedded */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-bold text-gray-900 uppercase tracking-tight">
              KPI Tree View
            </h2>
            <p className="text-sm text-gray-500 font-lato-light mt-1">
              Hierarchy: Category → Core Business Outcomes → Initiatives by Status
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/enterprise-metrics')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Outcomes
          </Button>
        </div>
      )}

      {/* Tree View */}
      <div className="space-y-4">
        {tree.map((categoryNode) => {
          const isCatExpanded = expandedCategories[categoryNode.category];

          return (
            <Card key={categoryNode.category} className="border-0 shadow-lg rounded-xl overflow-hidden">
              {/* Category Level (Level 1) */}
              <button
                onClick={() => toggleCategory(categoryNode.category)}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all"
                data-testid={`category-${categoryNode.category}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Boxes className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-xs text-slate-300 font-lato-regular uppercase tracking-wider">Category</span>
                    <h3 className="font-heading font-bold text-xl text-white uppercase tracking-tight">
                      {categoryNode.category_label}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-slate-300 font-lato-light">
                        {categoryNode.outcomes_count} outcome{categoryNode.outcomes_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-slate-400 font-lato-light">
                        {categoryNode.total_initiatives} initiative{categoryNode.total_initiatives !== 1 ? 's' : ''}
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

              {/* Outcomes Level (Level 2) */}
              {isCatExpanded && (
                <div className="bg-white">
                  {categoryNode.outcomes.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-400 font-lato-light text-sm">No outcomes in this category</p>
                    </div>
                  ) : (
                    categoryNode.outcomes.map((outcome) => {
                      const isOutcomeExpanded = expandedOutcomes[outcome.id];
                      const progress = outcome.target_value && outcome.current_value 
                        ? Math.min(100, (outcome.current_value / outcome.target_value) * 100)
                        : 0;

                      return (
                        <div key={outcome.id} className="border-t border-gray-100">
                          {/* Outcome Row */}
                          <button
                            onClick={() => toggleOutcome(outcome.id)}
                            className="w-full flex items-center justify-between p-4 pl-8 hover:bg-orange-50/50 transition-all"
                            data-testid={`outcome-${outcome.id}`}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center shadow">
                                <Target className="w-5 h-5 text-white" />
                              </div>
                              <div className="text-left flex-1">
                                <h4 className="font-lato-bold text-gray-900">{outcome.name}</h4>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-sm text-gray-500 font-lato-light">
                                    {outcome.current_value ?? '-'} / {outcome.target_value ?? '-'} {outcome.unit}
                                  </span>
                                  <div className="w-20">
                                    <Progress value={progress} className="h-1.5" />
                                  </div>
                                  <span className="text-xs text-gray-400 font-lato-light">
                                    {outcome.total_initiatives} initiative{outcome.total_initiatives !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isOutcomeExpanded ? (
                              <ChevronDown className="w-5 h-5 text-[#FE5B1B]" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-[#FE5B1B]" />
                            )}
                          </button>

                          {/* Initiatives by Status Level (Level 3) */}
                          {isOutcomeExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100 pl-16 pr-4 py-3">
                              {Object.keys(outcome.initiatives_by_status).length === 0 ? (
                                <p className="text-gray-400 font-lato-light text-sm py-2">No initiatives aligned</p>
                              ) : (
                                <div className="space-y-2">
                                  {Object.entries(outcome.initiatives_by_status).map(([status, initiatives]) => {
                                    const config = STATUS_CONFIG[status] || STATUS_CONFIG['Not Started'];
                                    const StatusIcon = config.icon;
                                    const statusKey = `${outcome.id}-${status}`;
                                    const isStatusExpanded = expandedStatuses[statusKey] !== false; // Default expanded

                                    return (
                                      <div key={status} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                                        {/* Status Header */}
                                        <button
                                          onClick={() => toggleStatus(statusKey)}
                                          className={`w-full flex items-center justify-between px-3 py-2 ${config.color} hover:opacity-90 transition-all`}
                                          data-testid={`status-${status.toLowerCase().replace(/\s+/g, '-')}-${outcome.id}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <StatusIcon className={`w-4 h-4 ${config.textColor}`} />
                                            <span className={`text-sm font-lato-bold ${config.textColor}`}>
                                              {status}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-lato-bold ${config.color} ${config.textColor}`}>
                                              {initiatives.length}
                                            </span>
                                          </div>
                                          {isStatusExpanded ? (
                                            <ChevronDown className={`w-4 h-4 ${config.textColor}`} />
                                          ) : (
                                            <ChevronRight className={`w-4 h-4 ${config.textColor}`} />
                                          )}
                                        </button>

                                        {/* Initiatives List */}
                                        {isStatusExpanded && (
                                          <div className="divide-y divide-gray-100">
                                            {initiatives.map((init) => (
                                              <div
                                                key={init.id}
                                                onClick={() => navigate(`/initiatives/${init.id}`)}
                                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer transition-all flex items-center justify-between"
                                                data-testid={`init-${init.id}`}
                                              >
                                                <div className="flex items-center gap-3 flex-1">
                                                  <Layers className="w-4 h-4 text-gray-400" />
                                                  <div>
                                                    <span className="font-lato-regular text-sm text-gray-800">{init.name}</span>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 font-lato-light mt-0.5">
                                                      <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {init.owner}
                                                      </span>
                                                      <span>{init.milestones_completed}/{init.milestones_count} milestones</span>
                                                      {init.escalated_risks > 0 && (
                                                        <span className="flex items-center gap-1 text-red-500">
                                                          <AlertTriangle className="w-3 h-3" />
                                                          {init.escalated_risks} escalated
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className={`w-7 h-7 rounded ${getConfidenceColor(init.confidence_score)} flex items-center justify-center`}>
                                                    <span className="text-white font-lato-bold text-xs">{init.confidence_score}</span>
                                                  </div>
                                                  <ChevronRight className="w-4 h-4 text-gray-300" />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
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
              Create business outcomes and align initiatives to see the KPI tree
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KPITree;
