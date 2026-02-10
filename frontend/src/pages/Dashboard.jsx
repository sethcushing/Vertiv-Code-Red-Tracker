import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  AlertTriangle,
  Target,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [fourBlockers, setFourBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, blockersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/four-blockers'),
      ]);
      setStats(statsRes.data);
      setFourBlockers(blockersRes.data);
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Track': return 'text-green-600 bg-green-50 border-green-200';
      case 'At Risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Off Track': return 'text-red-600 bg-red-50 border-red-200';
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
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-sm flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-900 uppercase mb-2">
              No Initiatives Found
            </h2>
            <p className="text-gray-600 mb-6">
              Get started by creating your first initiative or loading sample data.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => navigate('/initiatives/new')}
                data-testid="create-first-initiative-btn"
                className="bg-[#FE5B1B] hover:bg-[#E0480E] text-white rounded-sm font-semibold uppercase tracking-wide"
              >
                Create Initiative
              </Button>
              <Button
                onClick={handleSeedData}
                data-testid="seed-data-btn"
                disabled={seeding}
                variant="outline"
                className="rounded-sm font-semibold uppercase tracking-wide"
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1" data-testid="stat-total-initiatives">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Initiatives</p>
                <p className="text-4xl font-heading font-bold text-gray-900 mt-2">{stats.total_initiatives}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                <Target className="w-7 h-7 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-red-50 to-red-100/60 hover:shadow-xl transition-all duration-300 hover:-translate-y-1" data-testid="stat-code-red">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-500 uppercase tracking-wider">Code Red</p>
                <p className="text-4xl font-heading font-bold text-red-600 mt-2">{stats.code_red_count}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center animate-pulse-code-red">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1" data-testid="stat-at-risk">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">At Risk</p>
                <p className="text-4xl font-heading font-bold text-amber-500 mt-2">{stats.at_risk_count}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1" data-testid="stat-status">
          <CardContent className="p-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">Status Breakdown</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  On Track
                </span>
                <span className="font-bold text-gray-900">{stats.on_track_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  At Risk
                </span>
                <span className="font-bold text-gray-900">{stats.at_risk_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  Off Track
                </span>
                <span className="font-bold text-gray-900">{stats.off_track_count}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Four Blocker View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-bold text-gray-900 uppercase tracking-tight">
            Initiative Four-Blocker Overview
          </h2>
          <Link 
            to="/initiatives"
            data-testid="view-all-initiatives-link"
            className="text-sm text-[#FE5B1B] hover:text-[#E0480E] font-medium flex items-center"
          >
            View All Initiatives
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 bg-gray-100 rounded-3xl overflow-hidden shadow-xl">
          {topInitiatives.map((blocker, index) => (
            <div 
              key={blocker.initiative_id}
              data-testid={`four-blocker-${index}`}
              className="bg-white p-7 min-h-[260px] hover:bg-gradient-to-br hover:from-white hover:to-orange-50/30 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate(`/initiatives/${blocker.initiative_id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {blocker.code_red && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-red-100 to-red-50 text-red-800 shadow-sm animate-pulse-code-red">
                        Code Red
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm ${getStatusColor(blocker.status)}`}>
                      {blocker.status}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-tight line-clamp-2">
                    {blocker.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Owner: <span className="font-medium text-gray-700">{blocker.owner || 'Unassigned'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className={`w-14 h-14 rounded-lg ${getConfidenceColor(blocker.confidence_score)} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-lg">{blocker.confidence_score}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Confidence</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Milestones</span>
                  <span className="font-medium">{blocker.milestones_completed} / {blocker.milestones_total}</span>
                </div>
                <Progress 
                  value={blocker.milestones_total > 0 ? (blocker.milestones_completed / blocker.milestones_total) * 100 : 0} 
                  className="h-2 bg-gray-200"
                />
              </div>

              {/* Risks */}
              {blocker.top_risks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Risks</p>
                  <div className="space-y-1">
                    {blocker.top_risks.slice(0, 2).map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {risk.escalation ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-gray-700 line-clamp-1">{risk.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
          className="rounded-sm"
        >
          {seeding ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
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
