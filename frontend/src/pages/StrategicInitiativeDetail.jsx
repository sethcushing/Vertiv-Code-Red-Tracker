import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  Clock,
  Users,
  Building2,
  Truck,
  History,
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

const STATUS_OPTIONS = ['Not Started', 'Discovery', 'Frame', 'Work In Progress'];
const RAG_OPTIONS = ['Green', 'Amber', 'Red'];
const BUSINESS_UNITS = ['IT', 'Sales', 'Manufacturing', 'Fulfillment', 'Engineering', 'Finance', 'Operations', 'HR', 'Marketing'];
const DELIVERY_STAGES = ['Request', 'Solution Design', 'Commercials', 'Quote and Approval', 'Order Capture', 'Availability', 'Fulfillment', 'Post-Delivery'];

const RAG_CONFIG = {
  'Red': { color: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100' },
  'Amber': { color: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100' },
  'Green': { color: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100' },
};

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
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [teamMemberForm, setTeamMemberForm] = useState({ name: '', role: '', responsibility: '' });
  const [editingTeamMember, setEditingTeamMember] = useState(null);

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
      setEditForm(initRes.data);
    } catch (error) {
      toast.error('Failed to load initiative');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/strategic-initiatives/${id}`, {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        rag_status: editForm.rag_status,
        executive_sponsor: editForm.executive_sponsor,
        business_unit: editForm.business_unit,
        delivery_stages_impacted: editForm.delivery_stages_impacted,
        business_outcome_ids: editForm.business_outcome_ids,
      });
      toast.success('Initiative updated');
      setEditing(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update initiative');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this initiative and all its projects?')) {
      try {
        await api.delete(`/strategic-initiatives/${id}`);
        toast.success('Initiative deleted');
        navigate('/dashboard');
      } catch (error) {
        toast.error('Failed to delete initiative');
      }
    }
  };

  const handleAddProject = async () => {
    try {
      await api.post('/projects', {
        ...formData,
        strategic_initiative_id: id,
      });
      toast.success('Project added');
      setShowProjectModal(false);
      setFormData({});
      fetchData();
    } catch (error) {
      toast.error('Failed to add project');
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

  const handleAddTeamMember = async () => {
    if (!teamMemberForm.name || !teamMemberForm.role) {
      toast.error('Name and role are required');
      return;
    }
    try {
      const newMember = {
        id: Date.now().toString(),
        ...teamMemberForm
      };
      const updatedTeam = [...(initiative.team_members || []), newMember];
      await api.put(`/strategic-initiatives/${id}`, { team_members: updatedTeam });
      toast.success('Team member added');
      setShowTeamModal(false);
      setTeamMemberForm({ name: '', role: '', responsibility: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add team member');
    }
  };

  const handleDeleteTeamMember = async (memberId) => {
    try {
      const updatedTeam = (initiative.team_members || []).filter(m => m.id !== memberId);
      await api.put(`/strategic-initiatives/${id}`, { team_members: updatedTeam });
      toast.success('Team member removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const toggleDeliveryStage = (stage) => {
    const current = editForm.delivery_stages_impacted || [];
    if (current.includes(stage)) {
      setEditForm({ ...editForm, delivery_stages_impacted: current.filter(s => s !== stage) });
    } else {
      setEditForm({ ...editForm, delivery_stages_impacted: [...current, stage] });
    }
  };

  const toggleBusinessOutcome = (catId) => {
    const current = editForm.business_outcome_ids || [];
    if (current.includes(catId)) {
      setEditForm({ ...editForm, business_outcome_ids: current.filter(id => id !== catId) });
    } else {
      setEditForm({ ...editForm, business_outcome_ids: [...current, catId] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  if (!initiative) return null;

  const ragConfig = RAG_CONFIG[initiative.rag_status || 'Green'];

  return (
    <div className="space-y-6" data-testid="initiative-detail">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${ragConfig.light}`}>
            <Target className={`w-7 h-7 ${ragConfig.text}`} />
          </div>
          <div>
            {editing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-bold"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{initiative.name}</h1>
            )}
            <div className="flex items-center gap-3 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${ragConfig.color}`} />
              <span className="text-sm text-gray-500">{initiative.rag_status || 'Green'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditForm(initiative); }}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
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
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
            {editing ? (
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="font-semibold text-gray-900">{initiative.status}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">RAG Status</p>
            {editing ? (
              <Select value={editForm.rag_status || 'Green'} onValueChange={(v) => setEditForm({ ...editForm, rag_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RAG_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${ragConfig.color}`} />
                <span className="font-semibold">{initiative.rag_status || 'Green'}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Executive Sponsor</p>
            {editing ? (
              <Input
                value={editForm.executive_sponsor || ''}
                onChange={(e) => setEditForm({ ...editForm, executive_sponsor: e.target.value })}
              />
            ) : (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{initiative.executive_sponsor || 'Not assigned'}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Projects</p>
            <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase mb-2">Description</p>
          {editing ? (
            <textarea
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full p-2 border rounded-lg resize-none h-24"
            />
          ) : (
            <p className="text-gray-700">{initiative.description || 'No description'}</p>
          )}
        </CardContent>
      </Card>

      {/* Business Unit & Delivery Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              Business Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Select value={editForm.business_unit || ''} onValueChange={(v) => setEditForm({ ...editForm, business_unit: v })}>
                <SelectTrigger><SelectValue placeholder="Select business unit" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${initiative.business_unit ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {initiative.business_unit || 'Not set'}
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-400" />
              Delivery Stages Impacted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {editing ? (
                DELIVERY_STAGES.map(stage => (
                  <button
                    key={stage}
                    onClick={() => toggleDeliveryStage(stage)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      (editForm.delivery_stages_impacted || []).includes(stage)
                        ? 'bg-violet-100 text-violet-700 border border-violet-300'
                        : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {stage}
                  </button>
                ))
              ) : (
                (initiative.delivery_stages_impacted || []).length > 0 ? (
                  initiative.delivery_stages_impacted.map(stage => (
                    <span key={stage} className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                      {stage}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">None selected</span>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Business Outcomes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400" />
            Linked Business Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleBusinessOutcome(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    (editForm.business_outcome_ids || []).includes(cat.id)
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            ) : (
              categories
                .filter(c => (initiative.business_outcome_ids || []).includes(c.id))
                .map(cat => (
                  <span key={cat.id} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                    {cat.name}
                  </span>
                ))
            )}
            {!editing && (initiative.business_outcome_ids || []).length === 0 && (
              <span className="text-gray-400 text-sm">No outcomes linked</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            Team Members
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowTeamModal(true)}>
            <Plus className="w-3 h-3 mr-1" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          {(initiative.team_members || []).length > 0 ? (
            <div className="space-y-2">
              {initiative.team_members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.responsibility && (
                      <span className="text-xs text-gray-400 max-w-[200px] truncate">{member.responsibility}</span>
                    )}
                    <button
                      onClick={() => handleDeleteTeamMember(member.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No team members added</p>
          )}
        </CardContent>
      </Card>

      {/* Status History */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(initiative.status_history || []).length > 0 ? (
            <div className="space-y-3">
              {[...(initiative.status_history || [])].reverse().map((update, idx) => (
                <div key={update.id || idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{update.old_status}</span>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{update.new_status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(update.changed_at).toLocaleDateString()} at {new Date(update.changed_at).toLocaleTimeString()}
                      {update.changed_by && ` by ${update.changed_by}`}
                    </p>
                    {update.notes && <p className="text-xs text-gray-500 mt-1">{update.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No status changes recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Projects</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setFormData({ name: '', description: '', status: 'Not Started', owner: '' });
              setShowProjectModal(true);
            }}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Project
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <FolderKanban className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.owner || 'No owner'} · {project.milestones?.length || 0} milestones</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100'}`}>
                      {project.status}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No projects yet</p>
          )}
        </CardContent>
      </Card>

      {/* Add Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Project Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <Input
                value={formData.owner || ''}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Enter owner name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status || 'Not Started'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button onClick={handleAddProject}>Add Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Modal */}
      <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={teamMemberForm.name}
                onChange={(e) => setTeamMemberForm({ ...teamMemberForm, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Input
                value={teamMemberForm.role}
                onChange={(e) => setTeamMemberForm({ ...teamMemberForm, role: e.target.value })}
                placeholder="e.g., Project Lead, Developer"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Responsibility Area</label>
              <Input
                value={teamMemberForm.responsibility}
                onChange={(e) => setTeamMemberForm({ ...teamMemberForm, responsibility: e.target.value })}
                placeholder="e.g., Backend development, QA testing"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamModal(false)}>Cancel</Button>
            <Button onClick={handleAddTeamMember}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StrategicInitiativeDetail;
