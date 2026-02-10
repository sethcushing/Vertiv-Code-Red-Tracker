import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Target, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

const MetricDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [metric, setMetric] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [metricRes, initiativesRes] = await Promise.all([
        api.get(`/enterprise-metrics/${id}`),
        api.get(`/enterprise-metrics/${id}/initiatives`)
      ]);
      setMetric(metricRes.data);
      setInitiatives(initiativesRes.data);
    } catch (error) {
      toast.error('Failed to load metric details');
      navigate('/enterprise-metrics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Not Started': 'bg-gray-100 text-gray-700',
      'Discovery': 'bg-blue-100 text-blue-700',
      'Frame': 'bg-purple-100 text-purple-700',
      'Work In Progress': 'bg-yellow-100 text-yellow-700',
      'Implemented': 'bg-green-100 text-green-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getConfidenceColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (current, target) => {
    if (!current || !target) return <Minus className="w-5 h-5 text-gray-400" />;
    const ratio = current / target;
    if (ratio >= 1) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (ratio >= 0.8) return <Minus className="w-5 h-5 text-yellow-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  if (!metric) return null;

  const progress = metric.target_value && metric.current_value 
    ? Math.min(100, (metric.current_value / metric.target_value) * 100)
    : 0;

  return (
    <div className="space-y-6" data-testid="metric-detail-page">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/enterprise-metrics')}
        className="text-gray-600 hover:text-gray-900 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Metrics
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-xl flex items-center justify-center shadow-lg">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-lato-regular uppercase tracking-wider">{metric.category}</span>
            <h1 className="text-2xl font-heading font-bold text-gray-900 uppercase tracking-tight">{metric.name}</h1>
            {metric.description && (
              <p className="text-gray-600 mt-1 font-lato-light">{metric.description}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          {getTrendIcon(metric.current_value, metric.target_value)}
        </div>
      </div>

      {/* Progress Card */}
      <Card className="border-0 shadow-lg rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-lato-light uppercase tracking-wider">Current Value</p>
              <p className="text-4xl font-heading font-bold text-gray-900">
                {metric.current_value ?? '-'} <span className="text-lg text-gray-400">{metric.unit}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-lato-light uppercase tracking-wider">Target Value</p>
              <p className="text-4xl font-heading font-bold text-[#FE5B1B]">
                {metric.target_value ?? '-'} <span className="text-lg text-gray-400">{metric.unit}</span>
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-4 rounded-full" />
          <p className="text-center text-sm text-gray-500 font-lato-light mt-2">
            {progress.toFixed(0)}% of target achieved
          </p>
        </CardContent>
      </Card>

      {/* Aligned Initiatives */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-gray-900 uppercase tracking-tight">
            Aligned Initiatives ({initiatives.length})
          </h2>
        </div>

        {initiatives.length > 0 ? (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Initiative</TableHead>
                  <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Owner</TableHead>
                  <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Stage</TableHead>
                  <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Status</TableHead>
                  <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Confidence</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initiatives.map((init) => (
                  <TableRow 
                    key={init.id} 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/initiatives/${init.id}`)}
                  >
                    <TableCell>
                      <p className="font-lato-regular text-gray-900">{init.name}</p>
                      <p className="text-xs text-gray-500 font-lato-light">{init.bucket}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-lato-light">
                      {init.initiative_owner || 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-lato-light">
                      {init.lifecycle_stage}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-lato-bold uppercase ${getStatusBadge(init.status)}`}>
                        {init.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg shadow-md ${getConfidenceColor(init.confidence_score)}`}>
                        <span className="text-white font-lato-bold text-sm">{init.confidence_score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-gray-200 rounded-xl">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 font-lato-light">No initiatives aligned to this metric yet</p>
              <Button
                variant="link"
                onClick={() => navigate('/initiatives/new')}
                className="text-[#FE5B1B] font-lato-regular mt-2"
              >
                Create an initiative
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MetricDetail;
