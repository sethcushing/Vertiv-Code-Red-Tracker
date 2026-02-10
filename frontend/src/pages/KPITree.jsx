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
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

const KPITree = () => {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOutcomes, setExpandedOutcomes] = useState({});
  const [expandedInitiatives, setExpandedInitiatives] = useState({});

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const response = await api.get('/kpi-tree');
      setTree(response.data);
      // Expand all outcomes by default
      const expanded = {};
      response.data.forEach(outcome => {
        expanded[outcome.id] = true;
      });
      setExpandedOutcomes(expanded);
    } catch (error) {
      toast.error('Failed to load KPI tree');
    } finally {
      setLoading(false);
    }
  };

  const toggleOutcome = (outcomeId) => {
    setExpandedOutcomes(prev => ({ ...prev, [outcomeId]: !prev[outcomeId] }));
  };

  const toggleInitiative = (initiativeId) => {
    setExpandedInitiatives(prev => ({ ...prev, [initiativeId]: !prev[initiativeId] }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600';
      case 'In Progress': return 'text-blue-600';
      case 'Delayed': return 'text-red-600';
      case 'Implemented': return 'text-green-600';
      case 'Work In Progress': return 'text-yellow-600';
      case 'Frame': return 'text-purple-600';
      case 'Discovery': return 'text-blue-600';
      default: return 'text-gray-500';
    }
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
    <div className="space-y-6" data-testid="kpi-tree-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-gray-900 uppercase tracking-tight">
            KPI Tree View
          </h2>
          <p className="text-sm text-gray-500 font-lato-light mt-1">
            Hierarchical view: Core Business Outcomes → Initiatives → Milestones & Risks
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

      {/* Tree View */}
      <div className="space-y-4">
        {tree.map((outcome) => {
          const isExpanded = expandedOutcomes[outcome.id];
          const progress = outcome.target_value && outcome.current_value 
            ? Math.min(100, (outcome.current_value / outcome.target_value) * 100)
            : 0;

          return (
            <Card key={outcome.id} className="border-0 shadow-lg rounded-xl overflow-hidden">
              {/* Outcome Level (Level 1) */}
              <button
                onClick={() => toggleOutcome(outcome.id)}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-[#FE5B1B]/10 to-[#FE5B1B]/5 border-l-4 border-[#FE5B1B] hover:from-[#FE5B1B]/15 hover:to-[#FE5B1B]/10 transition-all"
                data-testid={`outcome-${outcome.id}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-xl flex items-center justify-center shadow-lg">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-xs text-[#FE5B1B] font-lato-regular uppercase tracking-wider">{outcome.category}</span>
                    <h3 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-tight">
                      {outcome.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-500 font-lato-light">
                        {outcome.current_value ?? '-'} {outcome.unit} → {outcome.target_value ?? '-'} {outcome.unit}
                      </span>
                      <div className="w-24">
                        <Progress value={progress} className="h-1.5" />
                      </div>
                      <span className="text-xs text-gray-400 font-lato-light">
                        {outcome.initiative_count} initiative{outcome.initiative_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-6 h-6 text-[#FE5B1B]" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-[#FE5B1B]" />
                )}
              </button>

              {/* Initiatives Level (Level 2) */}
              {isExpanded && (
                <div className="bg-white">
                  {outcome.initiatives.length === 0 ? (
                    <div className="p-6 pl-20 text-center">
                      <p className="text-gray-400 font-lato-light text-sm">No initiatives aligned to this outcome</p>
                    </div>
                  ) : (
                    outcome.initiatives.map((initiative) => {
                      const isInitExpanded = expandedInitiatives[initiative.id];
                      const completedMilestones = initiative.milestones.filter(m => m.status === 'Completed').length;
                      const escalatedRisks = initiative.risks.filter(r => r.escalation_flag).length;

                      return (
                        <div key={initiative.id} className="border-t border-gray-100">
                          {/* Initiative Row */}
                          <button
                            onClick={() => toggleInitiative(initiative.id)}
                            className="w-full flex items-center justify-between p-4 pl-16 hover:bg-gray-50 transition-all"
                            data-testid={`initiative-${initiative.id}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Layers className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="text-left flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-lato-bold text-gray-900">{initiative.name}</h4>
                                  <span className={`text-xs font-lato-bold uppercase px-2 py-0.5 rounded ${getStatusColor(initiative.status)} bg-opacity-10`}>
                                    {initiative.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 font-lato-light">
                                  <span>{initiative.owner}</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {completedMilestones}/{initiative.milestones.length} milestones
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className={`w-3 h-3 ${escalatedRisks > 0 ? 'text-red-500' : ''}`} />
                                    {initiative.risks.length} risks {escalatedRisks > 0 && `(${escalatedRisks} escalated)`}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${getConfidenceColor(initiative.confidence_score)} flex items-center justify-center`}>
                                <span className="text-white font-lato-bold text-xs">{initiative.confidence_score}</span>
                              </div>
                              {isInitExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {/* Milestones & Risks Level (Level 3) */}
                          {isInitExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100">
                              {/* Milestones */}
                              {initiative.milestones.length > 0 && (
                                <div className="pl-28 pr-6 py-3">
                                  <p className="text-xs font-lato-bold text-gray-500 uppercase tracking-wider mb-2">Milestones</p>
                                  <div className="space-y-2">
                                    {initiative.milestones.map((milestone) => (
                                      <div key={milestone.id} className="flex items-center gap-3 text-sm">
                                        {milestone.status === 'Completed' ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : milestone.status === 'Delayed' ? (
                                          <AlertTriangle className="w-4 h-4 text-red-500" />
                                        ) : (
                                          <Clock className="w-4 h-4 text-gray-400" />
                                        )}
                                        <span className={`font-lato-regular ${milestone.status === 'Completed' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                          {milestone.name}
                                        </span>
                                        <span className="text-gray-400 font-lato-light text-xs">
                                          {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : ''}
                                        </span>
                                        <span className={`text-xs font-lato-bold ${getStatusColor(milestone.status)}`}>
                                          {milestone.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Risks */}
                              {initiative.risks.length > 0 && (
                                <div className="pl-28 pr-6 py-3 border-t border-gray-100">
                                  <p className="text-xs font-lato-bold text-gray-500 uppercase tracking-wider mb-2">Risks</p>
                                  <div className="space-y-2">
                                    {initiative.risks.map((risk) => (
                                      <div key={risk.id} className="flex items-start gap-3 text-sm">
                                        <AlertTriangle className={`w-4 h-4 mt-0.5 ${risk.escalation_flag ? 'text-red-500' : 'text-yellow-500'}`} />
                                        <div className="flex-1">
                                          <span className="font-lato-regular text-gray-700">{risk.description}</span>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-xs font-lato-bold ${risk.impact === 'High' ? 'text-red-600' : risk.impact === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                                              Impact: {risk.impact}
                                            </span>
                                            <span className={`text-xs font-lato-bold ${risk.likelihood === 'High' ? 'text-red-600' : risk.likelihood === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                                              Likelihood: {risk.likelihood}
                                            </span>
                                            {risk.escalation_flag && (
                                              <span className="text-xs font-lato-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                                ESCALATED
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* View Initiative Link */}
                              <div className="pl-28 pr-6 py-3 border-t border-gray-100">
                                <Button
                                  variant="link"
                                  onClick={() => navigate(`/initiatives/${initiative.id}`)}
                                  className="text-[#FE5B1B] p-0 h-auto font-lato-regular"
                                >
                                  View Initiative Details
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              </div>
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
