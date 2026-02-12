import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api, AuthContext } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
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

const RAG_CONFIG = {
  'Red': { color: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100', border: 'border-red-300' },
  'Amber': { color: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100', border: 'border-amber-300' },
  'Green': { color: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100', border: 'border-emerald-300' },
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedInitiatives, setExpandedInitiatives] = useState({});
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
          <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pipeline...</p>
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
      {/* Pipeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-lato-light">Drag initiatives to move between stages</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
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
          )}
        </div>
      </div>

      {/* Code Red Pipeline - Drag & Drop */}
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
                    <div className={`min-h-[200px] max-h-[600px] overflow-y-auto ${config.color}`}>
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
                                          onClick={(e) => toggleInitiative(initiative.id, e)}
                                        >
                                          {isExpanded ? 
                                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : 
                                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                          }
                                          {/* RAG Status Indicator */}
                                          <div 
                                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${RAG_CONFIG[initiative.rag_status || 'Green']?.color}`}
                                            title={`RAG: ${initiative.rag_status || 'Green'}`}
                                          />
                                          <h4 
                                            className="font-lato-bold text-sm text-gray-900 truncate hover:text-[#FE5B1B] cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/strategic-initiatives/${initiative.id}`); }}
                                          >
                                            {initiative.name}
                                          </h4>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 ml-6">
                                          {initiative.executive_sponsor && (
                                            <span className="text-xs text-gray-500 font-lato-light flex items-center gap-1">
                                              <Users className="w-3 h-3" />
                                              {initiative.executive_sponsor}
                                            </span>
                                          )}
                                          <span className="text-xs text-gray-400 font-lato-light">
                                            {initiative.projects?.length || 0} projects
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Projects (Expanded) */}
                                    {isExpanded && (
                                      <div className="border-t border-gray-100 bg-gray-50/50">
                                        {/* Add Project Button */}
                                        <div className="px-3 py-2 border-b border-gray-100">
                                          <button
                                            onClick={(e) => handleAddProject(initiative.id, e)}
                                            className="flex items-center gap-1 text-xs text-[#FE5B1B] hover:text-[#E0480E] font-lato-bold"
                                            data-testid={`add-project-${initiative.id}`}
                                          >
                                            <Plus className="w-3 h-3" />
                                            Add Project
                                          </button>
                                        </div>
                                        
                                        {hasProjects ? (
                                          initiative.projects.map(project => (
                                            <div
                                              key={project.id}
                                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer transition-all border-b border-gray-100 last:border-b-0 group"
                                              onClick={() => navigate(`/projects/${project.id}`)}
                                              data-testid={`project-${project.id}`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  {/* Project RAG Status */}
                                                  <div 
                                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${RAG_CONFIG[project.rag_status || 'Green']?.color}`}
                                                    title={`RAG: ${project.rag_status || 'Green'}`}
                                                  />
                                                  <FolderKanban className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                  <span className="text-xs text-gray-700 truncate">{project.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={(e) => handleEditProject(project.id, e)}
                                                    className="p-1 hover:bg-gray-200 rounded"
                                                    title="Edit"
                                                  >
                                                    <Edit2 className="w-3 h-3 text-gray-400" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => handleDeleteProject(project.id, e)}
                                                    className="p-1 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                  >
                                                    <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                                  </button>
                                                </div>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-lato-bold ml-2 ${PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>
                                                  {project.status}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 ml-5 text-[10px] text-gray-400 font-lato-light">
                                                {project.owner && <span>{project.owner}</span>}
                                                <span>{project.milestones_completed}/{project.milestones_count} done</span>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="px-3 py-4 text-center text-xs text-gray-400">
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
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <FolderKanban className="w-8 h-8 text-gray-200 mx-auto mb-2" />
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

      {/* Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Project name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Owner</label>
                <Input
                  value={projectForm.owner}
                  onChange={(e) => setProjectForm({ ...projectForm, owner: e.target.value })}
                  placeholder="Project owner"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={projectForm.status}
                  onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                >
                  <SelectTrigger>
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
                <label className="text-sm font-medium">Align to Business Outcomes</label>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {categories.map(cat => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(projectForm.business_outcome_ids || []).includes(cat.id)}
                        onChange={() => toggleOutcomeLink(cat.id)}
                        className="w-4 h-4 text-[#FE5B1B] rounded"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectModal(false)}>Cancel</Button>
            <Button onClick={handleSaveProject}>{editingProject ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
