import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  DollarSign,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Users,
  Flag,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const InitiativeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchInitiative = async () => {
      try {
        const response = await api.get(`/initiatives/${id}`);
        setInitiative(response.data);
      } catch (error) {
        toast.error('Failed to load initiative');
        navigate('/initiatives');
      } finally {
        setLoading(false);
      }
    };
    fetchInitiative();
  }, [id, navigate]);

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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'On Track': 'bg-green-100 text-green-800 border-green-200',
      'At Risk': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Off Track': 'bg-red-100 text-red-800 border-red-200',
      'Completed': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending': 'bg-gray-100 text-gray-800 border-gray-200',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Delayed': 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getConfidenceColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskSignalColor = (signal) => {
    const colors = {
      'Low': 'text-green-600',
      'Medium': 'text-yellow-600',
      'High': 'text-red-600',
    };
    return colors[signal] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!initiative) {
    return null;
  }

  const milestones = initiative.milestones || [];
  const risks = initiative.risks || [];
  const financial = initiative.financial || {};
  const teamMembers = initiative.team_members || [];
  const completedMilestones = milestones.filter(m => m.status === 'Completed').length;
  const escalatedRisks = risks.filter(r => r.escalation_flag);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="initiative-detail-page">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/initiatives')}
        data-testid="back-btn"
        className="mb-4"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to Initiatives
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {initiative.code_red_flag && (
              <span className="inline-flex items-center px-3 py-1 rounded-sm text-sm font-bold uppercase tracking-wide bg-red-600 text-white animate-pulse">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Code Red
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide border ${getStatusBadge(initiative.status)}`}>
              {initiative.status}
            </span>
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              {initiative.bucket}
            </span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase tracking-tight">
            {initiative.name}
          </h1>
          <p className="text-gray-600 mt-2">{initiative.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/initiatives/${id}/edit`)}
            data-testid="edit-initiative-btn"
            className="rounded-sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                data-testid="delete-initiative-btn"
                className="rounded-sm text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Initiative?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the initiative and all associated milestones, risks, and financial data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Four Blocker Summary */}
      <div className="grid grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded-sm">
        {/* Block 1: Overview */}
        <div className="bg-white p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Owner</p>
                <p className="font-medium">{initiative.initiative_owner || 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Team</p>
                <p className="font-medium">{initiative.owning_team}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Domain</p>
                <p className="font-medium">{initiative.business_domain}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Flag className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Stage</p>
                <p className="font-medium">{initiative.lifecycle_stage}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Block 2: Progress */}
        <div className="bg-white p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Progress & Schedule</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Milestones</span>
                <span className="font-medium">{completedMilestones} / {milestones.length}</span>
              </div>
              <Progress 
                value={milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0}
                className="h-2 bg-gray-200"
              />
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Timeline</p>
                <p className="font-medium text-sm">{formatDate(initiative.start_date)} - {formatDate(initiative.target_end_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-16 h-16 rounded-sm ${getConfidenceColor(initiative.confidence_score)} flex items-center justify-center`}>
                <span className="text-white font-bold text-2xl">{initiative.confidence_score}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">AI Confidence Score</p>
                <p className="font-medium">
                  {initiative.confidence_score >= 70 ? 'High Confidence' :
                   initiative.confidence_score >= 40 ? 'Moderate Risk' : 'High Risk'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Block 3: Risks */}
        <div className="bg-white p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Top Risks & Issues</h3>
          {risks.length === 0 ? (
            <p className="text-gray-500 text-sm">No risks identified</p>
          ) : (
            <div className="space-y-3">
              {risks.slice(0, 3).map((risk, index) => (
                <div key={risk.id || index} className="flex items-start gap-2">
                  {risk.escalation_flag ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 line-clamp-2">{risk.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {risk.risk_type} • Impact: {risk.impact} • Likelihood: {risk.likelihood}
                    </p>
                  </div>
                </div>
              ))}
              {escalatedRisks.length > 0 && (
                <p className="text-xs font-semibold text-red-600 mt-2">
                  {escalatedRisks.length} escalated risk{escalatedRisks.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Block 4: Financial */}
        <div className="bg-white p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Financials</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Approved Budget</span>
              <span className="font-medium">{formatCurrency(financial.approved_budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Forecasted</span>
              <span className="font-medium">{formatCurrency(financial.forecasted_spend)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Actual Spend</span>
              <span className="font-medium">{formatCurrency(financial.actual_spend)}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="text-gray-500 text-sm">Variance</span>
              <span className={`font-bold flex items-center ${financial.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {financial.variance > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {formatCurrency(Math.abs(financial.variance))}
              </span>
            </div>
            {financial.roi_hypothesis && (
              <div className="mt-3 p-3 bg-gray-50 rounded-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">ROI Hypothesis</p>
                <p className="text-sm text-gray-700">{financial.roi_hypothesis}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="milestones" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-sm">
          <TabsTrigger value="milestones" className="rounded-sm data-[state=active]:bg-white">
            Milestones ({milestones.length})
          </TabsTrigger>
          <TabsTrigger value="risks" className="rounded-sm data-[state=active]:bg-white">
            Risks ({risks.length})
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-sm data-[state=active]:bg-white">
            Team ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-sm data-[state=active]:bg-white">
            Audit
          </TabsTrigger>
        </TabsList>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardContent className="p-0">
              {milestones.length === 0 ? (
                <div className="p-8 text-center">
                  <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No milestones defined</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Milestone</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Owner</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Due Date</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase text-center">Status</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase text-center">AI Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones.map((milestone) => (
                      <TableRow key={milestone.id} className="border-b border-gray-100">
                        <TableCell>
                          <div>
                            <p className="font-medium">{milestone.name}</p>
                            {milestone.description && (
                              <p className="text-sm text-gray-500 line-clamp-1">{milestone.description}</p>
                            )}
                            {milestone.dependency_indicator && (
                              <p className="text-xs text-[#FE5B1B] mt-1">Depends on: {milestone.dependency_indicator}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{milestone.owner || 'Unassigned'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{formatDate(milestone.due_date)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide border ${getStatusBadge(milestone.status)}`}>
                            {milestone.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${getRiskSignalColor(milestone.ai_risk_signal)}`}>
                            {milestone.ai_risk_signal}
                          </span>
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
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardContent className="p-0">
              {risks.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No risks identified</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Risk</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Type</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase text-center">Impact</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase text-center">Likelihood</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Owner</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase text-center">Escalated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.map((risk) => (
                      <TableRow key={risk.id} className={`border-b border-gray-100 ${risk.escalation_flag ? 'bg-red-50' : ''}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{risk.description}</p>
                            {risk.mitigation_plan && (
                              <p className="text-sm text-gray-500 mt-1">
                                <span className="font-medium">Mitigation:</span> {risk.mitigation_plan}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{risk.risk_type}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${risk.impact === 'High' ? 'text-red-600' : risk.impact === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {risk.impact}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${risk.likelihood === 'High' ? 'text-red-600' : risk.likelihood === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {risk.likelihood}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{risk.risk_owner || 'Unassigned'}</TableCell>
                        <TableCell className="text-center">
                          {risk.escalation_flag ? (
                            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto animate-pulse" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
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
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardContent className="p-0">
              {teamMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No team members assigned</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Name</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Role</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase">Team</TableHead>
                      <TableHead className="text-xs font-bold text-gray-600 uppercase text-center">Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id} className="border-b border-gray-100">
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{member.role}</TableCell>
                        <TableCell className="text-sm text-gray-600">{member.team}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">{member.allocation_percent}%</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card className="border-gray-200 shadow-sm rounded-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="font-medium">{formatDate(initiative.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Last Updated</p>
                    <p className="font-medium">{formatDate(initiative.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Executive Sponsor</p>
                    <p className="font-medium">{initiative.executive_sponsor || 'Not assigned'}</p>
                  </div>
                </div>
                {initiative.supporting_teams?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Supporting Teams</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {initiative.supporting_teams.map((team, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs bg-gray-100 text-gray-700">
                            {team}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InitiativeDetail;
