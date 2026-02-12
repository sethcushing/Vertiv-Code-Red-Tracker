import React, { useState, useEffect, useCallback } from 'react';
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
  Clock,
  Users,
  Building2,
  Truck,
  History,
  Calendar,
  CheckCircle2,
  FileText,
  Upload,
  Download,
  CalendarDays,
  MapPin,
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
const MILESTONE_STATUS = ['Pending', 'In Progress', 'Completed', 'Delayed'];
const ACTIVITY_TYPES = ['Meeting', 'Workshop', 'Review', 'Training', 'Presentation', 'Planning Session', 'Demo', 'Other'];
const ACTIVITY_STATUS = ['Scheduled', 'Completed', 'Cancelled'];

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

const ACTIVITY_STATUS_COLORS = {
  'Scheduled': 'bg-blue-100 text-blue-600',
  'Completed': 'bg-green-100 text-green-600',
  'Cancelled': 'bg-gray-100 text-gray-600',
};

const ACTIVITY_TYPE_COLORS = {
  'Meeting': 'bg-indigo-100 text-indigo-700',
  'Workshop': 'bg-purple-100 text-purple-700',
  'Review': 'bg-amber-100 text-amber-700',
  'Training': 'bg-teal-100 text-teal-700',
  'Presentation': 'bg-pink-100 text-pink-700',
  'Planning Session': 'bg-cyan-100 text-cyan-700',
  'Demo': 'bg-orange-100 text-orange-700',
  'Other': 'bg-gray-100 text-gray-700',
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
  
  // Config values from API
  const [businessUnits, setBusinessUnits] = useState([]);
  const [deliveryStages, setDeliveryStages] = useState([]);

  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [teamMemberForm, setTeamMemberForm] = useState({ name: '', role: '', responsibility: '' });
  const [editingItem, setEditingItem] = useState(null);
  
  // Document upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [initRes, projRes, catRes, configRes] = await Promise.all([
        api.get(`/strategic-initiatives/${id}`),
        api.get(`/projects?strategic_initiative_id=${id}`),
        api.get('/business-outcomes/categories'),
        api.get('/config'),
      ]);
      setInitiative(initRes.data);
      setProjects(projRes.data);
      setCategories(catRes.data);
      setEditForm(initRes.data);
      setBusinessUnits(configRes.data.business_units || []);
      setDeliveryStages(configRes.data.delivery_stages || []);
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
        business_units: editForm.business_units,
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
      const newMember = { id: Date.now().toString(), ...teamMemberForm };
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

  // Milestone handlers
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
        await api.put(`/strategic-initiatives/${id}/milestones/${editingItem.id}`, formData);
        toast.success('Milestone updated');
      } else {
        await api.post(`/strategic-initiatives/${id}/milestones`, formData);
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
        await api.delete(`/strategic-initiatives/${id}/milestones/${milestoneId}`);
        toast.success('Milestone deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete milestone');
      }
    }
  };

  // Activity handlers
  const handleAddActivity = () => {
    setEditingItem(null);
    setFormData({ name: '', activity_type: 'Meeting', description: '', date: '', time: '', location: '', attendees: [], status: 'Scheduled', notes: '' });
    setShowActivityModal(true);
  };

  const handleEditActivity = (activity) => {
    setEditingItem(activity);
    setFormData({ ...activity, attendees: activity.attendees || [] });
    setShowActivityModal(true);
  };

  const handleSaveActivity = async () => {
    try {
      const activityData = {
        ...formData,
        attendees: typeof formData.attendees === 'string' 
          ? formData.attendees.split(',').map(a => a.trim()).filter(a => a)
          : formData.attendees
      };
      if (editingItem) {
        await api.put(`/strategic-initiatives/${id}/activities/${editingItem.id}`, activityData);
        toast.success('Activity updated');
      } else {
        await api.post(`/strategic-initiatives/${id}/activities`, activityData);
        toast.success('Activity added');
      }
      setShowActivityModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save activity');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (window.confirm('Delete this activity?')) {
      try {
        await api.delete(`/strategic-initiatives/${id}/activities/${activityId}`);
        toast.success('Activity deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete activity');
      }
    }
  };

  // Document handlers with drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  }, [id]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', '');
      
      await api.post(`/strategic-initiatives/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded');
      fetchData();
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (window.confirm('Delete this document?')) {
      try {
        await api.delete(`/strategic-initiatives/${id}/documents/${documentId}`);
        toast.success('Document deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete document');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleDeliveryStage = (stage) => {
    const current = editForm.delivery_stages_impacted || [];
    if (current.includes(stage)) {
      setEditForm({ ...editForm, delivery_stages_impacted: current.filter(s => s !== stage) });
    } else {
      setEditForm({ ...editForm, delivery_stages_impacted: [...current, stage] });
    }
  };

  const toggleBusinessUnit = (unit) => {
    const current = editForm.business_units || [];
    if (current.includes(unit)) {
      setEditForm({ ...editForm, business_units: current.filter(u => u !== unit) });
    } else {
      setEditForm({ ...editForm, business_units: [...current, unit] });
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
              Business Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {editing ? (
                BUSINESS_UNITS.map(unit => (
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
                (initiative.business_units || []).length > 0 ? (
                  initiative.business_units.map(unit => (
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

      {/* Milestones */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-gray-400" />
            Milestones
          </CardTitle>
          <Button size="sm" onClick={handleAddMilestone}>
            <Plus className="w-4 h-4 mr-1" />
            Add Milestone
          </Button>
        </CardHeader>
        <CardContent>
          {(initiative.milestones || []).length > 0 ? (
            <div className="space-y-2">
              {initiative.milestones.map((milestone) => (
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
            <p className="text-gray-400 text-sm text-center py-4">No milestones yet</p>
          )}
        </CardContent>
      </Card>

      {/* Activities */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gray-400" />
            Activities
          </CardTitle>
          <Button size="sm" onClick={handleAddActivity}>
            <Plus className="w-4 h-4 mr-1" />
            Add Activity
          </Button>
        </CardHeader>
        <CardContent>
          {(initiative.activities || []).length > 0 ? (
            <div className="space-y-2">
              {initiative.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTIVITY_TYPE_COLORS[activity.activity_type] || ACTIVITY_TYPE_COLORS['Other']}`}>
                        {activity.activity_type}
                      </span>
                      <p className="font-medium text-gray-900">{activity.name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {activity.date} {activity.time && `at ${activity.time}`}
                      </span>
                      {activity.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {activity.location}
                        </span>
                      )}
                    </div>
                    {activity.attendees && activity.attendees.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        <Users className="w-3 h-3 inline mr-1" />
                        {activity.attendees.join(', ')}
                      </p>
                    )}
                    {activity.notes && (
                      <p className="text-xs text-gray-600 mt-1 italic">{activity.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ACTIVITY_STATUS_COLORS[activity.status]}`}>
                      {activity.status}
                    </span>
                    <button onClick={() => handleEditActivity(activity)} className="p-1 hover:bg-gray-200 rounded">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => handleDeleteActivity(activity.id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No activities scheduled</p>
          )}
        </CardContent>
      </Card>

      {/* Documents with Drag & Drop */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
              isDragging 
                ? 'border-[#FE5B1B] bg-orange-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-[#FE5B1B]' : 'text-gray-400'}`} />
            <p className="text-sm text-gray-600 mb-2">
              {uploading ? 'Uploading...' : 'Drag and drop files here'}
            </p>
            <p className="text-xs text-gray-400 mb-3">or</p>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                Browse Files
              </span>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* Document List */}
          {(initiative.documents || []).length > 0 ? (
            <div className="space-y-2">
              {initiative.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {doc.file_type?.toUpperCase()} • {formatFileSize(doc.file_size)}
                        {doc.uploaded_at && ` • Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`${process.env.REACT_APP_BACKEND_URL}${doc.file_url}`}
                      download
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                    </a>
                    <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-2">No documents uploaded</p>
          )}
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
                placeholder="Milestone name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
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
                <Select value={formData.status || 'Pending'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MILESTONE_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <Input
                value={formData.owner || ''}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Owner name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMilestoneModal(false)}>Cancel</Button>
            <Button onClick={handleSaveMilestone}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Modal */}
      <Dialog open={showActivityModal} onOpenChange={setShowActivityModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Activity Name</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekly Status Meeting"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.activity_type || 'Meeting'} onValueChange={(v) => setFormData({ ...formData, activity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status || 'Scheduled'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <Input
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="e.g., 2:00 PM"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Conference Room A or Virtual - Teams"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Attendees (comma-separated)</label>
                <Input
                  value={Array.isArray(formData.attendees) ? formData.attendees.join(', ') : formData.attendees || ''}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                  placeholder="e.g., John Smith, Jane Doe"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Notes / Outcomes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg resize-none h-20 text-sm"
                  placeholder="Meeting outcomes or notes..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityModal(false)}>Cancel</Button>
            <Button onClick={handleSaveActivity}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StrategicInitiativeDetail;
