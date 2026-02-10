import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  AlertTriangle,
  Target,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Loader2,
  TrendingUp,
  Clock,
  PlayCircle,
  Pause,
  Users,
  Layers,
  FolderKanban,
  Boxes,
  Search,
} from 'lucide-react';

const STATUS_CONFIG = {
  'Not Started': { icon: Pause, color: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-400', headerBg: 'bg-gray-200' },
  'Discovery': { icon: Search, color: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-400', headerBg: 'bg-blue-200' },
  'Frame': { icon: Boxes, color: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-400', headerBg: 'bg-purple-200' },
  'Work In Progress': { icon: PlayCircle, color: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-400', headerBg: 'bg-yellow-200' },
};

const PROJECT_STATUS_COLORS = {
  'Not Started': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-600',
  'Completed': 'bg-green-100 text-green-600',
  'On Hold': 'bg-orange-100 text-orange-600',
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedInitiatives, setExpandedInitiatives] = useState({});
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, pipelineRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/pipeline'),
      ]);
      setStats(statsRes.data);
      setPipeline(pipelineRes.data);
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

  const toggleInitiative = (id) => {
    setExpandedInitiatives(prev => ({ ...prev, [id]: !prev[id] }));
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
  if (!stats || stats.total_strategic_initiatives === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-gray-200 shadow-sm rounded-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-900 uppercase mb-2">
              No Strategic Initiatives Found
            </h2>
            <p className="text-gray-600 mb-6 font-lato-light">
              Get started by creating your first strategic initiative or loading sample data.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleSeedData}
                data-testid="seed-data-btn"
                disabled={seeding}
                className="text-white rounded-xl font-lato-bold uppercase tracking-wide"
                style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
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

  const pipelineStatuses = ['Not Started', 'Discovery', 'Frame', 'Work In Progress'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Code Red Pipeline - 4 Column Layout */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
            Code Red Pipeline
          </h2>
          <Link 
            to="/strategic-initiatives"
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
            const statusInitiatives = pipeline[status] || [];

            return (
              <Card key={status} className="border-0 shadow-md rounded-xl overflow-hidden h-fit">
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

                {/* Strategic Initiatives List */}
                <div className="max-h-[500px] overflow-y-auto">
                  {statusInitiatives.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {statusInitiatives.map(initiative => {
                        const isExpanded = expandedInitiatives[initiative.id];
                        const hasProjects = initiative.projects && initiative.projects.length > 0;

                        return (
                          <div key={initiative.id} className="bg-white">
                            {/* Initiative Card */}
                            <div
                              className={`p-3 hover:bg-gray-50 cursor-pointer transition-all ${hasProjects ? '' : ''}`}
                              onClick={() => hasProjects && toggleInitiative(initiative.id)}
                              data-testid={`pipeline-initiative-${initiative.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {hasProjects && (
                                      isExpanded ? 
                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : 
                                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                    <h4 className="font-lato-bold text-sm text-gray-900">
                                      {initiative.name}
                                    </h4>
                                  </div>
                                  {initiative.executive_sponsor && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 font-lato-light mt-1 ml-6">
                                      <Users className="w-3 h-3" />
                                      <span>{initiative.executive_sponsor}</span>
                                    </div>
                                  )}
                                </div>
                                {hasProjects && (
                                  <span className="text-xs text-gray-400 font-lato-light">
                                    {initiative.projects.length} project{initiative.projects.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Projects (Expanded) */}
                            {isExpanded && hasProjects && (
                              <div className="bg-gray-50 border-t border-gray-100">
                                {initiative.projects.map(project => (
                                  <div
                                    key={project.id}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="p-3 pl-8 hover:bg-gray-100 cursor-pointer transition-all border-b border-gray-100 last:border-b-0"
                                    data-testid={`project-${project.id}`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <FolderKanban className="w-4 h-4 text-gray-400" />
                                          <span className="font-lato-regular text-sm text-gray-700">{project.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-gray-500 font-lato-light">
                                          {project.owner && <span>{project.owner}</span>}
                                          <span>{project.milestones_completed}/{project.milestones_count} milestones</span>
                                          {project.risks_count > 0 && (
                                            <span className="flex items-center gap-0.5 text-amber-500">
                                              <AlertCircle className="w-3 h-3" />
                                              {project.risks_count}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-xs font-lato-bold ${PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {project.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/strategic-initiatives')} data-testid="stat-initiatives">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Initiatives</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_strategic_initiatives}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/projects')} data-testid="stat-projects">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Projects</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_projects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/business-outcomes')} data-testid="stat-outcomes">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Outcomes</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_business_outcomes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/projects')} data-testid="stat-risks">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Risks</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_risks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-xl bg-red-50 cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/projects')} data-testid="stat-escalated">
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
