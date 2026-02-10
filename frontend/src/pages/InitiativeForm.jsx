import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { format } from 'date-fns';
import {
  ChevronLeft,
  Loader2,
  CalendarIcon,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const InitiativeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    buckets: [],
    domains: [],
    teams: [],
    stages: [],
    statuses: [],
    riskTypes: [],
    metrics: [],
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bucket: 'Stabilization',
    business_domain: 'IT',
    lifecycle_stage: 'Request',
    executive_sponsor: '',
    initiative_owner: '',
    owning_team: 'Engineering',
    supporting_teams: [],
    status: 'Not Started',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    target_end_date: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    metric_ids: [],
    milestones: [],
    risks: [],
    financial: {
      approved_budget: 0,
      forecasted_spend: 0,
      actual_spend: 0,
      roi_hypothesis: '',
    },
    team_members: [],
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [buckets, domains, teams, stages, statuses, riskTypes, metrics] = await Promise.all([
          api.get('/config/buckets'),
          api.get('/config/domains'),
          api.get('/config/teams'),
          api.get('/config/stages'),
          api.get('/config/statuses'),
          api.get('/config/risk-types'),
          api.get('/enterprise-metrics'),
        ]);
        setConfig({
          buckets: buckets.data,
          domains: domains.data,
          teams: teams.data,
          stages: stages.data,
          statuses: statuses.data,
          riskTypes: riskTypes.data,
          metrics: metrics.data,
        });
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const fetchInitiative = async () => {
        try {
          const response = await api.get(`/initiatives/${id}`);
          const data = response.data;
          setFormData({
            name: data.name || '',
            description: data.description || '',
            bucket: data.bucket || 'Stabilization',
            business_domain: data.business_domain || 'IT',
            lifecycle_stage: data.lifecycle_stage || 'Request',
            executive_sponsor: data.executive_sponsor || '',
            initiative_owner: data.initiative_owner || '',
            owning_team: data.owning_team || 'Engineering',
            supporting_teams: data.supporting_teams || [],
            status: data.status || 'Not Started',
            start_date: data.start_date || format(new Date(), 'yyyy-MM-dd'),
            target_end_date: data.target_end_date || format(new Date(), 'yyyy-MM-dd'),
            metric_ids: data.metric_ids || [],
            milestones: data.milestones || [],
            risks: data.risks || [],
            financial: data.financial || { approved_budget: 0, forecasted_spend: 0, actual_spend: 0, roi_hypothesis: '' },
            team_members: data.team_members || [],
          });
        } catch (error) {
          toast.error('Failed to load initiative');
          navigate('/initiatives');
        } finally {
          setLoading(false);
        }
      };
      fetchInitiative();
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Initiative name is required');
      return;
    }

    try {
      setSaving(true);
      
      if (isEdit) {
        await api.put(`/initiatives/${id}`, {
          name: formData.name,
          description: formData.description,
          bucket: formData.bucket,
          business_domain: formData.business_domain,
          lifecycle_stage: formData.lifecycle_stage,
          executive_sponsor: formData.executive_sponsor,
          initiative_owner: formData.initiative_owner,
          owning_team: formData.owning_team,
          supporting_teams: formData.supporting_teams,
          status: formData.status,
          start_date: formData.start_date,
          target_end_date: formData.target_end_date,
          metric_ids: formData.metric_ids,
        });
        toast.success('Initiative updated successfully');
      } else {
        const response = await api.post('/initiatives', formData);
        toast.success('Initiative created successfully');
        navigate(`/initiatives/${response.data.id}`);
        return;
      }
      
      navigate(`/initiatives/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save initiative');
    } finally {
      setSaving(false);
    }
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        {
          name: '',
          description: '',
          owner: '',
          due_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'Pending',
          dependency_indicator: '',
          ai_risk_signal: 'Low',
        },
      ],
    });
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...formData.milestones];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, milestones: updated });
  };

  const removeMilestone = (index) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index),
    });
  };

  const addRisk = () => {
    setFormData({
      ...formData,
      risks: [
        ...formData.risks,
        {
          description: '',
          risk_type: 'Delivery',
          impact: 'Medium',
          likelihood: 'Medium',
          mitigation_plan: '',
          risk_owner: '',
          escalation_flag: false,
        },
      ],
    });
  };

  const updateRisk = (index, field, value) => {
    const updated = [...formData.risks];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, risks: updated });
  };

  const removeRisk = (index) => {
    setFormData({
      ...formData,
      risks: formData.risks.filter((_, i) => i !== index),
    });
  };

  const addTeamMember = () => {
    setFormData({
      ...formData,
      team_members: [
        ...formData.team_members,
        {
          name: '',
          role: '',
          team: 'Engineering',
          allocation_percent: 100,
        },
      ],
    });
  };

  const updateTeamMember = (index, field, value) => {
    const updated = [...formData.team_members];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, team_members: updated });
  };

  const removeTeamMember = (index) => {
    setFormData({
      ...formData,
      team_members: formData.team_members.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" data-testid="initiative-form-page">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(isEdit ? `/initiatives/${id}` : '/initiatives')}
        data-testid="back-btn"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        {isEdit ? 'Back to Initiative' : 'Back to List'}
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading uppercase tracking-tight">
              Initiative Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Initiative Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="initiative-name-input"
                  className="rounded-sm"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="initiative-description-input"
                  className="rounded-sm"
                  rows={3}
                />
              </div>

              <div>
                <Label>Initiative Bucket</Label>
                <Select
                  value={formData.bucket}
                  onValueChange={(v) => setFormData({ ...formData, bucket: v })}
                >
                  <SelectTrigger className="rounded-sm" data-testid="bucket-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.buckets.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="rounded-sm" data-testid="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Track">On Track</SelectItem>
                    <SelectItem value="At Risk">At Risk</SelectItem>
                    <SelectItem value="Off Track">Off Track</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-sm">
                <Switch
                  checked={formData.code_red_flag}
                  onCheckedChange={(checked) => setFormData({ ...formData, code_red_flag: checked })}
                  data-testid="code-red-switch"
                />
                <div>
                  <Label className="text-red-800 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Code Red Initiative
                  </Label>
                  <p className="text-sm text-red-600">Mark this initiative as critical and requiring immediate executive attention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading uppercase tracking-tight">
              Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Business Domain</Label>
                <Select
                  value={formData.business_domain}
                  onValueChange={(v) => setFormData({ ...formData, business_domain: v })}
                >
                  <SelectTrigger className="rounded-sm" data-testid="domain-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.domains.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lifecycle Stage</Label>
                <Select
                  value={formData.lifecycle_stage}
                  onValueChange={(v) => setFormData({ ...formData, lifecycle_stage: v })}
                >
                  <SelectTrigger className="rounded-sm" data-testid="stage-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.stages.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ownership */}
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading uppercase tracking-tight">
              Ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sponsor">Executive Sponsor</Label>
                <Input
                  id="sponsor"
                  value={formData.executive_sponsor}
                  onChange={(e) => setFormData({ ...formData, executive_sponsor: e.target.value })}
                  data-testid="sponsor-input"
                  className="rounded-sm"
                />
              </div>

              <div>
                <Label htmlFor="owner">Initiative Owner</Label>
                <Input
                  id="owner"
                  value={formData.initiative_owner}
                  onChange={(e) => setFormData({ ...formData, initiative_owner: e.target.value })}
                  data-testid="owner-input"
                  className="rounded-sm"
                />
              </div>

              <div>
                <Label>Owning Team</Label>
                <Select
                  value={formData.owning_team}
                  onValueChange={(v) => setFormData({ ...formData, owning_team: v })}
                >
                  <SelectTrigger className="rounded-sm" data-testid="team-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.teams.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading uppercase tracking-tight">
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal rounded-sm"
                      data-testid="start-date-btn"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(new Date(formData.start_date), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.start_date ? new Date(formData.start_date) : undefined}
                      onSelect={(date) => date && setFormData({ ...formData, start_date: format(date, 'yyyy-MM-dd') })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Target End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal rounded-sm"
                      data-testid="end-date-btn"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.target_end_date ? format(new Date(formData.target_end_date), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.target_end_date ? new Date(formData.target_end_date) : undefined}
                      onSelect={(date) => date && setFormData({ ...formData, target_end_date: format(date, 'yyyy-MM-dd') })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial - Only show on create */}
        {!isEdit && (
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardHeader>
              <CardTitle className="text-lg font-heading uppercase tracking-tight">
                Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="budget">Approved Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.financial.approved_budget}
                    onChange={(e) => setFormData({
                      ...formData,
                      financial: { ...formData.financial, approved_budget: parseFloat(e.target.value) || 0 }
                    })}
                    data-testid="budget-input"
                    className="rounded-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="forecasted">Forecasted Spend ($)</Label>
                  <Input
                    id="forecasted"
                    type="number"
                    value={formData.financial.forecasted_spend}
                    onChange={(e) => setFormData({
                      ...formData,
                      financial: { ...formData.financial, forecasted_spend: parseFloat(e.target.value) || 0 }
                    })}
                    data-testid="forecasted-input"
                    className="rounded-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="actual">Actual Spend ($)</Label>
                  <Input
                    id="actual"
                    type="number"
                    value={formData.financial.actual_spend}
                    onChange={(e) => setFormData({
                      ...formData,
                      financial: { ...formData.financial, actual_spend: parseFloat(e.target.value) || 0 }
                    })}
                    data-testid="actual-input"
                    className="rounded-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="roi">ROI Hypothesis</Label>
                <Textarea
                  id="roi"
                  value={formData.financial.roi_hypothesis}
                  onChange={(e) => setFormData({
                    ...formData,
                    financial: { ...formData.financial, roi_hypothesis: e.target.value }
                  })}
                  data-testid="roi-input"
                  className="rounded-sm"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Milestones - Only show on create */}
        {!isEdit && (
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-heading uppercase tracking-tight">
                Milestones
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMilestone}
                data-testid="add-milestone-btn"
                className="rounded-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.milestones.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No milestones added yet</p>
              ) : (
                formData.milestones.map((milestone, index) => (
                  <div key={index} className="border border-gray-200 rounded-sm p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold text-gray-700">Milestone {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={milestone.name}
                          onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                          className="rounded-sm"
                        />
                      </div>
                      <div>
                        <Label>Owner</Label>
                        <Input
                          value={milestone.owner}
                          onChange={(e) => updateMilestone(index, 'owner', e.target.value)}
                          className="rounded-sm"
                        />
                      </div>
                      <div>
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={milestone.due_date}
                          onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                          className="rounded-sm"
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={milestone.status}
                          onValueChange={(v) => updateMilestone(index, 'status', v)}
                        >
                          <SelectTrigger className="rounded-sm">
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
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Risks - Only show on create */}
        {!isEdit && (
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-heading uppercase tracking-tight">
                Risks
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRisk}
                data-testid="add-risk-btn"
                className="rounded-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Risk
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.risks.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No risks added yet</p>
              ) : (
                formData.risks.map((risk, index) => (
                  <div key={index} className="border border-gray-200 rounded-sm p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold text-gray-700">Risk {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRisk(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={risk.description}
                          onChange={(e) => updateRisk(index, 'description', e.target.value)}
                          className="rounded-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Risk Type</Label>
                        <Select
                          value={risk.risk_type}
                          onValueChange={(v) => updateRisk(index, 'risk_type', v)}
                        >
                          <SelectTrigger className="rounded-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {config.riskTypes.map((rt) => (
                              <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Impact</Label>
                        <Select
                          value={risk.impact}
                          onValueChange={(v) => updateRisk(index, 'impact', v)}
                        >
                          <SelectTrigger className="rounded-sm">
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
                        <Label>Likelihood</Label>
                        <Select
                          value={risk.likelihood}
                          onValueChange={(v) => updateRisk(index, 'likelihood', v)}
                        >
                          <SelectTrigger className="rounded-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <Switch
                          checked={risk.escalation_flag}
                          onCheckedChange={(checked) => updateRisk(index, 'escalation_flag', checked)}
                        />
                        <Label className="text-red-600">Escalation Required</Label>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Team Members - Only show on create */}
        {!isEdit && (
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-heading uppercase tracking-tight">
                Team Members
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTeamMember}
                data-testid="add-team-member-btn"
                className="rounded-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.team_members.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No team members added yet</p>
              ) : (
                formData.team_members.map((member, index) => (
                  <div key={index} className="border border-gray-200 rounded-sm p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold text-gray-700">Member {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeamMember(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={member.name}
                          onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                          className="rounded-sm"
                        />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Input
                          value={member.role}
                          onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                          className="rounded-sm"
                        />
                      </div>
                      <div>
                        <Label>Team</Label>
                        <Select
                          value={member.team}
                          onValueChange={(v) => updateTeamMember(index, 'team', v)}
                        >
                          <SelectTrigger className="rounded-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {config.teams.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Allocation %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={member.allocation_percent}
                          onChange={(e) => updateTeamMember(index, 'allocation_percent', parseFloat(e.target.value) || 0)}
                          className="rounded-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/initiatives/${id}` : '/initiatives')}
            data-testid="cancel-btn"
            className="rounded-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            data-testid="save-initiative-btn"
            className="bg-[#FE5B1B] hover:bg-[#E0480E] text-white rounded-sm font-semibold uppercase tracking-wide"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEdit ? 'Update Initiative' : 'Create Initiative'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InitiativeForm;
