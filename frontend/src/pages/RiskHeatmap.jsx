import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { AlertTriangle, Info } from 'lucide-react';

const RiskHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const response = await api.get('/dashboard/risk-heatmap');
        setHeatmapData(response.data);
      } catch (error) {
        toast.error('Failed to load risk heatmap');
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, []);

  const impactLevels = ['High', 'Medium', 'Low'];
  const likelihoodLevels = ['Low', 'Medium', 'High'];

  const getCellColor = (impact, likelihood) => {
    if (impact === 'High' && likelihood === 'High') return 'bg-red-600 hover:bg-red-700';
    if (impact === 'High' && likelihood === 'Medium') return 'bg-red-400 hover:bg-red-500';
    if (impact === 'High' && likelihood === 'Low') return 'bg-yellow-500 hover:bg-yellow-600';
    if (impact === 'Medium' && likelihood === 'High') return 'bg-red-400 hover:bg-red-500';
    if (impact === 'Medium' && likelihood === 'Medium') return 'bg-yellow-400 hover:bg-yellow-500';
    if (impact === 'Medium' && likelihood === 'Low') return 'bg-green-400 hover:bg-green-500';
    if (impact === 'Low' && likelihood === 'High') return 'bg-yellow-500 hover:bg-yellow-600';
    if (impact === 'Low' && likelihood === 'Medium') return 'bg-green-400 hover:bg-green-500';
    return 'bg-green-500 hover:bg-green-600';
  };

  const getRisksForCell = (impact, likelihood) => {
    if (!heatmapData) return [];
    return heatmapData[impact]?.[likelihood] || [];
  };

  // Count total risks
  const totalRisks = heatmapData 
    ? Object.values(heatmapData).reduce((sum, impact) => 
        sum + Object.values(impact).reduce((s, risks) => s + risks.length, 0), 0)
    : 0;

  const escalatedCount = heatmapData
    ? Object.values(heatmapData).reduce((sum, impact) =>
        sum + Object.values(impact).reduce((s, risks) => 
          s + risks.filter(r => r.escalation).length, 0), 0)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading risk heatmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="risk-heatmap-page">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <Info className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Risks</p>
                <p className="text-2xl font-heading font-bold text-gray-900">{totalRisks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 shadow-sm rounded-sm bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Escalated</p>
                <p className="text-2xl font-heading font-bold text-red-700">{escalatedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">High Impact + High Likelihood</p>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {getRisksForCell('High', 'High').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Grid */}
      <Card className="border-gray-200 shadow-sm rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-heading uppercase tracking-tight flex items-center gap-2">
            Risk Assessment Matrix
            <span className="text-sm font-normal text-gray-500 normal-case tracking-normal">
              (Click cell to view risks)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex">
            {/* Y-axis label */}
            <div className="flex flex-col justify-center items-center pr-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider transform -rotate-90 whitespace-nowrap">
                Impact
              </span>
            </div>

            <div className="flex-1">
              {/* Grid */}
              <div className="grid grid-cols-4 gap-1">
                {/* Header row */}
                <div></div>
                {likelihoodLevels.map((level) => (
                  <div 
                    key={level}
                    className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2"
                  >
                    {level}
                  </div>
                ))}

                {/* Data rows */}
                {impactLevels.map((impact) => (
                  <React.Fragment key={impact}>
                    <div className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider py-4 pr-3 flex items-center justify-end">
                      {impact}
                    </div>
                    {likelihoodLevels.map((likelihood) => {
                      const risks = getRisksForCell(impact, likelihood);
                      const hasEscalated = risks.some(r => r.escalation);
                      
                      return (
                        <TooltipProvider key={`${impact}-${likelihood}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                data-testid={`heatmap-cell-${impact}-${likelihood}`}
                                className={`
                                  aspect-square min-h-[80px] rounded-sm flex flex-col items-center justify-center 
                                  cursor-pointer transition-all duration-200 relative
                                  ${getCellColor(impact, likelihood)}
                                  ${risks.length > 0 ? 'hover:scale-105' : 'opacity-50'}
                                `}
                                onClick={() => {
                                  if (risks.length > 0) {
                                    navigate(`/initiatives/${risks[0].initiative_id}`);
                                  }
                                }}
                              >
                                <span className="text-white font-bold text-2xl">{risks.length}</span>
                                <span className="text-white/80 text-xs uppercase tracking-wider">risks</span>
                                {hasEscalated && (
                                  <div className="absolute top-2 right-2">
                                    <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="right" 
                              className="max-w-xs p-3"
                            >
                              <p className="font-bold text-sm mb-2">
                                {impact} Impact / {likelihood} Likelihood
                              </p>
                              {risks.length === 0 ? (
                                <p className="text-gray-500 text-sm">No risks in this category</p>
                              ) : (
                                <div className="space-y-2">
                                  {risks.slice(0, 3).map((risk, i) => (
                                    <div key={i} className="text-sm">
                                      <p className="font-medium text-gray-900 line-clamp-1">
                                        {risk.initiative_name}
                                      </p>
                                      <p className="text-gray-600 line-clamp-2 flex items-start gap-1">
                                        {risk.escalation && (
                                          <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                                        )}
                                        {risk.risk_description}
                                      </p>
                                    </div>
                                  ))}
                                  {risks.length > 3 && (
                                    <p className="text-xs text-gray-500">+{risks.length - 3} more</p>
                                  )}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* X-axis label */}
              <div className="text-center mt-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Likelihood
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Legend</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded-sm"></div>
                <span className="text-sm text-gray-600">Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400 rounded-sm"></div>
                <span className="text-sm text-gray-600">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                <span className="text-sm text-gray-600">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                <span className="text-sm text-gray-600">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">Escalated Risk</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskHeatmap;
