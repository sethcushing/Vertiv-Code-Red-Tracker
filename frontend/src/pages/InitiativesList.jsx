import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  Plus,
  Search,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

const InitiativesList = () => {
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    bucket: '',
    status: '',
    domain: '',
    team: '',
    stage: '',
    code_red: '',
  });
  const [config, setConfig] = useState({
    buckets: [],
    domains: [],
    teams: [],
    stages: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [buckets, domains, teams, stages] = await Promise.all([
          api.get('/config/buckets'),
          api.get('/config/domains'),
          api.get('/config/teams'),
          api.get('/config/stages'),
        ]);
        setConfig({
          buckets: buckets.data,
          domains: domains.data,
          teams: teams.data,
          stages: stages.data,
        });
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filters.bucket) params.bucket = filters.bucket;
        if (filters.status) params.status = filters.status;
        if (filters.domain) params.domain = filters.domain;
        if (filters.team) params.team = filters.team;
        if (filters.stage) params.stage = filters.stage;
        if (filters.code_red === 'true') params.code_red = true;
        if (filters.code_red === 'false') params.code_red = false;
        
        const response = await api.get('/initiatives', { params });
        setInitiatives(response.data);
      } catch (error) {
        toast.error('Failed to load initiatives');
      } finally {
        setLoading(false);
      }
    };
    fetchInitiatives();
  }, [filters.bucket, filters.status, filters.domain, filters.team, filters.stage, filters.code_red]);

  const clearFilters = () => {
    setFilters({
      search: '',
      bucket: '',
      status: '',
      domain: '',
      team: '',
      stage: '',
      code_red: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const filteredInitiatives = initiatives.filter(i => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        i.name.toLowerCase().includes(search) ||
        i.initiative_owner?.toLowerCase().includes(search) ||
        i.owning_team?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const styles = {
      'On Track': 'bg-green-100 text-green-800 border-green-200',
      'At Risk': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Off Track': 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getConfidenceColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="initiatives-list-page">
      {/* Filters */}
      <Card className="border-gray-200 shadow-sm rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search initiatives..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="search-input"
                className="pl-10 rounded-sm"
              />
            </div>

            <Select value={filters.bucket} onValueChange={(v) => setFilters({ ...filters, bucket: v })}>
              <SelectTrigger className="w-[150px] rounded-sm" data-testid="filter-bucket">
                <SelectValue placeholder="Bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Buckets</SelectItem>
                {config.buckets.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-[140px] rounded-sm" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="On Track">On Track</SelectItem>
                <SelectItem value="At Risk">At Risk</SelectItem>
                <SelectItem value="Off Track">Off Track</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.domain} onValueChange={(v) => setFilters({ ...filters, domain: v })}>
              <SelectTrigger className="w-[150px] rounded-sm" data-testid="filter-domain">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Domains</SelectItem>
                {config.domains.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.code_red} onValueChange={(v) => setFilters({ ...filters, code_red: v })}>
              <SelectTrigger className="w-[140px] rounded-sm" data-testid="filter-code-red">
                <SelectValue placeholder="Code Red" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="true">Code Red Only</SelectItem>
                <SelectItem value="false">Non-Code Red</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="clear-filters-btn"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}

            <Button
              onClick={() => navigate('/initiatives/new')}
              data-testid="add-initiative-btn"
              className="bg-[#FE5B1B] hover:bg-[#E0480E] text-white rounded-sm font-semibold uppercase tracking-wide ml-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Initiative
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900">{filteredInitiatives.length}</span> initiative{filteredInitiatives.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-[#FE5B1B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredInitiatives.length === 0 ? (
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="py-12 text-center">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg text-gray-900 uppercase">No Initiatives Found</h3>
            <p className="text-gray-600 mt-2">Try adjusting your filters or create a new initiative.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-200 shadow-sm rounded-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 hover:bg-gray-100">
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Initiative</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Owner</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Team</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider">Stage</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-center">Confidence</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Budget</TableHead>
                  <TableHead className="text-xs font-bold text-gray-600 uppercase tracking-wider"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInitiatives.map((initiative) => (
                  <TableRow 
                    key={initiative.id}
                    data-testid={`initiative-row-${initiative.id}`}
                    className="hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                    onClick={() => navigate(`/initiatives/${initiative.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {initiative.code_red_flag && (
                          <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{initiative.name}</p>
                          <p className="text-xs text-gray-500">{initiative.bucket}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {initiative.initiative_owner || 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {initiative.owning_team}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <span className="line-clamp-1">{initiative.lifecycle_stage}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide border ${getStatusBadge(initiative.status)}`}>
                        {initiative.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-sm ${getConfidenceColor(initiative.confidence_score)}`}>
                        <span className="text-white font-bold text-sm">{initiative.confidence_score}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(initiative.financial?.approved_budget || 0)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InitiativesList;
