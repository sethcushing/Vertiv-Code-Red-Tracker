import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  ArrowLeft,
  Target,
  User,
  Plus,
  Edit2,
  Trash2,
  Save,
  FolderKanban,
  Link2,
  X,
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';
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

const PROJECT_STATUS_COLORS = {
  'Not Started': 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-blue-100 text-blue-600',
  'Completed': 'bg-green-100 text-green-600',
  'On Hold': 'bg-orange-100 text-orange-600',
};

const StrategicInitiativeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState(null);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [initRes, projRes, catRes] = await Promise.all([
        api.get(`/strategic-initiatives/${id}`),
        api.get(`/projects?strategic_initiative_id=${id}`),
        api.get('/business-outcomes/categories'),
      ]);
      setInitiative(initRes.data);
      setProjects(projRes.data);
      setCategories(catRes.data);
      setEditForm({
        name: initRes.data.name,
        description: initRes.data.description,
        status: initRes.data.status,
        executive_sponsor: initRes.data.executive_sponsor,
        business_outcome_ids: initRes.data.business_outcome_ids || [],
      });
    } catch (error) {
      toast.error('Failed to load initiative');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInitiative = async () => {
    try {
      await api.put(`/strategic-initiatives/${id}`, editForm);
      toast.success('Initiative updated');
      setEditing(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update initiative');
    }
  };

  const handleDeleteInitiative = async () => {
    if (window.confirm('Delete this initiative and all its projects?')) {
      try {
        await api.delete(`/strategic-initiatives/${id}`);
        toast.success('Initiative deleted');
        navigate('/');
      } catch (error) {
        toast.error('Failed to delete initiative');
      }
    }
  };

  // Projects
  const handleAddProject = () => {
    setFormData({ name: '', description: '', owner: '', status: 'Not Started' });
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    try {
      await api.post('/projects', { ...formData, strategic_initiative_id: id });
      toast.success('Project created');
      setShowProjectModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId) => {
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

  // Linking to Business Outcomes
  const handleToggleOutcome = (categoryId) => {
    const current = editForm.business_outcome_ids || [];
    const updated = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    setEditForm({ ...editForm, business_outcome_ids: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  if (!initiative) return null;

  const linkedCategories = categories.filter(c => (initiative.business_outcome_ids || []).includes(c.id));

  return (
    <div className="space-y-6" data-testid="initiative-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-[#FE5B1B]" />
            {editing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-heading font-bold"
              />
            ) : (
              <h1 className="text-2xl font-heading font-bold text-gray-900">{initiative.name}</h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSaveInitiative}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDeleteInitiative}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Initiative Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Status</p>
            {editing ? (
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="Discovery">Discovery</SelectItem>
                  <SelectItem value="Frame">Frame</SelectItem>
                  <SelectItem value="Work In Progress">Work In Progress</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-lato-bold text-gray-900">{initiative.status}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Executive Sponsor</p>
            {editing ? (
              <Input
                value={editForm.executive_sponsor}
                onChange={(e) => setEditForm({ ...editForm, executive_sponsor: e.target.value })}
                className="h-8"
              />
            ) : (
              <p className="font-lato-bold text-gray-900 flex items-center gap-1">
                <User className="w-4 h-4 text-gray-400" />
                {initiative.executive_sponsor || 'Unassigned'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Projects</p>
            <p className="font-lato-bold text-gray-900">{projects.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {(initiative.description || editing) && (
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-2">Description</p>
            {editing ? (
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Initiative description..."
              />
            ) : (
              <p className="text-gray-700">{initiative.description || 'No description'}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Linked Business Outcomes */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-lato-bold text-gray-900 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Linked Business Outcomes
            </h3>
            {editing && (
              <Button size="sm" variant="outline" onClick={() => setShowLinkModal(true)}>
                Manage Links
              </Button>
            )}
          </div>
          {linkedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {linkedCategories.map(cat => (
                <span
                  key={cat.id}
                  className="px-3 py-1 bg-[#FE5B1B]/10 text-[#FE5B1B] rounded-full text-sm font-lato-bold"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No linked outcomes</p>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-lato-bold text-gray-900">Projects</h3>
            <Button size="sm" onClick={handleAddProject}>
              <Plus className="w-4 h-4 mr-1" />
              Add Project
            </Button>
          </div>
          {projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((project) => {
                const completed = project.milestones.filter(m => m.status === 'Completed').length;
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <FolderKanban className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-lato-bold text-gray-900">{project.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {project.owner && <span>{project.owner}</span>}
                          <span>{completed}/{project.milestones.length} milestones</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-lato-bold ${PROJECT_STATUS_COLORS[project.status]}`}>
                        {project.status}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No projects yet</p>
          )}
        </CardContent>
      </Card>

      {/* Add Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <Input
                value={formData.owner || ''}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={formData.status || 'Not Started'}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectModal(false)}>Cancel</Button>
            <Button onClick={handleSaveProject}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Outcomes Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Business Outcomes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">Select categories to link to this initiative:</p>
            <div className="space-y-2">
              {categories.map(cat => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(editForm.business_outcome_ids || []).includes(cat.id)}
                    onChange={() => handleToggleOutcome(cat.id)}
                    className="w-4 h-4 text-[#FE5B1B] rounded"
                  />
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-sm text-gray-400">{cat.sub_outcomes_count} sub-outcomes</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLinkModal(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StrategicInitiativeDetail;
