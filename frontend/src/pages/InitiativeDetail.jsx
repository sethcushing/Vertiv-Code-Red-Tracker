import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertTriangle,
  Edit,
  Trash2,
  User,
  Calendar,
  Target,
  Clock,
  AlertCircle,
  ChevronLeft,
  Users,
  Flag,
  Plus,
  Loader2,
} from 'lucide-react';

const InitiativeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [config, setConfig] = useState({ teams: [], riskTypes: [] });
  
  // Dialog states
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [milestoneForm, setMilestoneForm] = useState({
    name: '', description: '', owner: '', due_date: '', status: 'Pending', dependency_indicator: '', ai_risk_signal: 'Low'
  });
  const [riskForm, setRiskForm] = useState({
    description: '', risk_type: 'Delivery', impact: 'Medium', likelihood: 'Medium', mitigation_plan: '', risk_owner: '', escalation_flag: false
  });
  const [teamForm, setTeamForm] = useState({
    name: '', role: '', team: 'Engineering', allocation_percent: 100
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [initRes, teamsRes, riskTypesRes] = await Promise.all([
          api.get(`/initiatives/${id}`),
          api.get('/config/teams'),
          api.get('/config/risk-types')
        ]);
        setInitiative(initRes.data);
        setConfig({ teams: teamsRes.data, riskTypes: riskTypesRes.data });
      } catch (error) {
        toast.error('Failed to load initiative');
        navigate('/initiatives');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const refreshInitiative = async () => {
    const res = await api.get(`/initiatives/${id}`);
    setInitiative(res.data);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/initiatives/${id}`);
      toast.success('Initiative deleted');
      navigate('/initiatives');
    } catch (error) {
      toast.error('Failed to delete initiative');
    } finally {
      setDeleting(false);
    }
  };

  // Milestone handlers
  const openMilestoneDialog = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({ ...milestone });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({ name: '', description: '', owner: '', due_date: new Date().toISOString().split('T')[0], status: 'Pending', dependency_indicator: '', ai_risk_signal: 'Low' });
    }
    setMilestoneDialogOpen(true);
  };

  const saveMilestone = async () => {
    if (!milestoneForm.name) { toast.error('Milestone name is required'); return; }
    try {
      setSaving(true);
      if (editingMilestone) {
        await api.put(`/initiatives/${id}/milestones/${editingMilestone.id}`, milestoneForm);
        toast.success('Milestone updated');
      } else {
        await api.post(`/initiatives/${id}/milestones`, milestoneForm);
        toast.success('Milestone added');
      }
      await refreshInitiative();
      setMilestoneDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const deleteMilestone = async (milestoneId) => {
    try {
      await api.delete(`/initiatives/${id}/milestones/${milestoneId}`);
      toast.success('Milestone deleted');
      await refreshInitiative();
    } catch (error) {
      toast.error('Failed to delete milestone');
    }
  };

  // Risk handlers
  const openRiskDialog = (risk = null) => {
    if (risk) {
      setEditingRisk(risk);
      setRiskForm({ ...risk });
    } else {
      setEditingRisk(null);
      setRiskForm({ description: '', risk_type: 'Delivery', impact: 'Medium', likelihood: 'Medium', mitigation_plan: '', risk_owner: '', escalation_flag: false });
    }
    setRiskDialogOpen(true);
  };

  const saveRisk = async () => {
    if (!riskForm.description) { toast.error('Risk description is required'); return; }
    try {
      setSaving(true);
      if (editingRisk) {
        await api.put(`/initiatives/${id}/risks/${editingRisk.id}`, riskForm);
        toast.success('Risk updated');
      } else {
        await api.post(`/initiatives/${id}/risks`, riskForm);
        toast.success('Risk added');
      }
      await refreshInitiative();
      setRiskDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save risk');
    } finally {
      setSaving(false);
    }
  };

  const deleteRisk = async (riskId) => {
    try {
      await api.delete(`/initiatives/${id}/risks/${riskId}`);
      toast.success('Risk deleted');
      await refreshInitiative();
    } catch (error) {
      toast.error('Failed to delete risk');
    }
  };

  // Team member handlers
  const openTeamDialog = () => {
    setTeamForm({ name: '', role: '', team: 'Engineering', allocation_percent: 100 });
    setTeamDialogOpen(true);
  };

  const saveTeamMember = async () => {
    if (!teamForm.name || !teamForm.role) { toast.error('Name and role are required'); return; }
    try {
      setSaving(true);
      await api.post(`/initiatives/${id}/team`, teamForm);
      toast.success('Team member added');
      await refreshInitiative();
      setTeamDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  const deleteTeamMember = async (memberId) => {
    try {
      await api.delete(`/initiatives/${id}/team/${memberId}`);
      toast.success('Team member removed');
      await refreshInitiative();
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Not Started': 'bg-gray-100 text-gray-800',
      'Discovery': 'bg-blue-100 text-blue-800',
      'Frame': 'bg-purple-100 text-purple-800',
      'Work In Progress': 'bg-yellow-100 text-yellow-800',
      'Implemented': 'bg-green-100 text-green-800',
      'Completed': 'bg-green-100 text-green-800',
      'Pending': 'bg-gray-100 text-gray-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Delayed': 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getConfidenceColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!initiative) return null;

  const milestones = initiative.milestones || [];
  const risks = initiative.risks || [];
  const teamMembers = initiative.team_members || [];
  const completedMilestones = milestones.filter(m => m.status === 'Completed').length;
  const escalatedRisks = risks.filter(r => r.escalation_flag);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="initiative-detail-page">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/initiatives')} data-testid="back-btn" className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to Initiatives
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-lato-bold uppercase tracking-wide ${getStatusBadge(initiative.status)}`}>
              {initiative.status}
            </span>
            <span className="text-sm text-gray-500 uppercase tracking-wider font-lato-light">{initiative.bucket}</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase tracking-tight">{initiative.name}</h1>
          <p className="text-gray-600 mt-2 font-lato-light">{initiative.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/initiatives/${id}/edit`)} data-testid="edit-initiative-btn" className="rounded-lg">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" data-testid="delete-initiative-btn" className="rounded-lg text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Initiative?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200/80 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-lato-light">Owner</p>
                <p className="font-lato-bold text-sm">{initiative.initiative_owner || 'Unassigned'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/80 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-lato-light">Team</p>
                <p className="font-lato-bold text-sm">{initiative.owning_team}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/80 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-lato-light">Stage</p>
                <p className="font-lato-bold text-sm truncate">{initiative.lifecycle_stage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/80 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg ${getConfidenceColor(initiative.confidence_score)} flex items-center justify-center`}>
                <span className="text-white font-lato-bold text-lg">{initiative.confidence_score}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-lato-light">Confidence</p>
                <p className="font-lato-bold text-sm">{initiative.confidence_score >= 70 ? 'High' : initiative.confidence_score >= 40 ? 'Medium' : 'Low'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card className="border-gray-200/80 rounded-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-lato-bold text-gray-700">Milestone Progress</span>
            <span className="text-sm font-lato-regular">{completedMilestones} / {milestones.length} completed</span>
          </div>
          <Progress value={milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0} className="h-3 bg-gray-200" />
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500 font-lato-light">
            <span><Calendar className="w-3 h-3 inline mr-1" />{formatDate(initiative.start_date)}</span>
            <span>{formatDate(initiative.target_end_date)}<Calendar className="w-3 h-3 inline ml-1" /></span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="milestones" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="milestones" className="rounded-md data-[state=active]:bg-white">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="risks" className="rounded-md data-[state=active]:bg-white">Risks ({risks.length})</TabsTrigger>
          <TabsTrigger value="team" className="rounded-md data-[state=active]:bg-white">Team ({teamMembers.length})</TabsTrigger>
        </TabsList>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card className="border-gray-200/80 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-heading uppercase">Milestones</CardTitle>
              <Button size="sm" onClick={() => openMilestoneDialog()} data-testid="add-milestone-btn" className="rounded-lg" style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}>
                <Plus className="w-4 h-4 mr-1" /> Add Milestone
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {milestones.length === 0 ? (
                <div className="p-8 text-center"><Target className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No milestones yet</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Milestone</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Owner</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Due Date</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Status</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones.map((m) => (
                      <TableRow key={m.id} className="border-b border-gray-100">
                        <TableCell>
                          <p className="font-lato-regular">{m.name}</p>
                          {m.description && <p className="text-xs text-gray-500 font-lato-light line-clamp-1">{m.description}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 font-lato-light">{m.owner || 'Unassigned'}</TableCell>
                        <TableCell className="text-sm text-gray-600 font-lato-light">{formatDate(m.due_date)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-lato-bold uppercase ${getStatusBadge(m.status)}`}>{m.status}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openMilestoneDialog(m)}><Edit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteMilestone(m.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks">
          <Card className="border-gray-200/80 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-heading uppercase">Risks</CardTitle>
              <Button size="sm" onClick={() => openRiskDialog()} data-testid="add-risk-btn" className="rounded-lg" style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}>
                <Plus className="w-4 h-4 mr-1" /> Add Risk
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {risks.length === 0 ? (
                <div className="p-8 text-center"><AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No risks identified</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Risk</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Type</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Impact</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Likelihood</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Escalated</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.map((r) => (
                      <TableRow key={r.id} className={`border-b border-gray-100 ${r.escalation_flag ? 'bg-red-50' : ''}`}>
                        <TableCell>
                          <p className="font-lato-regular">{r.description}</p>
                          {r.mitigation_plan && <p className="text-xs text-gray-500 mt-1 font-lato-light"><span className="font-lato-regular">Mitigation:</span> {r.mitigation_plan}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 font-lato-light">{r.risk_type}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-lato-bold ${r.impact === 'High' ? 'text-red-600' : r.impact === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>{r.impact}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-lato-bold ${r.likelihood === 'High' ? 'text-red-600' : r.likelihood === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>{r.likelihood}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {r.escalation_flag ? <AlertTriangle className="w-5 h-5 text-red-500 mx-auto animate-pulse" /> : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openRiskDialog(r)}><Edit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteRisk(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card className="border-gray-200/80 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-heading uppercase">Team Members</CardTitle>
              <Button size="sm" onClick={openTeamDialog} data-testid="add-team-btn" className="rounded-lg" style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}>
                <Plus className="w-4 h-4 mr-1" /> Add Member
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {teamMembers.length === 0 ? (
                <div className="p-8 text-center"><Users className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No team members assigned</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Name</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Role</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Team</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Allocation</TableHead>
                      <TableHead className="text-xs font-lato-bold text-gray-600 uppercase w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((tm) => (
                      <TableRow key={tm.id} className="border-b border-gray-100">
                        <TableCell className="font-lato-regular">{tm.name}</TableCell>
                        <TableCell className="text-sm text-gray-600 font-lato-light">{tm.role}</TableCell>
                        <TableCell className="text-sm text-gray-600 font-lato-light">{tm.team}</TableCell>
                        <TableCell className="text-center"><span className="text-sm font-lato-bold">{tm.allocation_percent}%</span></TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deleteTeamMember(tm.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Name *</Label><Input value={milestoneForm.name} onChange={(e) => setMilestoneForm({...milestoneForm, name: e.target.value})} className="rounded-md" /></div>
            <div><Label>Description</Label><Textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm({...milestoneForm, description: e.target.value})} className="rounded-md" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Owner</Label><Input value={milestoneForm.owner} onChange={(e) => setMilestoneForm({...milestoneForm, owner: e.target.value})} className="rounded-md" /></div>
              <div><Label>Due Date</Label><Input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({...milestoneForm, due_date: e.target.value})} className="rounded-md" /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={milestoneForm.status} onValueChange={(v) => setMilestoneForm({...milestoneForm, status: v})}>
                <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveMilestone} disabled={saving} style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{editingMilestone ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Risk Dialog */}
      <Dialog open={riskDialogOpen} onOpenChange={setRiskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Description *</Label><Textarea value={riskForm.description} onChange={(e) => setRiskForm({...riskForm, description: e.target.value})} className="rounded-md" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Risk Type</Label>
                <Select value={riskForm.risk_type} onValueChange={(v) => setRiskForm({...riskForm, risk_type: v})}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {config.riskTypes.map(rt => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Risk Owner</Label><Input value={riskForm.risk_owner} onChange={(e) => setRiskForm({...riskForm, risk_owner: e.target.value})} className="rounded-md" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Impact</Label>
                <Select value={riskForm.impact} onValueChange={(v) => setRiskForm({...riskForm, impact: v})}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Likelihood</Label>
                <Select value={riskForm.likelihood} onValueChange={(v) => setRiskForm({...riskForm, likelihood: v})}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Mitigation Plan</Label><Textarea value={riskForm.mitigation_plan} onChange={(e) => setRiskForm({...riskForm, mitigation_plan: e.target.value})} className="rounded-md" rows={2} /></div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-md">
              <Switch checked={riskForm.escalation_flag} onCheckedChange={(c) => setRiskForm({...riskForm, escalation_flag: c})} />
              <Label className="text-red-700">Escalation Required</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRisk} disabled={saving} style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{editingRisk ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Member Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Name *</Label><Input value={teamForm.name} onChange={(e) => setTeamForm({...teamForm, name: e.target.value})} className="rounded-md" /></div>
            <div><Label>Role *</Label><Input value={teamForm.role} onChange={(e) => setTeamForm({...teamForm, role: e.target.value})} className="rounded-md" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Team</Label>
                <Select value={teamForm.team} onValueChange={(v) => setTeamForm({...teamForm, team: v})}>
                  <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {config.teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Allocation %</Label><Input type="number" min="0" max="100" value={teamForm.allocation_percent} onChange={(e) => setTeamForm({...teamForm, allocation_percent: parseInt(e.target.value) || 0})} className="rounded-md" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTeamMember} disabled={saving} style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InitiativeDetail;
