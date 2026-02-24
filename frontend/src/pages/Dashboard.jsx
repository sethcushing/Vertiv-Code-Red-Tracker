import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Target,
  ChevronRight,
  ChevronDown,
  Loader2,
  Clock,
  PlayCircle,
  Pause,
  Users,
  FolderKanban,
  Search,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  TrendingUp,
  MoreHorizontal,
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
    color: 'bg-slate-500',
    lightBg: 'bg-slate-500/10',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  'Discovery': { 
    icon: Search, 
    color: 'bg-blue-500',
    lightBg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  'Frame': { 
    icon: Clock, 
    color: 'bg-violet-500',
    lightBg: 'bg-violet-500/10',
    text: 'text-violet-600',
    border: 'border-violet-200',
  },
  'Work In Progress': { 
    icon: PlayCircle, 
    color: 'bg-amber-500',
    lightBg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-200',
  },
};

const PROJECT_STATUS_CONFIG = {
  'Not Started': { color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'In Progress': { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Completed': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'On Hold': { color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const RAG_CONFIG = {
  'Red': { color: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-200', label: 'At Risk' },
  'Amber': { color: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200', label: 'Needs Attention' },
  'Green': { color: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', label: 'On Track' },
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedInitiatives, setExpandedInitiatives] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRag, setFilterRag] = useState('all');
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
      
      // Flatten pipeline data into a list of initiatives
      const allInitiatives = [];
      Object.entries(pipelineRes.data).forEach(([status, items]) => {
        items.forEach(item => {
          allInitiatives.push({ ...item, status });
        });
      });
      setInitiatives(allInitiatives);
      setCategories(catRes.data);
      
      // Expand all by default
      const expanded = {};
      allInitiatives.forEach(init => {
        expanded[init.id] = true;
      });
      setExpandedInitiatives(expanded);
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

  // Filter initiatives
  const filteredInitiatives = initiatives.filter(init => {
    if (filterStatus !== 'all' && init.status !== filterStatus) return false;
    if (filterRag !== 'all' && init.rag_status !== filterRag) return false;
    return true;
  });

  // Group by status for summary
  const statusCounts = initiatives.reduce((acc, init) => {
    acc[init.status] = (acc[init.status] || 0) + 1;
    return acc;
  }, {});

  const ragCounts = initiatives.reduce((acc, init) => {
    const rag = init.rag_status || 'Green';
    acc[rag] = (acc[rag] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-light">Loading initiatives...</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_strategic_initiatives === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="relative bg-white rounded-2xl p-12 text-center shadow-xl border border-gray-100">
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
            className="text-white rounded-xl px-8 py-3 text-base font-semibold shadow-lg shadow-[#FE5B1B]/30"
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
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Status Counts */}
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const StatusIcon = config.icon;
          const count = statusCounts[status] || 0;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
              className={`p-3 rounded-xl border transition-all ${
                filterStatus === status 
                  ? `${config.lightBg} ${config.border} ring-2 ring-offset-1 ring-${config.color.replace('bg-', '')}`
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${config.lightBg}`}>
                  <StatusIcon className={`w-4 h-4 ${config.text}`} />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                  <p className="text-[10px] text-gray-500 truncate">{status}</p>
                </div>
              </div>
            </button>
          );
        })}
        
        {/* RAG Summary */}
        {Object.entries(RAG_CONFIG).map(([rag, config]) => {
          const count = ragCounts[rag] || 0;
          return (
            <button
              key={rag}
              onClick={() => setFilterRag(filterRag === rag ? 'all' : rag)}
              className={`p-3 rounded-xl border transition-all ${
                filterRag === rag 
                  ? `${config.light} ${config.border} ring-2 ring-offset-1`
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                <div className="text-left">
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                  <p className="text-[10px] text-gray-500">{rag}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Showing {filteredInitiatives.length} of {initiatives.length} initiatives
          </span>
          {(filterStatus !== 'all' || filterRag !== 'all') && (
            <button
              onClick={() => { setFilterStatus('all'); setFilterRag('all'); }}
              className="text-xs text-[#FE5B1B] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={() => navigate('/strategic-initiatives/new')}
            data-testid="add-initiative-btn"
            size="sm"
            className="text-white rounded-xl font-semibold shadow-lg shadow-[#FE5B1B]/25"
            style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Initiative
          </Button>
        )}
      </div>

      {/* Initiatives List */}
      <div className="space-y-4">
        {filteredInitiatives.map((initiative) => {
          const isExpanded = expandedInitiatives[initiative.id];
          const statusConfig = STATUS_CONFIG[initiative.status] || STATUS_CONFIG['Not Started'];
          const StatusIcon = statusConfig.icon;
          const ragConfig = RAG_CONFIG[initiative.rag_status || 'Green'];
          const hasProjects = initiative.projects && initiative.projects.length > 0;
          const projectCount = initiative.projects?.length || 0;
          const completedProjects = initiative.projects?.filter(p => p.status === 'Completed').length || 0;

          return (
            <div
              key={initiative.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
              data-testid={`initiative-card-${initiative.id}`}
            >
              {/* Initiative Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => toggleInitiative(initiative.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Expand/Collapse & RAG */}
                  <div className="flex items-center gap-2 pt-1">
                    <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                      {isExpanded ? 
                        <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      }
                    </button>
                    <div 
                      className={`w-3 h-3 rounded-full ${ragConfig.color} shadow-sm`}
                      title={ragConfig.label}
                    />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title Row */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 
                            className="text-lg font-bold text-gray-900 hover:text-[#FE5B1B] cursor-pointer transition-colors truncate"
                            onClick={(e) => { e.stopPropagation(); navigate(`/strategic-initiatives/${initiative.id}`); }}
                          >
                            {initiative.name}
                          </h3>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${statusConfig.lightBg} ${statusConfig.text} border ${statusConfig.border}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {initiative.status}
                          </span>
                        </div>

                        {/* Meta Row */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {initiative.executive_sponsor && (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-gray-400" />
                              {initiative.executive_sponsor}
                            </span>
                          )}
                          {initiative.business_units?.length > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              {initiative.business_units.slice(0, 2).join(', ')}
                              {initiative.business_units.length > 2 && ` +${initiative.business_units.length - 2}`}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <FolderKanban className="w-4 h-4 text-gray-400" />
                            {projectCount} project{projectCount !== 1 ? 's' : ''}
                            {completedProjects > 0 && (
                              <span className="text-emerald-600">({completedProjects} done)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Right Side Stats */}
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-2 rounded-xl ${ragConfig.light} ${ragConfig.border} border`}>
                          <p className={`text-xs font-medium ${ragConfig.text}`}>{ragConfig.label}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/strategic-initiatives/${initiative.id}`); }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects Section - Expanded */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {/* Projects Header */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-gray-400" />
                      Projects ({projectCount})
                    </h4>
                    <button
                      onClick={(e) => handleAddProject(initiative.id, e)}
                      className="flex items-center gap-1.5 text-xs text-[#FE5B1B] hover:text-[#E0480E] font-semibold transition-colors"
                      data-testid={`add-project-${initiative.id}`}
                    >
                      <Plus className="w-4 h-4" />
                      Add Project
                    </button>
                  </div>

                  {/* Projects Grid */}
                  {hasProjects ? (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {initiative.projects.map(project => {
                        const projectRag = RAG_CONFIG[project.rag_status || 'Green'];
                        const projectStatusConfig = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG['Not Started'];
                        const milestoneProgress = project.milestones_count > 0 
                          ? Math.round((project.milestones_completed / project.milestones_count) * 100)
                          : 0;

                        return (
                          <div
                            key={project.id}
                            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            data-testid={`project-${project.id}`}
                          >
                            {/* Project Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-2.5 h-2.5 rounded-full ${projectRag.color} flex-shrink-0`} />
                                <h5 className="font-semibold text-gray-900 truncate group-hover:text-[#FE5B1B] transition-colors">
                                  {project.name}
                                </h5>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleEditProject(project.id, e)}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteProject(project.id, e)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                                </button>
                              </div>
                            </div>

                            {/* Project Details */}
                            <div className="space-y-3">
                              {/* Status & Owner */}
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${projectStatusConfig.color}`}>
                                  {project.status}
                                </span>
                                {project.owner && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {project.owner}
                                  </span>
                                )}
                              </div>

                              {/* Milestone Progress */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-500">Milestones</span>
                                  <span className="text-xs font-medium text-gray-700">
                                    {project.milestones_completed}/{project.milestones_count}
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      milestoneProgress === 100 ? 'bg-emerald-500' :
                                      milestoneProgress > 50 ? 'bg-blue-500' :
                                      milestoneProgress > 0 ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                                    style={{ width: `${milestoneProgress}%` }}
                                  />
                                </div>
                              </div>

                              {/* Business Units if any */}
                              {project.business_units?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {project.business_units.slice(0, 3).map(bu => (
                                    <span key={bu} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                      {bu}
                                    </span>
                                  ))}
                                  {project.business_units.length > 3 && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                                      +{project.business_units.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No projects yet</p>
                      <button
                        onClick={(e) => handleAddProject(initiative.id, e)}
                        className="mt-2 text-sm text-[#FE5B1B] hover:underline"
                      >
                        Create first project
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredInitiatives.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No initiatives match your filters</p>
          <button
            onClick={() => { setFilterStatus('all'); setFilterRag('all'); }}
            className="mt-2 text-sm text-[#FE5B1B] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Project name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Owner</label>
                <Input
                  value={projectForm.owner}
                  onChange={(e) => setProjectForm({ ...projectForm, owner: e.target.value })}
                  placeholder="Project owner"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select
                  value={projectForm.status}
                  onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {categories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Align to Business Outcomes</label>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {categories.map(cat => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(projectForm.business_outcome_ids || []).includes(cat.id)}
                        onChange={() => toggleOutcomeLink(cat.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#FE5B1B] focus:ring-[#FE5B1B]"
                      />
                      <span className="text-gray-700">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProject}
              className="text-white"
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
