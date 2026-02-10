import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Target, 
  FolderKanban, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

const COLORS = {
  pipeline: {
    'Not Started': '#94a3b8',
    'Discovery': '#3b82f6',
    'Frame': '#8b5cf6',
    'Work In Progress': '#f59e0b',
  },
  project: {
    'Not Started': '#94a3b8',
    'In Progress': '#3b82f6',
    'Completed': '#10b981',
    'On Hold': '#f97316',
  },
  kpi: {
    onTrack: '#10b981',
    atRisk: '#f59e0b',
    offTrack: '#ef4444',
  }
};

const Reporting = () => {
  const [pipelineData, setPipelineData] = useState(null);
  const [outcomesData, setOutcomesData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [pipeline, outcomes, trends] = await Promise.all([
        api.get('/reports/pipeline'),
        api.get('/reports/business-outcomes'),
        api.get('/reports/trends'),
      ]);
      setPipelineData(pipeline.data);
      setOutcomesData(outcomes.data);
      setTrendsData(trends.data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#FE5B1B] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const initiativeChartData = pipelineData?.initiative_status_distribution || [];
  const projectChartData = pipelineData?.project_status_distribution || [];
  const kpiPerformanceData = outcomesData?.kpi_performance ? [
    { name: 'On Track', value: outcomesData.kpi_performance.on_track, fill: COLORS.kpi.onTrack },
    { name: 'At Risk', value: outcomesData.kpi_performance.at_risk, fill: COLORS.kpi.atRisk },
    { name: 'Off Track', value: outcomesData.kpi_performance.off_track, fill: COLORS.kpi.offTrack },
  ] : [];

  const categoryProgressData = outcomesData?.category_stats?.map(cat => ({
    name: cat.name,
    progress: cat.avg_progress,
    kpis: cat.kpis_count,
    onTrack: cat.on_track,
    atRisk: cat.at_risk,
    offTrack: cat.off_track,
  })) || [];

  return (
    <div className="space-y-6" data-testid="reporting-page">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Initiatives</p>
                <p className="text-xl font-heading font-bold text-gray-900">{pipelineData?.total_initiatives || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Projects</p>
                <p className="text-xl font-heading font-bold text-gray-900">{pipelineData?.total_projects || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">KPIs</p>
                <p className="text-xl font-heading font-bold text-gray-900">{outcomesData?.total_kpis || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-lato-regular uppercase">Milestone Rate</p>
                <p className="text-xl font-heading font-bold text-gray-900">{pipelineData?.milestone_completion_rate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Pipeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Initiative Status Distribution */}
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading uppercase tracking-wide text-gray-900">
              Initiative Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={initiativeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => count > 0 ? `${status}: ${count}` : ''}
                    labelLine={false}
                  >
                    {initiativeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.pipeline[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [value, props.payload.status]}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {Object.entries(COLORS.pipeline).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  {status}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading uppercase tracking-wide text-gray-900">
              Project Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="status" 
                    tick={{ fontSize: 11 }} 
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]}
                  >
                    {projectChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.project[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: KPI Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Performance Pie */}
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading uppercase tracking-wide text-gray-900">
              KPI Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kpiPerformanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {kpiPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-gray-600">On Track ({outcomesData?.kpi_performance?.on_track || 0})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-gray-600">At Risk ({outcomesData?.kpi_performance?.at_risk || 0})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-gray-600">Off Track ({outcomesData?.kpi_performance?.off_track || 0})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Progress */}
        <Card className="border-0 shadow-sm rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading uppercase tracking-wide text-gray-900">
              Progress by Business Outcome Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryProgressData}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Progress']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="progress" 
                    fill="#FE5B1B"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: KPI Trends */}
      {trendsData?.kpi_trends?.length > 0 && (
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading uppercase tracking-wide text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              KPI Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendsData.kpi_trends.slice(0, 6).map((kpi) => (
                <div key={kpi.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-lato-bold text-gray-800 truncate">{kpi.name}</h4>
                    <span className={`text-xs font-lato-bold px-2 py-0.5 rounded ${
                      kpi.progress >= 70 ? 'bg-emerald-100 text-emerald-700' :
                      kpi.progress >= 40 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {kpi.progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={kpi.trend}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 8 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '11px',
                            padding: '6px'
                          }}
                          formatter={(value) => [`${value} ${kpi.unit}`, 'Value']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={
                            kpi.progress >= 70 ? '#10b981' :
                            kpi.progress >= 40 ? '#f59e0b' :
                            '#ef4444'
                          }
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>Current: {kpi.current_value} {kpi.unit}</span>
                    <span>Target: {kpi.target_value} {kpi.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
      <Card className="border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading uppercase tracking-wide text-gray-900">
            Business Outcome Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-lato-bold text-gray-600 uppercase text-xs">Category</th>
                  <th className="text-center py-3 px-4 font-lato-bold text-gray-600 uppercase text-xs">Sub-Outcomes</th>
                  <th className="text-center py-3 px-4 font-lato-bold text-gray-600 uppercase text-xs">KPIs</th>
                  <th className="text-center py-3 px-4 font-lato-bold text-gray-600 uppercase text-xs">Avg Progress</th>
                  <th className="text-center py-3 px-4 font-lato-bold text-gray-600 uppercase text-xs">On Track</th>
                  <th className="text-center py-3 px-4 font-lato-bold text-gray-600 uppercase text-xs">At Risk</th>
                  <th className="text-center py-3 px-4 font-lato-bold text-gray-600 uppercase text-xs">Off Track</th>
                </tr>
              </thead>
              <tbody>
                {outcomesData?.category_stats?.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-lato-bold text-gray-900">{cat.name}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{cat.sub_outcomes_count}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{cat.kpis_count}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-lato-bold ${
                        cat.avg_progress >= 70 ? 'text-emerald-600' :
                        cat.avg_progress >= 40 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {cat.avg_progress}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-lato-bold">
                        {cat.on_track}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-lato-bold">
                        {cat.at_risk}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-lato-bold">
                        {cat.off_track}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reporting;
