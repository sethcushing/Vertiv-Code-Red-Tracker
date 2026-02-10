import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Target, 
  FolderKanban, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Loader2,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Layers,
  Activity,
} from 'lucide-react';
import { api } from '../App';
import { toast } from 'sonner';

// Pipeline status colors
const PIPELINE_COLORS = {
  'Not Started': { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Discovery': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', dot: 'bg-blue-500' },
  'Frame': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', dot: 'bg-violet-500' },
  'Work In Progress': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', dot: 'bg-amber-500' },
};

// Delivery stage colors
const DELIVERY_COLORS = {
  'Request': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'Solution Design': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Commercials': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'Quote and Approval': { bg: 'bg-violet-100', text: 'text-violet-700' },
  'Order Capture': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Availability': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Fulfillment': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Post-Delivery': { bg: 'bg-teal-100', text: 'text-teal-700' },
};

// Category colors for Business Outcomes
const CATEGORY_COLORS = {
  0: { bg: 'bg-gradient-to-br from-orange-500 to-red-600', light: 'bg-orange-50' },
  1: { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', light: 'bg-blue-50' },
  2: { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', light: 'bg-emerald-50' },
  3: { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', light: 'bg-violet-50' },
};

const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState({});
  const [deliveryPipeline, setDeliveryPipeline] = useState({});
  const [outcomesTree, setOutcomesTree] = useState([]);
  const [kpiTrends, setKpiTrends] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [pipelineRes, deliveryRes, outcomesRes, trendsRes] = await Promise.all([
        api.get('/pipeline'),
        api.get('/delivery-pipeline'),
        api.get('/business-outcomes/tree'),
        api.get('/reports/trends'),
      ]);
      
      setPipeline(pipelineRes.data);
      setDeliveryPipeline(deliveryRes.data);
      setOutcomesTree(outcomesRes.data);
      setKpiTrends(trendsRes.data.kpi_trends || []);
      
      // Initialize categories as collapsed
      const expanded = {};
      outcomesRes.data.forEach(cat => {
        expanded[cat.id] = false;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getProgressColor = (progress) => {
    if (progress >= 70) return 'text-emerald-600';
    if (progress >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressBg = (progress) => {
    if (progress >= 70) return 'bg-emerald-500';
    if (progress >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTrendDirection = (kpi) => {
    if (!kpi.trend || kpi.trend.length < 2) return 'neutral';
    const recent = kpi.trend[kpi.trend.length - 1]?.value;
    const previous = kpi.trend[kpi.trend.length - 2]?.value;
    if (recent === previous) return 'neutral';
    
    if (kpi.direction === 'increase') {
      return recent > previous ? 'up' : 'down';
    } else {
      return recent < previous ? 'up' : 'down';
    }
  };

  const getCategoryStats = (category) => {
    let totalProgress = 0;
    let kpiCount = 0;
    category.sub_outcomes?.forEach(sub => {
      sub.kpis?.forEach(kpi => {
        totalProgress += kpi.progress_percent || 0;
        kpiCount++;
      });
    });
    return {
      avgProgress: kpiCount > 0 ? totalProgress / kpiCount : 0,
      kpiCount,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#FE5B1B] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  const pipelineStatuses = ['Not Started', 'Discovery', 'Frame', 'Work In Progress'];
  const deliveryStages = ['Request', 'Solution Design', 'Commercials', 'Quote and Approval', 'Order Capture', 'Availability', 'Fulfillment', 'Post-Delivery'];

  // Separate trending up vs down KPIs
  const trendingUp = kpiTrends.filter(kpi => getTrendDirection(kpi) === 'up');
  const trendingDown = kpiTrends.filter(kpi => getTrendDirection(kpi) === 'down');

  return (
    <div className="space-y-8 pb-12" data-testid="executive-dashboard">
      {/* Section 1: Code Red Pipeline */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Code Red Pipeline</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {pipelineStatuses.map((status) => {
            const initiatives = pipeline[status] || [];
            const colors = PIPELINE_COLORS[status];
            
            return (
              <Card key={status} className={`border-0 shadow-sm rounded-xl overflow-hidden`}>
                <div className={`${colors.bg} px-4 py-3 border-b ${colors.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <span className={`text-sm font-semibold ${colors.text}`}>{status}</span>
                    </div>
                    <span className={`text-lg font-bold ${colors.text}`}>{initiatives.length}</span>
                  </div>
                </div>
                <CardContent className="p-3 max-h-40 overflow-y-auto">
                  {initiatives.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No initiatives</p>
                  ) : (
                    <div className="space-y-2">
                      {initiatives.map((init) => (
                        <div key={init.id} className="bg-white border border-gray-100 rounded-lg p-2 shadow-sm">
                          <p className="text-sm font-medium text-gray-800 truncate">{init.name}</p>
                          <p className="text-xs text-gray-400">{init.projects?.length || 0} projects</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 2: Business Outcomes */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Business Outcomes</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {outcomesTree.map((category, idx) => {
            const colorScheme = CATEGORY_COLORS[idx % 4];
            const stats = getCategoryStats(category);
            const isExpanded = expandedCategories[category.id];

            return (
              <Card key={category.id} className="border-0 shadow-sm rounded-xl overflow-hidden">
                <div 
                  className={`${colorScheme.bg} p-4 text-white cursor-pointer`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div>
                        <h3 className="font-bold text-base">{category.name}</h3>
                        <p className="text-xs text-white/70">{stats.kpiCount} KPIs</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{stats.avgProgress.toFixed(0)}%</p>
                      <p className="text-xs text-white/70">avg progress</p>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <CardContent className="p-3 max-h-48 overflow-y-auto">
                    {category.sub_outcomes?.map((sub) => (
                      <div key={sub.id} className={`${colorScheme.light} rounded-lg p-2 mb-2 last:mb-0`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">{sub.name}</span>
                          <span className="text-xs text-gray-500">{sub.kpis?.length || 0} KPIs</span>
                        </div>
                        {sub.kpis?.slice(0, 2).map((kpi) => (
                          <div key={kpi.id} className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                            <span className="text-gray-600 truncate flex-1">{kpi.name}</span>
                            <span className={`font-semibold ${getProgressColor(kpi.progress_percent)}`}>
                              {kpi.progress_percent?.toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 3: Delivery Pipeline */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <FolderKanban className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Delivery Lifecycle Pipeline</h2>
        </div>

        {/* Stage Flow Indicator */}
        <div className="flex items-center justify-between mb-4 px-2 overflow-x-auto">
          {deliveryStages.map((stage, idx) => (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={`w-8 h-8 rounded-full ${DELIVERY_COLORS[stage].bg} flex items-center justify-center mb-1`}>
                  <span className="text-xs font-bold text-gray-700">{(deliveryPipeline[stage] || []).length}</span>
                </div>
                <span className="text-[10px] text-gray-500 text-center leading-tight">{stage}</span>
              </div>
              {idx < deliveryStages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Projects by Stage */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {deliveryStages.map((stage) => {
            const projects = deliveryPipeline[stage] || [];
            const colors = DELIVERY_COLORS[stage];
            
            return (
              <Card key={stage} className="border-0 shadow-sm rounded-xl">
                <div className={`${colors.bg} px-2 py-2 rounded-t-xl`}>
                  <p className={`text-xs font-semibold ${colors.text} text-center truncate`}>{stage}</p>
                </div>
                <CardContent className="p-2 min-h-[120px] max-h-[200px] overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-4">No projects</p>
                  ) : (
                    <div className="space-y-1">
                      {projects.map((proj) => (
                        <div 
                          key={proj.id} 
                          className="bg-gray-50 rounded p-1.5 border border-gray-100"
                          title={`${proj.name} - ${proj.initiative_name}`}
                        >
                          <p className="text-[11px] font-medium text-gray-800 truncate">{proj.name}</p>
                          <p className="text-[9px] text-gray-400 truncate">{proj.initiative_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 4: KPI Trends */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">KPI Trends</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trending Up */}
          <Card className="border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-700">Trending in Right Direction</span>
                <span className="text-sm text-gray-400 font-normal">({trendingUp.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendingUp.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No KPIs trending up</p>
              ) : (
                trendingUp.slice(0, 4).map((kpi) => (
                  <div key={kpi.id} className="bg-emerald-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">{kpi.name}</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-600">{kpi.progress?.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={kpi.trend || []}>
                          <XAxis dataKey="date" hide />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
                            formatter={(v) => [`${v} ${kpi.unit}`, '']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#10b981" 
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
                ))
              )}
            </CardContent>
          </Card>

          {/* Trending Down */}
          <Card className="border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span className="text-red-700">Needs Attention</span>
                <span className="text-sm text-gray-400 font-normal">({trendingDown.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendingDown.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No KPIs trending down</p>
              ) : (
                trendingDown.slice(0, 4).map((kpi) => (
                  <div key={kpi.id} className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">{kpi.name}</span>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-600">{kpi.progress?.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={kpi.trend || []}>
                          <XAxis dataKey="date" hide />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
                            formatter={(v) => [`${v} ${kpi.unit}`, '']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#ef4444" 
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
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ExecutiveDashboard;
