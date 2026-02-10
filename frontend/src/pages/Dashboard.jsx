import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Target,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
  TrendingUp,
  Clock,
  PlayCircle,
  Pause,
  Users,
  Layers,
  FolderKanban,
  Search,
  GripVertical,
  Plus,
} from 'lucide-react';

const STATUS_CONFIG = {
  'Not Started': { icon: Pause, color: 'bg-slate-50', textColor: 'text-slate-700', borderColor: 'border-slate-300', headerBg: 'bg-slate-100' },
  'Discovery': { icon: Search, color: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-300', headerBg: 'bg-blue-100' },
  'Frame': { icon: Clock, color: 'bg-violet-50', textColor: 'text-violet-700', borderColor: 'border-violet-300', headerBg: 'bg-violet-100' },
  'Work In Progress': { icon: PlayCircle, color: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-300', headerBg: 'bg-amber-100' },
};

const PROJECT_STATUS_COLORS = {
  'Not Started': 'bg-slate-100 text-slate-600',
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

  const toggleInitiative = (id, e) => {
    e.stopPropagation();
    setExpandedInitiatives(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

    // Optimistic update
    const newPipeline = { ...pipeline };
    const initiative = newPipeline[oldStatus].find(i => i.id === draggableId);
    
    if (initiative) {
      newPipeline[oldStatus] = newPipeline[oldStatus].filter(i => i.id !== draggableId);
      newPipeline[newStatus] = [...(newPipeline[newStatus] || [])];
      newPipeline[newStatus].splice(destination.index, 0, initiative);
      setPipeline(newPipeline);

      try {
        await api.put(`/pipeline/move/${draggableId}?new_status=${encodeURIComponent(newStatus)}`);
        toast.success(`Moved to ${newStatus}`);
      } catch (error) {
        toast.error('Failed to update status');
        fetchData(); // Revert on error
      }
    }
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
              Get started by loading sample data.
            </p>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const pipelineStatuses = ['Not Started', 'Discovery', 'Frame', 'Work In Progress'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Code Red Pipeline - Drag & Drop */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
            Code Red Pipeline
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-lato-light">Drag to move</span>
            <Button
              onClick={() => navigate('/strategic-initiatives/new')}
              data-testid="add-initiative-btn"
              size="sm"
              className="text-white rounded-lg font-lato-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Initiative
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pipelineStatuses.map(status => {
              const config = STATUS_CONFIG[status];
              const StatusIcon = config.icon;
              const statusInitiatives = pipeline[status] || [];

              return (
                <Droppable key={status} droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`rounded-xl overflow-hidden border ${config.borderColor} transition-all ${
                        snapshot.isDraggingOver ? 'ring-2 ring-[#FE5B1B] ring-opacity-50' : ''
                      }`}
                    >
                      {/* Status Header */}
                      <div className={`flex items-center justify-between px-3 py-2.5 ${config.headerBg} border-b ${config.borderColor}`}>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${config.textColor}`} />
                          <span className={`font-lato-bold text-sm ${config.textColor}`}>
                            {status}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-lato-bold bg-white/80 ${config.textColor}`}>
                          {statusInitiatives.length}
                        </span>
                      </div>

                      {/* Initiatives List */}
                      <div className={`min-h-[200px] max-h-[500px] overflow-y-auto ${config.color}`}>
                        {statusInitiatives.length > 0 ? (
                          <div className="p-2 space-y-2">
                            {statusInitiatives.map((initiative, index) => {
                              const isExpanded = expandedInitiatives[initiative.id];
                              const hasProjects = initiative.projects && initiative.projects.length > 0;

                              return (
                                <Draggable key={initiative.id} draggableId={initiative.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`bg-white rounded-lg border border-gray-100 shadow-sm transition-all ${
                                        snapshot.isDragging ? 'shadow-lg ring-2 ring-[#FE5B1B]' : 'hover:shadow-md'
                                      }`}
                                      data-testid={`pipeline-initiative-${initiative.id}`}
                                    >
                                      {/* Initiative Header */}
                                      <div className="p-3 flex items-start gap-2">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="mt-0.5 cursor-grab active:cursor-grabbing"
                                        >
                                          <GripVertical className="w-4 h-4 text-gray-300" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div 
                                            className="flex items-center gap-2 cursor-pointer"
                                            onClick={(e) => hasProjects && toggleInitiative(initiative.id, e)}
                                          >
                                            {hasProjects && (
                                              isExpanded ? 
                                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : 
                                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            )}
                                            <h4 className="font-lato-bold text-sm text-gray-900 truncate">
                                              {initiative.name}
                                            </h4>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            {initiative.executive_sponsor && (
                                              <span className="text-xs text-gray-500 font-lato-light flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {initiative.executive_sponsor}
                                              </span>
                                            )}
                                            {hasProjects && (
                                              <span className="text-xs text-gray-400 font-lato-light">
                                                {initiative.projects.length} project{initiative.projects.length !== 1 ? 's' : ''}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Projects (Expanded) */}
                                      {isExpanded && hasProjects && (
                                        <div className="border-t border-gray-100 bg-gray-50/50">
                                          {initiative.projects.map(project => (
                                            <div
                                              key={project.id}
                                              onClick={() => navigate(`/projects/${project.id}`)}
                                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer transition-all border-b border-gray-100 last:border-b-0"
                                              data-testid={`project-${project.id}`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <FolderKanban className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                  <span className="text-xs text-gray-700 truncate">{project.name}</span>
                                                </div>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-lato-bold ${PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>
                                                  {project.status}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 ml-5 text-[10px] text-gray-400 font-lato-light">
                                                <span>{project.milestones_completed}/{project.milestones_count} done</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        ) : (
                          <div className="p-6 text-center">
                            <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-400 font-lato-light text-xs">Drop here</p>
                            {provided.placeholder}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/strategic-initiatives')} data-testid="stat-initiatives">
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

        <Card className="border-0 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/projects')} data-testid="stat-projects">
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

        <Card className="border-0 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/business-outcomes')} data-testid="stat-outcomes">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Outcomes</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_business_outcomes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/business-outcomes')} data-testid="stat-kpis">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">KPIs</p>
                <p className="text-xl font-heading font-bold text-gray-900">{stats.total_kpis}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSeedData}
          data-testid="refresh-seed-btn"
          disabled={seeding}
          variant="outline"
          size="sm"
          className="rounded-lg text-xs"
        >
          {seeding ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Reset Data
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
