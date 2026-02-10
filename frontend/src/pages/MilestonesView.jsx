import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Calendar, CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const MilestonesView = () => {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      const response = await api.get('/milestones');
      setMilestones(response.data);
    } catch (error) {
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Completed': 'bg-green-100 text-green-700',
      'In Progress': 'bg-blue-100 text-blue-700',
      'Pending': 'bg-gray-100 text-gray-700',
      'Delayed': 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Delayed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredMilestones = milestones.filter((m) => {
    const matchesSearch = search === '' || 
      m.milestone_name.toLowerCase().includes(search.toLowerCase()) ||
      m.initiative_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.milestone_owner || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group stats
  const stats = {
    total: milestones.length,
    completed: milestones.filter(m => m.status === 'Completed').length,
    inProgress: milestones.filter(m => m.status === 'In Progress').length,
    pending: milestones.filter(m => m.status === 'Pending').length,
    delayed: milestones.filter(m => m.status === 'Delayed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5B1B]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="milestones-view-page">
      {/* Header */}
      <div>
        <h2 className="text-xl font-heading font-bold text-gray-900 uppercase tracking-tight">
          All Milestones
        </h2>
        <p className="text-sm text-gray-500 font-lato-light mt-1">
          View milestones across all initiatives, sorted by due date
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-lato-regular uppercase tracking-wider">Total</p>
            <p className="text-2xl font-heading font-bold text-gray-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-green-600 font-lato-regular uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-heading font-bold text-green-700 mt-1">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-lato-regular uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-heading font-bold text-blue-700 mt-1">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-lato-regular uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-heading font-bold text-gray-700 mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-xl bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 font-lato-regular uppercase tracking-wider">Delayed</p>
            <p className="text-2xl font-heading font-bold text-red-700 mt-1">{stats.delayed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search milestones, initiatives, or owners..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-lg"
                data-testid="milestone-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] rounded-lg" data-testid="milestone-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-lato-light">
          Showing <span className="font-lato-bold text-gray-900">{filteredMilestones.length}</span> milestone{filteredMilestones.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Milestone</TableHead>
              <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Initiative</TableHead>
              <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Owner</TableHead>
              <TableHead className="text-xs font-lato-bold text-gray-600 uppercase">Due Date</TableHead>
              <TableHead className="text-xs font-lato-bold text-gray-600 uppercase text-center">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMilestones.map((m, idx) => (
              <TableRow 
                key={`${m.initiative_id}-${m.milestone_id}-${idx}`}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/initiatives/${m.initiative_id}`)}
                data-testid={`milestone-row-${idx}`}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(m.status)}
                    <div>
                      <p className="font-lato-regular text-gray-900">{m.milestone_name}</p>
                      {m.milestone_description && (
                        <p className="text-xs text-gray-500 font-lato-light line-clamp-1">{m.milestone_description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-gray-700 font-lato-regular line-clamp-1">{m.initiative_name}</p>
                  <p className="text-xs text-gray-400 font-lato-light">{m.initiative_status}</p>
                </TableCell>
                <TableCell className="text-sm text-gray-600 font-lato-light">
                  {m.milestone_owner || 'Unassigned'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-gray-600 font-lato-light">
                    <Calendar className="w-3 h-3" />
                    {formatDate(m.due_date)}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-lato-bold uppercase ${getStatusBadge(m.status)}`}>
                    {m.status}
                  </span>
                </TableCell>
                <TableCell>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filteredMilestones.length === 0 && (
        <Card className="border-2 border-dashed border-gray-200 rounded-xl">
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-lato-bold text-gray-600 mb-2">No Milestones Found</h3>
            <p className="text-sm text-gray-400 font-lato-light">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Milestones will appear here when initiatives are created'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MilestonesView;
