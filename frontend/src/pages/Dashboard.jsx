import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Target,
  ChevronRight,
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
  GripVertical,
  Building2,
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
    headerGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    columnBg: 'rgba(248, 250, 252, 0.7)',
    lightColor: 'rgba(100, 116, 139, 0.1)',
  },
  'Discovery': { 
    icon: Search, 
    headerGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    columnBg: 'rgba(239, 246, 255, 0.7)',
    lightColor: 'rgba(59, 130, 246, 0.1)',
  },
  'Frame': { 
    icon: Clock, 
    headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    columnBg: 'rgba(245, 243, 255, 0.7)',
    lightColor: 'rgba(139, 92, 246, 0.1)',
  },
  'Work In Progress': { 
    icon: PlayCircle, 
    headerBg: 'bg-amber-600',
    columnBg: 'bg-amber-50/50',
    accent: 'border-amber-300',
  },
};

const PROJECT_STATUS_COLORS = {
  'Not Started': 'bg-slate-100 text-slate-700 border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-orange-100 text-orange-700 border-orange-200',
};

const RAG_CONFIG = {
  'Red': { color: 'bg-red-500', ring: 'ring-red-200', label: 'At Risk' },
  'Amber': { color: 'bg-amber-500', ring: 'ring-amber-200', label: 'Needs Attention' },
  'Green': { color: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'On Track' },
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
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

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

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
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#FE5B1B]/30">
            <Target className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">No Strategic Initiatives Found</h2>
          <p className="text-gray-500 mb-8">Get started by loading sample data to explore the pipeline.</p>
          <Button
            onClick={handleSeedData}
            data-testid="seed-data-btn"
            disabled={seeding}
            className="text-white rounded-xl px-8 py-3 text-base font-semibold shadow-lg shadow-[#FE5B1B]/30"
            style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
          >
            {seeding ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Loading...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" />Load Sample Data</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const pipelineStatuses = ['Not Started', 'Discovery', 'Frame', 'Work In Progress'];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Drag initiatives between stages</p>
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

      {/* Pipeline Columns */}
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
                    className={`rounded-xl overflow-hidden border-2 transition-all ${
                      snapshot.isDraggingOver 
                        ? 'border-[#FE5B1B] ring-4 ring-[#FE5B1B]/20' 
                        : `border-transparent`
                    }`}
                  >
                    {/* Column Header */}
                    <div className={`${config.headerBg} px-4 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4 text-white/80" />
                        <span className="font-semibold text-sm text-white">{status}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                        {statusInitiatives.length}
                      </span>
                    </div>

                    {/* Column Content */}
                    <div className={`${config.columnBg} min-h-[500px] max-h-[700px] overflow-y-auto p-3 space-y-3`}>
                      {statusInitiatives.length > 0 ? (
                        <>
                          {statusInitiatives.map((initiative, index) => {
                            const ragConfig = RAG_CONFIG[initiative.rag_status || 'Green'];
                            const hasProjects = initiative.projects && initiative.projects.length > 0;

                            return (
                              <Draggable key={initiative.id} draggableId={initiative.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                                      snapshot.isDragging 
                                        ? 'shadow-xl ring-2 ring-[#FE5B1B] rotate-1' 
                                        : 'border-gray-200 hover:shadow-md'
                                    }`}
                                    style={provided.draggableProps.style}
                                    data-testid={`pipeline-initiative-${initiative.id}`}
                                  >
                                    {/* Initiative Header */}
                                    <div className="p-3 border-b border-gray-100">
                                      <div className="flex items-start gap-2">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="mt-0.5 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                                        >
                                          <GripVertical className="w-4 h-4 text-gray-300" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          {/* Title with RAG */}
                                          <div className="flex items-center gap-2 mb-1">
                                            <div 
                                              className={`w-2.5 h-2.5 rounded-full ${ragConfig.color} ring-2 ${ragConfig.ring}`}
                                              title={ragConfig.label}
                                            />
                                            <h4 
                                              className="font-semibold text-sm text-gray-900 truncate hover:text-[#FE5B1B] cursor-pointer transition-colors flex-1"
                                              onClick={() => navigate(`/strategic-initiatives/${initiative.id}`)}
                                            >
                                              {initiative.name}
                                            </h4>
                                            <ChevronRight 
                                              className="w-4 h-4 text-gray-300 hover:text-[#FE5B1B] cursor-pointer flex-shrink-0"
                                              onClick={() => navigate(`/strategic-initiatives/${initiative.id}`)}
                                            />
                                          </div>
                                          
                                          {/* Meta Info */}
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                            {initiative.executive_sponsor && (
                                              <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {initiative.executive_sponsor}
                                              </span>
                                            )}
                                            {initiative.business_units?.length > 0 && (
                                              <span className="flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {initiative.business_units.slice(0, 2).join(', ')}
                                                {initiative.business_units.length > 2 && ` +${initiative.business_units.length - 2}`}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Projects Section - Always Visible */}
                                    <div className="bg-gray-50/70">
                                      {/* Projects Header */}
                                      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                                          <FolderKanban className="w-3.5 h-3.5" />
                                          Projects ({initiative.projects?.length || 0})
                                        </span>
                                        <button
                                          onClick={(e) => handleAddProject(initiative.id, e)}
                                          className="text-[10px] text-[#FE5B1B] hover:text-[#E0480E] font-semibold flex items-center gap-0.5"
                                          data-testid={`add-project-${initiative.id}`}
                                        >
                                          <Plus className="w-3 h-3" />
                                          Add
                                        </button>
                                      </div>

                                      {/* Projects List */}
                                      <div className="p-2 space-y-1.5">
                                        {hasProjects ? (
                                          initiative.projects.map(project => {
                                            const projectRag = RAG_CONFIG[project.rag_status || 'Green'];
                                            const projectStatus = PROJECT_STATUS_COLORS[project.status] || PROJECT_STATUS_COLORS['Not Started'];
                                            const progress = project.milestones_count > 0 
                                              ? Math.round((project.milestones_completed / project.milestones_count) * 100)
                                              : 0;

                                            return (
                                              <div
                                                key={project.id}
                                                className="bg-white rounded-lg border border-gray-200 p-2.5 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                                                onClick={() => navigate(`/projects/${project.id}`)}
                                                data-testid={`project-${project.id}`}
                                              >
                                                {/* Project Title Row */}
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className={`w-2 h-2 rounded-full ${projectRag.color} flex-shrink-0`} />
                                                    <span className="text-xs font-semibold text-gray-800 truncate group-hover:text-[#FE5B1B] transition-colors">
                                                      {project.name}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                      onClick={(e) => handleEditProject(project.id, e)}
                                                      className="p-1 hover:bg-gray-100 rounded"
                                                    >
                                                      <Edit2 className="w-3 h-3 text-gray-400" />
                                                    </button>
                                                    <button
                                                      onClick={(e) => handleDeleteProject(project.id, e)}
                                                      className="p-1 hover:bg-red-50 rounded"
                                                    >
                                                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Project Details */}
                                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                                  <span className={`px-1.5 py-0.5 rounded border font-medium ${projectStatus}`}>
                                                    {project.status}
                                                  </span>
                                                  {project.owner && (
                                                    <span className="text-gray-500 truncate">{project.owner}</span>
                                                  )}
                                                </div>

                                                {/* Milestone Progress */}
                                                {project.milestones_count > 0 && (
                                                  <div className="mt-2">
                                                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                                      <span>Milestones</span>
                                                      <span className="font-medium">{project.milestones_completed}/{project.milestones_count}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                      <div 
                                                        className={`h-full rounded-full transition-all ${
                                                          progress === 100 ? 'bg-emerald-500' :
                                                          progress > 50 ? 'bg-blue-500' :
                                                          progress > 0 ? 'bg-amber-500' : 'bg-gray-300'
                                                        }`}
                                                        style={{ width: `${progress}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Business Units Tags */}
                                                {project.business_units?.length > 0 && (
                                                  <div className="mt-2 flex flex-wrap gap-1">
                                                    {project.business_units.slice(0, 2).map(bu => (
                                                      <span key={bu} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px]">
                                                        {bu}
                                                      </span>
                                                    ))}
                                                    {project.business_units.length > 2 && (
                                                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px]">
                                                        +{project.business_units.length - 2}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <div className="text-center py-4 text-xs text-gray-400">
                                            No projects yet
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                          <FolderKanban className="w-8 h-8 text-gray-300 mb-2" />
                          <p className="text-sm text-gray-400">Drop initiatives here</p>
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
            <Button variant="outline" onClick={() => setShowProjectModal(false)}>Cancel</Button>
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
