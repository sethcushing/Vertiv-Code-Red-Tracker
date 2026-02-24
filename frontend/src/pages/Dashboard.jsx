import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  FolderKanban,
  Search,
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const STATUS_CONFIG = {
  'Not Started': { 
    icon: Pause, 
    gradient: 'from-slate-500/20 to-slate-600/30',
    headerGradient: 'from-slate-600 to-slate-700',
    textColor: 'text-slate-100',
    accentColor: 'text-slate-300',
    glowColor: 'shadow-slate-500/20'
  },
  'Discovery': { 
    icon: Search, 
    gradient: 'from-blue-500/20 to-indigo-600/30',
    headerGradient: 'from-blue-600 to-indigo-700',
    textColor: 'text-blue-100',
    accentColor: 'text-blue-300',
    glowColor: 'shadow-blue-500/20'
  },
  'Frame': { 
    icon: Clock, 
    gradient: 'from-violet-500/20 to-purple-600/30',
    headerGradient: 'from-violet-600 to-purple-700',
    textColor: 'text-violet-100',
    accentColor: 'text-violet-300',
    glowColor: 'shadow-violet-500/20'
  },
  'Work In Progress': { 
    icon: PlayCircle, 
    gradient: 'from-amber-500/20 to-orange-600/30',
    headerGradient: 'from-amber-600 to-orange-700',
    textColor: 'text-amber-100',
    accentColor: 'text-amber-300',
    glowColor: 'shadow-amber-500/20'
  },
};

const PROJECT_STATUS_COLORS = {
  'Not Started': 'bg-slate-500/20 text-slate-200 border-slate-400/30',
  'In Progress': 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  'Completed': 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
  'On Hold': 'bg-orange-500/20 text-orange-200 border-orange-400/30',
};

const RAG_CONFIG = {
  'Red': { color: 'bg-red-500', glow: 'shadow-red-500/50' },
  'Amber': { color: 'bg-amber-500', glow: 'shadow-amber-500/50' },
  'Green': { color: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [collapsedInitiatives, setCollapsedInitiatives] = useState({});
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [parentInitiativeId, setParentInitiativeId] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    owner: '',
    status: 'Not Started',
    business_outcome_ids: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, pipelineRes, catRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/pipeline'),
        api.get('/business-outcomes/categories'),
      ]);
      setStats(statsRes.data);
      setPipeline(pipelineRes.data);
      setCategories(catRes.data);
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
    setCollapsedInitiatives(prev => ({ ...prev, [id]: !prev[id] }));
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
        fetchData();
      }
    }
  };

  // Project CRUD
  const handleAddProject = (initiativeId, e) => {
    e.stopPropagation();
    setEditingProject(null);
    setParentInitiativeId(initiativeId);
    setProjectForm({
      name: '',
      description: '',
      owner: '',
      status: 'Not Started',
      business_outcome_ids: [],
    });
    setShowProjectModal(true);
  };

  const handleEditProject = async (projectId, e) => {
    e.stopPropagation();
    try {
      const response = await api.get(`/projects/${projectId}`);
      const project = response.data;
      setEditingProject(project);
      setParentInitiativeId(project.strategic_initiative_id);
      setProjectForm({
        name: project.name,
        description: project.description || '',
        owner: project.owner || '',
        status: project.status,
        business_outcome_ids: project.business_outcome_ids || [],
      });
      setShowProjectModal(true);
    } catch (error) {
      toast.error('Failed to load project');
    }
  };

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, projectForm);
        toast.success('Project updated');
      } else {
        await api.post('/projects', { 
          ...projectForm, 
          strategic_initiative_id: parentInitiativeId 
        });
        toast.success('Project created');
      }
      setShowProjectModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save project');
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this project?')) {
      try {
        await api.delete(`/projects/${projectId}`);
        toast.success('Project deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  const toggleOutcomeLink = (categoryId) => {
    const current = projectForm.business_outcome_ids || [];
    const updated = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    setProjectForm({ ...projectForm, business_outcome_ids: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-light">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_strategic_initiatives === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FE5B1B]/5 to-purple-500/5 rounded-3xl"></div>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#FE5B1B]/30">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              No Strategic Initiatives Found
            </h2>
            <p className="text-gray-500 mb-8">
              Get started by loading sample data to explore the pipeline.
            </p>
            <Button
              onClick={handleSeedData}
              data-testid="seed-data-btn"
              disabled={seeding}
              className="text-white rounded-xl px-8 py-3 text-base font-semibold shadow-lg shadow-[#FE5B1B]/30 hover:shadow-xl hover:shadow-[#FE5B1B]/40 transition-all"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
              {seeding ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Load Sample Data
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pipelineStatuses = ['Not Started', 'Discovery', 'Frame', 'Work In Progress'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pipeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Drag initiatives to move between stages</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              onClick={() => navigate('/strategic-initiatives/new')}
              data-testid="add-initiative-btn"
              size="sm"
              className="text-white rounded-xl font-semibold shadow-lg shadow-[#FE5B1B]/25 hover:shadow-xl hover:shadow-[#FE5B1B]/35 transition-all"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Initiative
            </Button>
          )}
        </div>
      </div>

      {/* Code Red Pipeline - Glassmorphism Style */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                    className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                      snapshot.isDraggingOver 
                        ? 'ring-2 ring-[#FE5B1B] ring-opacity-60 scale-[1.02]' 
                        : ''
                    }`}
                    style={{
                      background: 'linear-gradient(180deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.98) 100%)',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                  >
                    {/* Status Header - Glassmorphic */}
                    <div 
                      className={`flex items-center justify-between px-4 py-3 backdrop-blur-sm border-b border-white/10`}
                      style={{
                        background: `linear-gradient(135deg, ${config.headerGradient.split(' ')[0].replace('from-', '')} 0%, ${config.headerGradient.split(' ')[1].replace('to-', '')} 100%)`.replace('slate-600', '#475569').replace('slate-700', '#334155').replace('blue-600', '#2563eb').replace('indigo-700', '#4338ca').replace('violet-600', '#7c3aed').replace('purple-700', '#7e22ce').replace('amber-600', '#d97706').replace('orange-700', '#c2410c')
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                          <StatusIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm text-white tracking-wide">
                          {status}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/20 backdrop-blur-sm text-white">
                        {statusInitiatives.length}
                      </span>
                    </div>

                    {/* Initiatives List */}
                    <div className="min-h-[450px] max-h-[600px] overflow-y-auto p-3 space-y-3">
                      {statusInitiatives.length > 0 ? (
                        <>
                          {statusInitiatives.map((initiative, index) => {
                            const isCollapsed = collapsedInitiatives[initiative.id];
                            const hasProjects = initiative.projects && initiative.projects.length > 0;
                            const ragConfig = RAG_CONFIG[initiative.rag_status || 'Green'];

                            return (
                              <Draggable key={initiative.id} draggableId={initiative.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`rounded-xl overflow-hidden transition-all duration-200 ${
                                      snapshot.isDragging 
                                        ? 'shadow-2xl ring-2 ring-[#FE5B1B] scale-105' 
                                        : 'hover:scale-[1.02]'
                                    }`}
                                    style={{
                                      ...provided.draggableProps.style,
                                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                      backdropFilter: 'blur(10px)',
                                      border: '1px solid rgba(255,255,255,0.15)',
                                    }}
                                    data-testid={`pipeline-initiative-${initiative.id}`}
                                  >
                                    {/* Initiative Header */}
                                    <div className="p-3 flex items-start gap-2">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors"
                                      >
                                        <GripVertical className="w-4 h-4 text-white/40" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div 
                                          className="flex items-center gap-2 cursor-pointer group"
                                          onClick={(e) => toggleInitiative(initiative.id, e)}
                                        >
                                          <div className="p-0.5 rounded hover:bg-white/10 transition-colors">
                                            {isCollapsed ? 
                                              <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white/80" /> : 
                                              <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white/80" />
                                            }
                                          </div>
                                          {/* RAG Status Indicator with Glow */}
                                          <div 
                                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ragConfig.color} shadow-lg ${ragConfig.glow}`}
                                            title={`RAG: ${initiative.rag_status || 'Green'}`}
                                          />
                                          <h4 
                                            className="font-semibold text-sm text-white truncate hover:text-[#FE5B1B] cursor-pointer transition-colors"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/strategic-initiatives/${initiative.id}`); }}
                                          >
                                            {initiative.name}
                                          </h4>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 ml-7">
                                          {initiative.executive_sponsor && (
                                            <span className="text-xs text-white/50 flex items-center gap-1">
                                              <Users className="w-3 h-3" />
                                              {initiative.executive_sponsor}
                                            </span>
                                          )}
                                          <span className="text-xs text-white/40">
                                            {initiative.projects?.length || 0} projects
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Projects - Expanded by Default */}
                                    {!isCollapsed && (
                                      <div className="border-t border-white/10 bg-black/20">
                                        {/* Add Project Button */}
                                        <div className="px-3 py-2 border-b border-white/5">
                                          <button
                                            onClick={(e) => handleAddProject(initiative.id, e)}
                                            className="flex items-center gap-1.5 text-xs text-[#FE5B1B] hover:text-[#ff7a45] font-semibold transition-colors"
                                            data-testid={`add-project-${initiative.id}`}
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Project
                                          </button>
                                        </div>
                                        
                                        {hasProjects ? (
                                          <div className="p-2 space-y-1.5">
                                            {initiative.projects.map(project => {
                                              const projectRag = RAG_CONFIG[project.rag_status || 'Green'];
                                              return (
                                                <div
                                                  key={project.id}
                                                  className="px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all group border border-transparent hover:border-white/10"
                                                  onClick={() => navigate(`/projects/${project.id}`)}
                                                  data-testid={`project-${project.id}`}
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                      {/* Project RAG Status */}
                                                      <div 
                                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${projectRag.color} shadow-sm ${projectRag.glow}`}
                                                        title={`RAG: ${project.rag_status || 'Green'}`}
                                                      />
                                                      <FolderKanban className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                                                      <span className="text-xs text-white/80 truncate font-medium">{project.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                          onClick={(e) => handleEditProject(project.id, e)}
                                                          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                                          title="Edit"
                                                        >
                                                          <Edit2 className="w-3 h-3 text-white/50 hover:text-white" />
                                                        </button>
                                                        <button
                                                          onClick={(e) => handleDeleteProject(project.id, e)}
                                                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                                                          title="Delete"
                                                        >
                                                          <Trash2 className="w-3 h-3 text-white/50 hover:text-red-400" />
                                                        </button>
                                                      </div>
                                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${PROJECT_STATUS_COLORS[project.status] || 'bg-white/10 text-white/60 border-white/20'}`}>
                                                        {project.status}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3 mt-1.5 ml-6 text-[10px] text-white/40">
                                                    {project.owner && <span>{project.owner}</span>}
                                                    <span className="flex items-center gap-1">
                                                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div 
                                                          className="h-full bg-emerald-500 rounded-full transition-all"
                                                          style={{ width: `${(project.milestones_completed / Math.max(project.milestones_count, 1)) * 100}%` }}
                                                        />
                                                      </div>
                                                      {project.milestones_completed}/{project.milestones_count}
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="px-3 py-4 text-center text-xs text-white/30">
                                            No projects yet
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                          <div className="p-4 bg-white/5 rounded-2xl mb-3">
                            <FolderKanban className="w-8 h-8 text-white/20" />
                          </div>
                          <p className="text-white/30 text-sm">Drop initiatives here</p>
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

      {/* Project Modal - Glassmorphic Style */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-white/70">Name *</label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Project name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#FE5B1B] focus:ring-[#FE5B1B]/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">Description</label>
              <Input
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Brief description"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#FE5B1B]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white/70">Owner</label>
                <Input
                  value={projectForm.owner}
                  onChange={(e) => setProjectForm({ ...projectForm, owner: e.target.value })}
                  placeholder="Project owner"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#FE5B1B]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70">Status</label>
                <Select
                  value={projectForm.status}
                  onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="Not Started" className="text-white hover:bg-white/10">Not Started</SelectItem>
                    <SelectItem value="In Progress" className="text-white hover:bg-white/10">In Progress</SelectItem>
                    <SelectItem value="Completed" className="text-white hover:bg-white/10">Completed</SelectItem>
                    <SelectItem value="On Hold" className="text-white hover:bg-white/10">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {categories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-white/70">Align to Business Outcomes</label>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {categories.map(cat => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(projectForm.business_outcome_ids || []).includes(cat.id)}
                        onChange={() => toggleOutcomeLink(cat.id)}
                        className="w-4 h-4 rounded border-white/30 bg-white/10 text-[#FE5B1B] focus:ring-[#FE5B1B]/20"
                      />
                      <span className="text-white/80">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowProjectModal(false)}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProject}
              className="text-white shadow-lg shadow-[#FE5B1B]/25"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
              {editingProject ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
