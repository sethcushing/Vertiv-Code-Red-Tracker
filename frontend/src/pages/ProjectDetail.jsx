import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import {
  ArrowLeft,
  FolderKanban,
  Calendar,
  User,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
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

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const RAG_OPTIONS = ['Green', 'Amber', 'Red'];

const RAG_CONFIG = {
  'Red': { color: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100' },
  'Amber': { color: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100' },
  'Green': { color: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100' },
};

const MILESTONE_STATUS_COLORS = {
  'Pending': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-600',
  'Completed': 'bg-green-100 text-green-600',
  'Delayed': 'bg-red-100 text-red-600',
};

const ISSUE_SEVERITY_COLORS = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-amber-100 text-amber-600',
  'High': 'bg-red-100 text-red-600',
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [initiative, setInitiative] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  // Config values from API
  const [businessUnits, setBusinessUnits] = useState([]);
  const [deliveryStages, setDeliveryStages] = useState([]);

  // Modal states
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [teamMemberForm, setTeamMemberForm] = useState({ name: '', role: '', responsibility: '' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [projRes, catRes, configRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get('/business-outcomes/categories'),
        api.get('/config'),
      ]);
      setProject(projRes.data);
      setCategories(catRes.data);
      setEditForm(projRes.data);
      setBusinessUnits(configRes.data.business_units || []);
      setDeliveryStages(configRes.data.delivery_stages || []);
      
      // Fetch parent initiative
      if (projRes.data.strategic_initiative_id) {
        const initRes = await api.get(`/strategic-initiatives/${projRes.data.strategic_initiative_id}`);
        setInitiative(initRes.data);
      }
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/projects/${id}`, {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        rag_status: editForm.rag_status,
        owner: editForm.owner,
        business_units: editForm.business_units,
        delivery_stages_impacted: editForm.delivery_stages_impacted,
        business_outcome_ids: editForm.business_outcome_ids,
      });
      toast.success('Project updated');
      setEditing(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this project?')) {
      try {
        await api.delete(`/projects/${id}`);
        toast.success('Project deleted');
        navigate(-1);
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  // Team Members
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
      const updatedTeam = [...(project.team_members || []), newMember];
      await api.put(`/projects/${id}`, { team_members: updatedTeam });
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
      const updatedTeam = (project.team_members || []).filter(m => m.id !== memberId);
      await api.put(`/projects/${id}`, { team_members: updatedTeam });
      toast.success('Team member removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  // Toggle delivery stage in edit form
  const toggleDeliveryStage = (stage) => {
    const current = editForm.delivery_stages_impacted || [];
    if (current.includes(stage)) {
      setEditForm({ ...editForm, delivery_stages_impacted: current.filter(s => s !== stage) });
    } else {
      setEditForm({ ...editForm, delivery_stages_impacted: [...current, stage] });
    }
  };

  // Toggle business unit in edit form
  const toggleBusinessUnit = (unit) => {
    const current = editForm.business_units || [];
    if (current.includes(unit)) {
      setEditForm({ ...editForm, business_units: current.filter(u => u !== unit) });
    } else {
      setEditForm({ ...editForm, business_units: [...current, unit] });
    }
  };

  // Toggle business outcome in edit form
  const toggleBusinessOutcome = (catId) => {
    const current = editForm.business_outcome_ids || [];
    if (current.includes(catId)) {
      setEditForm({ ...editForm, business_outcome_ids: current.filter(id => id !== catId) });
    } else {
      setEditForm({ ...editForm, business_outcome_ids: [...current, catId] });
    }
  };

  // Milestones
  const handleAddMilestone = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '', owner: '', due_date: '', status: 'Pending' });
    setShowMilestoneModal(true);
  };

  const handleEditMilestone = (milestone) => {
    setEditingItem(milestone);
    setFormData({ ...milestone });
    setShowMilestoneModal(true);
  };

  const handleSaveMilestone = async () => {
    try {
      if (editingItem) {
        await api.put(`/projects/${id}/milestones/${editingItem.id}`, formData);
        toast.success('Milestone updated');
      } else {
        await api.post(`/projects/${id}/milestones`, formData);
        toast.success('Milestone added');
      }
      setShowMilestoneModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (window.confirm('Delete this milestone?')) {
      try {
        await api.delete(`/projects/${id}/milestones/${milestoneId}`);
        toast.success('Milestone deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete milestone');
      }
    }
  };

  // Issues
  const handleAddIssue = () => {
    setEditingItem(null);
    setFormData({ description: '', severity: 'Medium', status: 'Open', owner: '', resolution: '' });
    setShowIssueModal(true);
  };

  const handleEditIssue = (issue) => {
    setEditingItem(issue);
    setFormData({ ...issue });
    setShowIssueModal(true);
  };

  const handleSaveIssue = async () => {
    try {
      if (editingItem) {
        await api.put(`/projects/${id}/issues/${editingItem.id}`, formData);
        toast.success('Issue updated');
      } else {
        await api.post(`/projects/${id}/issues`, formData);
        toast.success('Issue added');
      }
      setShowIssueModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save issue');
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (window.confirm('Delete this issue?')) {
      try {
        await api.delete(`/projects/${id}/issues/${issueId}`);
        toast.success('Issue deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete issue');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  if (!project) return null;

  const ragConfig = RAG_CONFIG[project.rag_status || 'Green'];
  const completedMilestones = project.milestones?.filter(m => m.status === 'Completed').length || 0;
  const totalMilestones = project.milestones?.length || 0;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div className="space-y-6" data-testid="project-detail-page">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${ragConfig.light}`}>
            <FolderKanban className={`w-7 h-7 ${ragConfig.text}`} />
          </div>
          <div>
            {editing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-bold"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            )}
            <div className="flex items-center gap-3 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${ragConfig.color}`} />
              <span className="text-sm text-gray-500">{project.rag_status || 'Green'}</span>
              {initiative && (
                <span className="text-sm text-gray-400">
                  Part of: <span className="font-medium text-gray-600">{initiative.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditForm(project); }}>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <p className="font-semibold text-gray-900">{project.status}</p>
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
                <span className="font-semibold">{project.rag_status || 'Green'}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Owner</p>
            {editing ? (
              <Input
                value={editForm.owner || ''}
                onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
              />
            ) : (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{project.owner || 'Not assigned'}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Milestones</p>
            <p className="font-semibold text-gray-900">{completedMilestones} / {totalMilestones}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Progress</p>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-sm font-semibold">{progress.toFixed(0)}%</span>
            </div>
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
            <p className="text-gray-700">{project.description || 'No description'}</p>
          )}
        </CardContent>
      </Card>

      {/* Business Unit & Delivery Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              Business Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {editing ? (
                businessUnits.map(unit => (
                  <button
                    key={unit}
                    onClick={() => toggleBusinessUnit(unit)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      (editForm.business_units || []).includes(unit)
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {unit}
                  </button>
                ))
              ) : (
                (project.business_units || []).length > 0 ? (
                  project.business_units.map(unit => (
                    <span key={unit} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {unit}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">None selected</span>
                )
              )}
            </div>
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
                deliveryStages.map(stage => (
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
                (project.delivery_stages_impacted || []).length > 0 ? (
                  project.delivery_stages_impacted.map(stage => (
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
          {(project.team_members || []).length > 0 ? (
            <div className="space-y-2">
              {project.team_members.map(member => (
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
          {(project.status_history || []).length > 0 ? (
            <div className="space-y-3">
              {[...(project.status_history || [])].reverse().map((update, idx) => (
                <div key={update.id || idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mt-2" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{update.old_status}</span>
                      <span className="text-gray-400">-&gt;</span>
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

      {/* Milestones */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Milestones</CardTitle>
          <Button size="sm" onClick={handleAddMilestone}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {(project.milestones || []).length > 0 ? (
            <div className="space-y-2">
              {project.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {milestone.status === 'Completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{milestone.name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {milestone.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {milestone.due_date}
                          </span>
                        )}
                        {milestone.owner && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {milestone.owner}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${MILESTONE_STATUS_COLORS[milestone.status]}`}>
                      {milestone.status}
                    </span>
                    <button onClick={() => handleEditMilestone(milestone)} className="p-1 hover:bg-gray-200 rounded">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => handleDeleteMilestone(milestone.id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No milestones yet</p>
          )}
        </CardContent>
      </Card>

      {/* Issues */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Issues</CardTitle>
          <Button size="sm" onClick={handleAddIssue}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {(project.issues || []).length > 0 ? (
            <div className="space-y-2">
              {project.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <AlertCircle className={`w-5 h-5 mt-0.5 ${issue.severity === 'High' ? 'text-red-500' : issue.severity === 'Medium' ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-gray-900">{issue.description}</p>
                      {issue.owner && (
                        <p className="text-xs text-gray-500 mt-1">Assigned to: {issue.owner}</p>
                      )}
                      {issue.resolution && (
                        <p className="text-xs text-green-600 mt-1">Resolution: {issue.resolution}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ISSUE_SEVERITY_COLORS[issue.severity]}`}>
                      {issue.severity}
                    </span>
                    <button onClick={() => handleEditIssue(issue)} className="p-1 hover:bg-gray-200 rounded">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => handleDeleteIssue(issue.id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No issues</p>
          )}
        </CardContent>
      </Card>

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

      {/* Milestone Modal */}
      <Dialog open={showMilestoneModal} onOpenChange={setShowMilestoneModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status || 'Pending'}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <Input
                value={formData.owner || ''}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMilestoneModal(false)}>Cancel</Button>
            <Button onClick={handleSaveMilestone}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Issue' : 'Add Issue'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={formData.severity || 'Medium'}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status || 'Open'}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <Input
                value={formData.owner || ''}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Resolution</label>
              <Input
                value={formData.resolution || ''}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                placeholder="How was/will this be resolved?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueModal(false)}>Cancel</Button>
            <Button onClick={handleSaveIssue}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
