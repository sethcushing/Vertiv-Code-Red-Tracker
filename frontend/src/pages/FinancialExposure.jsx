import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

const FinancialExposure = () => {
  const [exposures, setExposures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExposures = async () => {
      try {
        const response = await api.get('/dashboard/financial-exposure');
        setExposures(response.data);
      } catch (error) {
        toast.error('Failed to load financial exposure data');
      } finally {
        setLoading(false);
      }
    };
    fetchExposures();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getRiskBadge = (indicator) => {
    const styles = {
      'Low': 'bg-green-100 text-green-800 border-green-200',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'High': 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[indicator] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Calculate totals
  const totals = exposures.reduce((acc, e) => ({
    budget: acc.budget + e.approved_budget,
    forecasted: acc.forecasted + e.forecasted_spend,
    actual: acc.actual + e.actual_spend,
    variance: acc.variance + e.variance,
  }), { budget: 0, forecasted: 0, actual: 0, variance: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="financial-exposure-page">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-sm flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Budget</p>
                <p className="text-xl font-heading font-bold text-gray-900">{formatCurrency(totals.budget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-sm flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Forecasted</p>
                <p className="text-xl font-heading font-bold text-gray-900">{formatCurrency(totals.forecasted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-sm flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actual Spend</p>
                <p className="text-xl font-heading font-bold text-gray-900">{formatCurrency(totals.actual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-gray-200 shadow-sm rounded-sm ${totals.variance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${totals.variance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                {totals.variance > 0 ? (
                  <TrendingUp className="w-5 h-5 text-red-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Variance</p>
                <p className={`text-xl font-heading font-bold ${totals.variance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {totals.variance > 0 ? '+' : ''}{formatCurrency(totals.variance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Table */}
      <Card className="border-gray-200 shadow-sm rounded-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 hover:bg-gray-100">
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Initiative</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Bucket</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Owner</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Budget</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Forecasted</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Actual</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Variance</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-center">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exposures.map((exposure) => (
                <TableRow 
                  key={exposure.initiative_id}
                  data-testid={`financial-row-${exposure.initiative_id}`}
                  className="hover:bg-gray-50 border-b border-gray-100"
                >
                  <TableCell className="font-medium">
                    <Link 
                      to={`/initiatives/${exposure.initiative_id}`}
                      className="flex items-center gap-2 hover:text-[#FE5B1B] transition-colors group"
                    >
                      {exposure.code_red && (
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                      )}
                      <span className="line-clamp-1">{exposure.name}</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{exposure.bucket}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{exposure.owner || 'Unassigned'}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(exposure.approved_budget)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(exposure.forecasted_spend)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(exposure.actual_spend)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm font-medium ${exposure.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {exposure.variance > 0 ? '+' : ''}{formatCurrency(exposure.variance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide border ${getRiskBadge(exposure.risk_indicator)}`}>
                      {exposure.risk_indicator}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialExposure;
