import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  AlertTriangle,
  Target,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  PlayCircle,
  Pause,
  Users,
  Layers,
} from 'lucide-react';
import KPITree from './KPITree';

const STATUS_CONFIG = {
  'Not Started': { icon: Pause, color: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-400', headerBg: 'bg-gray-200' },
  'Discovery': { icon: Target, color: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-400', headerBg: 'bg-blue-200' },
  'Frame': { icon: Clock, color: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-400', headerBg: 'bg-purple-200' },
  'Work In Progress': { icon: PlayCircle, color: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-400', headerBg: 'bg-yellow-200' },
  'Implemented': { icon: CheckCircle2, color: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-400', headerBg: 'bg-green-200' },
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [initiativesByStatus, setInitiativesByStatus] = useState({});
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, initByStatusRes, metricsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/initiatives-by-status'),
        api.get('/enterprise-metrics'),
      ]);
      setStats(statsRes.data);
      setInitiativesByStatus(initByStatusRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      await api.post('/seed');
      toast.success('Sample data seeded successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to seed data');
    } finally {
      setSeeding(false);
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
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!stats || stats.total_initiatives === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-gray-200 shadow-sm rounded-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-900 uppercase mb-2">
              No Initiatives Found
            </h2>
            <p className="text-gray-600 mb-6 font-lato-light">
              Get started by creating your first initiative or loading sample data.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => navigate('/initiatives/new')}
                data-testid="create-first-initiative-btn"
                className="text-white rounded-xl font-lato-bold uppercase tracking-wide"
                style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
              >
                Create Initiative
              </Button>
              <Button
                onClick={handleSeedData}
                data-testid="seed-data-btn"
                disabled={seeding}
                variant="outline"
                className="rounded-xl font-lato-bold uppercase tracking-wide"
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load Sample Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pipeline statuses (excluding Implemented for the 4-column view)
  const pipelineStatuses = ['Not Started', 'Discovery', 'Frame', 'Work In Progress'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Tree Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
            KPI Tree
          </h2>
          <Link 
            to="/kpi-tree"
            data-testid="view-full-kpi-tree-link"
            className="text-sm text-[#FE5B1B] hover:text-[#E0480E] font-lato-regular flex items-center"
          >
            View Full KPI Tree
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <KPITree embedded={true} />
      </div>

      {/* Code Red Pipeline - 4 Column Layout */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
            Code Red Pipeline
          </h2>
          <Link 
            to="/initiatives"
            data-testid="view-all-initiatives-link"
            className="text-sm text-[#FE5B1B] hover:text-[#E0480E] font-lato-regular flex items-center"
          >
            View All Initiatives
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipelineStatuses.map(status => {
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const statusInitiatives = initiativesByStatus[status] || [];

            return (
              <Card key={status} className={`border-0 shadow-md rounded-xl overflow-hidden`}>
                {/* Status Header */}
                <div className={`flex items-center justify-between p-3 ${config.headerBg} border-b-2 ${config.borderColor}`}>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${config.textColor}`} />
                    <span className={`font-heading font-bold text-sm uppercase tracking-tight ${config.textColor}`}>
                      {status}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-lato-bold bg-white/50 ${config.textColor}`}>
                    {statusInitiatives.length}
                  </span>
                </div>

                {/* Initiatives List */}
                <div className="max-h-[400px] overflow-y-auto">
                  {statusInitiatives.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {statusInitiatives.map(initiative => (
                        <div
                          key={initiative.id}
                          onClick={() => navigate(`/initiatives/${initiative.id}`)}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-all"
                          data-testid={`pipeline-initiative-${initiative.id}`}
                        >
                          <h4 className="font-lato-bold text-sm text-gray-900 line-clamp-2 mb-1">
                            {initiative.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-lato-light mb-2">
                            <Users className="w-3 h-3" />
                            <span className="truncate">{initiative.owner}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-lato-light">
                              <span>{initiative.milestones_completed}/{initiative.milestones_count} done</span>
                              {initiative.risks_count > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-500">
                                  <AlertCircle className="w-3 h-3" />
                                  {initiative.risks_count}
                                </span>
                              )}
                            </div>
                            <div className={`w-6 h-6 rounded ${getConfidenceColor(initiative.confidence_score)} flex items-center justify-center`}>
                              <span className="text-white font-lato-bold text-xs">{initiative.confidence_score}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 font-lato-light text-xs">No initiatives</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/enterprise-metrics')} data-testid="stat-metrics">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Business Outcomes</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_metrics}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/milestones')} data-testid="stat-milestones">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Milestones</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_milestones}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/risk-heatmap')} data-testid="stat-risks">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Total Risks</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_risks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-xl bg-red-50 cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/risk-heatmap')} data-testid="stat-escalated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-red-500 font-lato-regular uppercase">Escalated</p>
                <p className="text-xl font-heading font-bold text-red-600">{stats.escalated_risks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Implemented Initiatives Section */}
      {(initiativesByStatus['Implemented'] || []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
                Implemented
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-lato-bold bg-green-100 text-green-700">
                {(initiativesByStatus['Implemented'] || []).length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(initiativesByStatus['Implemented'] || []).slice(0, 4).map(initiative => (
              <Card 
                key={initiative.id} 
                className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all bg-green-50/50"
                onClick={() => navigate(`/initiatives/${initiative.id}`)}
              >
                <CardContent className="p-4">
                  <h4 className="font-lato-bold text-sm text-gray-900 line-clamp-2 mb-2">
                    {initiative.name}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-lato-light">{initiative.owner}</span>
                    <div className={`w-6 h-6 rounded ${getConfidenceColor(initiative.confidence_score)} flex items-center justify-center`}>
                      <span className="text-white font-lato-bold text-xs">{initiative.confidence_score}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSeedData}
          data-testid="refresh-seed-btn"
          disabled={seeding}
          variant="outline"
          className="rounded-xl"
        >
          {seeding ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Sample Data
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
