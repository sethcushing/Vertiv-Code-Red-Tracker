import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
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
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Modal states
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
      setEditForm({
        name: response.data.name,
        description: response.data.description,
        status: response.data.status,
        owner: response.data.owner,
      });
      
      // Fetch parent initiative
      const initRes = await api.get(`/strategic-initiatives/${response.data.strategic_initiative_id}`);
      setInitiative(initRes.data);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async () => {
    try {
      await api.put(`/projects/${id}`, editForm);
      toast.success('Project updated');
      setEditing(false);
      fetchProject();
    } catch (error) {
      toast.error('Failed to update project');
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
      fetchProject();
    } catch (error) {
      toast.error('Failed to save milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (window.confirm('Delete this milestone?')) {
      try {
        await api.delete(`/projects/${id}/milestones/${milestoneId}`);
        toast.success('Milestone deleted');
        fetchProject();
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
      fetchProject();
    } catch (error) {
      toast.error('Failed to save issue');
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (window.confirm('Delete this issue?')) {
      try {
        await api.delete(`/projects/${id}/issues/${issueId}`);
        toast.success('Issue deleted');
        fetchProject();
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

  const completedMilestones = project.milestones.filter(m => m.status === 'Completed').length;
  const progress = project.milestones.length > 0 ? (completedMilestones / project.milestones.length) * 100 : 0;

  return (
    <div className="space-y-6" data-testid="project-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-[#FE5B1B]" />
            {editing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-heading font-bold"
              />
            ) : (
              <h1 className="text-2xl font-heading font-bold text-gray-900">{project.name}</h1>
            )}
          </div>
          {initiative && (
            <p className="text-sm text-gray-500 mt-1">
              Part of: <span className="font-medium">{initiative.name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSaveProject}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-lato-bold text-gray-900">{project.status}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Owner</p>
            {editing ? (
              <Input
                value={editForm.owner}
                onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                className="h-8"
              />
            ) : (
              <p className="font-lato-bold text-gray-900 flex items-center gap-1">
                <User className="w-4 h-4 text-gray-400" />
                {project.owner || 'Unassigned'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Milestones</p>
            <p className="font-lato-bold text-gray-900">
              {completedMilestones} / {project.milestones.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Progress</p>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-sm font-lato-bold">{progress.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {(project.description || editing) && (
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase mb-2">Description</p>
            {editing ? (
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Project description..."
              />
            ) : (
              <p className="text-gray-700">{project.description || 'No description'}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-lato-bold text-gray-900">Milestones</h3>
            <Button size="sm" onClick={handleAddMilestone}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          {project.milestones.length > 0 ? (
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
                      <p className="font-lato-bold text-gray-900">{milestone.name}</p>
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
                    <span className={`px-2 py-1 rounded text-xs font-lato-bold ${MILESTONE_STATUS_COLORS[milestone.status]}`}>
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
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-lato-bold text-gray-900">Issues</h3>
            <Button size="sm" onClick={handleAddIssue}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          {project.issues.length > 0 ? (
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
                    <span className={`px-2 py-1 rounded text-xs font-lato-bold ${ISSUE_SEVERITY_COLORS[issue.severity]}`}>
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
