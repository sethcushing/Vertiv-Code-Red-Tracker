import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import {
  AlertTriangle,
  ChevronRight,
  Users,
  Target,
  AlertCircle,
} from 'lucide-react';

const LIFECYCLE_STAGES = [
  { key: 'Request', label: 'Request', color: 'bg-blue-500' },
  { key: 'Solution Design', label: 'Solution Design', color: 'bg-indigo-500' },
  { key: 'Commercials & Pricing', label: 'Commercials', color: 'bg-purple-500' },
  { key: 'Quote / Sales Ops / Approval', label: 'Quote & Approval', color: 'bg-pink-500' },
  { key: 'Order Capture', label: 'Order Capture', color: 'bg-orange-500' },
  { key: 'Availability', label: 'Availability', color: 'bg-amber-500' },
  { key: 'Fulfillment', label: 'Fulfillment', color: 'bg-emerald-500' },
  { key: 'Post-Delivery / Support', label: 'Post-Delivery', color: 'bg-teal-500' },
];

const ProcessPipeline = () => {
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        const response = await api.get('/initiatives');
        setInitiatives(response.data);
      } catch (error) {
        toast.error('Failed to load initiatives');
      } finally {
        setLoading(false);
      }
    };
    fetchInitiatives();
  }, []);

  const getInitiativesByStage = (stageKey) => {
    return initiatives.filter(i => i.lifecycle_stage === stageKey);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Track': return 'border-l-green-500 bg-green-50/50';
      case 'At Risk': return 'border-l-yellow-500 bg-yellow-50/50';
      case 'Off Track': return 'border-l-red-500 bg-red-50/50';
      default: return 'border-l-gray-300 bg-gray-50/50';
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
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="process-pipeline-page">
      {/* Pipeline Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {LIFECYCLE_STAGES.map((stage, index) => (
          <React.Fragment key={stage.key}>
            <div className={`flex-shrink-0 px-4 py-2 rounded-lg text-white text-sm font-semibold ${stage.color}`}>
              {stage.label}
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {getInitiativesByStage(stage.key).length}
              </span>
            </div>
            {index < LIFECYCLE_STAGES.length - 1 && (
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {LIFECYCLE_STAGES.map((stage) => {
          const stageInitiatives = getInitiativesByStage(stage.key);
          
          return (
            <div key={stage.key} className="space-y-3">
              {/* Stage Header */}
              <div className={`p-4 rounded-xl ${stage.color} text-white shadow-lg`}>
                <h3 className="font-heading font-semibold text-sm tracking-wide">
                  {stage.label}
                </h3>
                <p className="text-white/80 text-xs mt-1 font-lato-light">
                  {stageInitiatives.length} initiative{stageInitiatives.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Initiative Cards */}
              <div className="space-y-2 min-h-[200px]">
                {stageInitiatives.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                    <p className="text-gray-400 text-sm font-lato-light">No initiatives</p>
                  </div>
                ) : (
                  stageInitiatives.map((initiative) => {
                    const milestones = initiative.milestones || [];
                    const completed = milestones.filter(m => m.status === 'Completed').length;
                    const risks = initiative.risks || [];
                    const escalatedCount = risks.filter(r => r.escalation_flag).length;
                    const teamCount = (initiative.team_members || []).length;

                    return (
                      <Card
                        key={initiative.id}
                        data-testid={`pipeline-card-${initiative.id}`}
                        className={`border-l-4 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${getStatusColor(initiative.status)}`}
                        onClick={() => navigate(`/initiatives/${initiative.id}`)}
                      >
                        <CardContent className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              {initiative.code_red_flag && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-lato-bold uppercase bg-red-100 text-red-700 mb-1">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Code Red
                                </span>
                              )}
                              <h4 className="font-lato-bold text-sm text-gray-900 line-clamp-2">
                                {initiative.name}
                              </h4>
                            </div>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${getConfidenceColor(initiative.confidence_score)}`}>
                              <span className="text-white text-xs font-lato-bold">{initiative.confidence_score}</span>
                            </div>
                          </div>

                          {/* Owner */}
                          <p className="text-xs text-gray-500 mb-2 truncate font-lato-light">
                            {initiative.initiative_owner || 'Unassigned'}
                          </p>

                          {/* Stats Row */}
                          <div className="flex items-center gap-3 text-xs text-gray-600 font-lato-light">
                            <span className="flex items-center gap-1" title="Milestones">
                              <Target className="w-3 h-3" />
                              <span className="font-lato-bold">{completed}</span>/{milestones.length}
                            </span>
                            <span className="flex items-center gap-1" title="Risks">
                              <AlertCircle className={`w-3 h-3 ${escalatedCount > 0 ? 'text-red-500' : ''}`} />
                              <span className="font-lato-bold">{risks.length}</span>
                              {escalatedCount > 0 && (
                                <span className="text-red-500 font-lato-regular">({escalatedCount})</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1" title="Team Members">
                              <Users className="w-3 h-3" />
                              <span className="font-lato-bold">{teamCount}</span>
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-lato-bold">Status:</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm font-lato-light">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            On Track
          </span>
          <span className="flex items-center gap-1.5 text-sm font-lato-light">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            At Risk
          </span>
          <span className="flex items-center gap-1.5 text-sm font-lato-light">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            Off Track
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProcessPipeline;
