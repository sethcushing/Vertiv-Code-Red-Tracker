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
  Layers,
  TrendingUp,
  CheckCircle2,
  Clock,
  PlayCircle,
  Pause,
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [fourBlockers, setFourBlockers] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, blockersRes, metricsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/four-blockers'),
        api.get('/enterprise-metrics'),
      ]);
      setStats(statsRes.data);
      setFourBlockers(blockersRes.data);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Not Started': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'Discovery': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Frame': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Work In Progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Implemented': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  // Get top 4 initiatives for four-blocker view
  const topInitiatives = fourBlockers.slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Row 1 - Initiative Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all" data-testid="stat-total">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Total</p>
                <p className="text-2xl font-heading font-bold text-gray-900">{stats.total_initiatives}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-gray-50 hover:shadow-xl transition-all" data-testid="stat-not-started">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <Pause className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-lato-regular uppercase">Not Started</p>
                <p className="text-2xl font-heading font-bold text-gray-700">{stats.not_started_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-blue-50 hover:shadow-xl transition-all" data-testid="stat-discovery">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-lato-regular uppercase">Discovery</p>
                <p className="text-2xl font-heading font-bold text-blue-700">{stats.discovery_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-purple-50 hover:shadow-xl transition-all" data-testid="stat-frame">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-lato-regular uppercase">Frame</p>
                <p className="text-2xl font-heading font-bold text-purple-700">{stats.frame_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-yellow-50 hover:shadow-xl transition-all" data-testid="stat-wip">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-yellow-600 font-lato-regular uppercase">In Progress</p>
                <p className="text-2xl font-heading font-bold text-yellow-700">{stats.wip_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-green-50 hover:shadow-xl transition-all" data-testid="stat-implemented">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-lato-regular uppercase">Implemented</p>
                <p className="text-2xl font-heading font-bold text-green-700">{stats.implemented_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row 2 - Metrics, Milestones, Risks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/enterprise-metrics')} data-testid="stat-metrics">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Enterprise Metrics</p>
                <p className="text-3xl font-heading font-bold text-gray-900 mt-1">{stats.total_metrics}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/milestones')} data-testid="stat-milestones">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Total Milestones</p>
                <p className="text-3xl font-heading font-bold text-gray-900 mt-1">{stats.total_milestones}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/risk-heatmap')} data-testid="stat-risks">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Total Risks</p>
                <p className="text-3xl font-heading font-bold text-gray-900 mt-1">{stats.total_risks}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-red-50 hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/risk-heatmap')} data-testid="stat-escalated">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-500 font-lato-regular uppercase">Escalated Risks</p>
                <p className="text-3xl font-heading font-bold text-red-600 mt-1">{stats.escalated_risks}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Metrics Quick View */}
      {metrics.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
              Enterprise Metrics Overview
            </h2>
            <Link 
              to="/enterprise-metrics"
              className="text-sm text-[#FE5B1B] hover:text-[#E0480E] font-lato-regular flex items-center"
            >
              View All Metrics
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

      {/* Four Blocker View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
            Initiative Overview
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {topInitiatives.map((blocker, index) => (
            <Card 
              key={blocker.initiative_id}
              data-testid={`four-blocker-${index}`}
              className="border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/initiatives/${blocker.initiative_id}`)}
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-lato-bold ${getStatusColor(blocker.status)}`}>
                        {blocker.status}
                      </span>
                      {blocker.metric_names?.length > 0 && (
                        <span className="text-xs text-gray-400 font-lato-light truncate max-w-[150px]">
                          {blocker.metric_names[0]}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-tight line-clamp-2">
                      {blocker.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 font-lato-light">
                      Owner: <span className="font-lato-regular text-gray-700">{blocker.owner || 'Unassigned'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`w-14 h-14 rounded-xl ${getConfidenceColor(blocker.confidence_score)} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-lato-bold text-lg">{blocker.confidence_score}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-lato-light">Confidence</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500 font-lato-light">Milestones</span>
                    <span className="font-lato-bold">{blocker.milestones_completed} / {blocker.milestones_total}</span>
                  </div>
                  <Progress 
                    value={blocker.milestones_total > 0 ? (blocker.milestones_completed / blocker.milestones_total) * 100 : 0} 
                    className="h-2 bg-gray-200"
                  />
                </div>

                {/* Risks */}
                {blocker.top_risks.length > 0 && (
                  <div>
                    <p className="text-xs font-lato-bold text-gray-500 uppercase tracking-wider mb-2">Top Risks</p>
                    <div className="space-y-1">
                      {blocker.top_risks.slice(0, 2).map((risk, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          {risk.escalation ? (
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          )}
                          <span className="text-gray-700 font-lato-light line-clamp-1">{risk.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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
