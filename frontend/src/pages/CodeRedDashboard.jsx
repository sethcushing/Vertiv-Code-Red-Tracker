import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  DollarSign,
  AlertCircle,
  User,
} from 'lucide-react';

const CodeRedDashboard = () => {
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCodeRedInitiatives = async () => {
      try {
        const response = await api.get('/initiatives', { params: { code_red: true } });
        setInitiatives(response.data);
      } catch (error) {
        toast.error('Failed to load Code Red initiatives');
      } finally {
        setLoading(false);
      }
    };
    fetchCodeRedInitiatives();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'On Track': 'bg-green-100 text-green-800 border-green-200',
      'At Risk': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Off Track': 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Code Red initiatives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="code-red-dashboard">
      {/* Alert Banner */}
      <div className="bg-red-600 text-white p-4 rounded-sm flex items-center gap-4">
        <div className="w-12 h-12 bg-red-500 rounded-sm flex items-center justify-center animate-pulse">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl uppercase tracking-tight">
            Code Red Alert
          </h2>
          <p className="text-red-100 text-sm">
            {initiatives.length} critical initiative{initiatives.length !== 1 ? 's' : ''} requiring immediate executive attention
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 shadow-sm rounded-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Code Red</p>
                <p className="text-2xl font-heading font-bold text-red-600">{initiatives.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-sm flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">At Risk / Off Track</p>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {initiatives.filter(i => i.status === 'At Risk' || i.status === 'Off Track').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Exposure</p>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {formatCurrency(initiatives.reduce((sum, i) => sum + (i.financial?.approved_budget || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Initiative List */}
      {initiatives.length === 0 ? (
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-sm flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-heading font-bold text-lg text-gray-900 uppercase">No Code Red Initiatives</h3>
            <p className="text-gray-600 mt-2">All critical issues have been resolved.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {initiatives.map((initiative) => {
            const milestones = initiative.milestones || [];
            const completed = milestones.filter(m => m.status === 'Completed').length;
            const escalatedRisks = (initiative.risks || []).filter(r => r.escalation_flag);
            
            return (
              <Card 
                key={initiative.id}
                data-testid={`code-red-initiative-${initiative.id}`}
                className="border-l-4 border-l-red-600 border-gray-200 shadow-sm rounded-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide bg-red-100 text-red-800 border border-red-200 animate-pulse">
                          Code Red
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide border ${getStatusBadge(initiative.status)}`}>
                          {initiative.status}
                        </span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">
                          {initiative.lifecycle_stage}
                        </span>
                      </div>
                      
                      <Link 
                        to={`/initiatives/${initiative.id}`}
                        className="group"
                      >
                        <h3 className="font-heading font-bold text-xl text-gray-900 uppercase tracking-tight group-hover:text-[#FE5B1B] transition-colors flex items-center">
                          {initiative.name}
                          <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                      </Link>
                      
                      <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {initiative.initiative_owner || 'Unassigned'}
                        </span>
                        <span>{initiative.owning_team}</span>
                        <span>{initiative.business_domain}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`w-16 h-16 rounded-sm flex items-center justify-center ${
                        initiative.confidence_score >= 70 ? 'bg-green-500' :
                        initiative.confidence_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        <span className="text-white font-bold text-xl">{initiative.confidence_score}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Confidence</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
                    {/* Milestones Progress */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Milestone Progress</p>
                      <Progress 
                        value={milestones.length > 0 ? (completed / milestones.length) * 100 : 0} 
                        className="h-2 bg-gray-200"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        {completed} of {milestones.length} completed
                      </p>
                    </div>

                    {/* Escalated Risks */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Escalated Risks</p>
                      {escalatedRisks.length > 0 ? (
                        <div className="space-y-1">
                          {escalatedRisks.slice(0, 2).map((risk, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700 line-clamp-1">{risk.description}</span>
                            </div>
                          ))}
                          {escalatedRisks.length > 2 && (
                            <p className="text-xs text-gray-500">+{escalatedRisks.length - 2} more</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No escalated risks</p>
                      )}
                    </div>

                    {/* Financial */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Financial Status</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Budget:</span>
                          <span className="font-medium">{formatCurrency(initiative.financial?.approved_budget || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Spent:</span>
                          <span className="font-medium">{formatCurrency(initiative.financial?.actual_spend || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Variance:</span>
                          <span className={`font-medium ${(initiative.financial?.variance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(initiative.financial?.variance || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CodeRedDashboard;
