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
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  TrendingUp,
  CheckCircle2,
  Clock,
  PlayCircle,
  Pause,
  Users,
} from 'lucide-react';

const STATUS_CONFIG = {
  'Not Started': { icon: Pause, color: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-300' },
  'Discovery': { icon: Target, color: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-300' },
  'Frame': { icon: Clock, color: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-300' },
  'Work In Progress': { icon: PlayCircle, color: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-300' },
  'Implemented': { icon: CheckCircle2, color: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-300' },
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [initiativesByStatus, setInitiativesByStatus] = useState({});
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedStatuses, setExpandedStatuses] = useState({
    'Not Started': true,
    'Discovery': true,
    'Frame': true,
    'Work In Progress': true,
    'Implemented': true,
  });
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

  const toggleStatus = (status) => {
    setExpandedStatuses(prev => ({ ...prev, [status]: !prev[status] }));
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

  const statuses = ['Not Started', 'Discovery', 'Frame', 'Work In Progress', 'Implemented'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Initiatives by Status - Main Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
            Initiatives by Status
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

        <div className="space-y-3">
          {statuses.map(status => {
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const statusInitiatives = initiativesByStatus[status] || [];
            const isExpanded = expandedStatuses[status];

            return (
              <Card key={status} className={`border-0 shadow-md rounded-xl overflow-hidden`}>
                {/* Status Header */}
                <button
                  onClick={() => toggleStatus(status)}
                  className={`w-full flex items-center justify-between p-4 ${config.color} border-l-4 ${config.borderColor} hover:opacity-90 transition-all`}
                  data-testid={`status-header-${status.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${config.textColor}`} />
                    <span className={`font-heading font-bold uppercase tracking-tight ${config.textColor}`}>
                      {status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-lato-bold ${config.color} ${config.textColor}`}>
                      {statusInitiatives.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className={`w-5 h-5 ${config.textColor}`} />
                  ) : (
                    <ChevronRight className={`w-5 h-5 ${config.textColor}`} />
                  )}
                </button>

                {/* Initiatives List */}
                {isExpanded && statusInitiatives.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {statusInitiatives.map(initiative => (
                      <div
                        key={initiative.id}
                        onClick={() => navigate(`/initiatives/${initiative.id}`)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-all flex items-center justify-between"
                        data-testid={`initiative-row-${initiative.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-lato-bold text-gray-900">{initiative.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 font-lato-light">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {initiative.owner}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {initiative.milestones_completed}/{initiative.milestones_count} milestones
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {initiative.risks_count} risks
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg ${getConfidenceColor(initiative.confidence_score)} flex items-center justify-center`}>
                            <span className="text-white font-lato-bold text-sm">{initiative.confidence_score}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && statusInitiatives.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-gray-400 font-lato-light text-sm">No initiatives in this status</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Core Business Outcomes Quick View */}
      {metrics.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
              Core Business Outcomes
            </h2>
            <Link 
              to="/enterprise-metrics"
              className="text-sm text-[#FE5B1B] hover:text-[#E0480E] font-lato-regular flex items-center"
            >
              View All Outcomes
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.slice(0, 6).map((metric) => {
              const progress = metric.target_value && metric.current_value 
                ? Math.min(100, (metric.current_value / metric.target_value) * 100)
                : 0;
              return (
                <Card key={metric.id} className="border-0 shadow-md rounded-xl hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(`/enterprise-metrics/${metric.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 font-lato-light uppercase">{metric.category}</span>
                      <span className="text-xs text-gray-400 font-lato-light">{metric.initiative_count} initiatives</span>
                    </div>
                    <p className="font-lato-bold text-gray-900 mb-2 line-clamp-1">{metric.name}</p>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500 font-lato-light">{metric.current_value ?? '-'} {metric.unit}</span>
                      <span className="font-lato-bold">{metric.target_value ?? '-'} {metric.unit}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
