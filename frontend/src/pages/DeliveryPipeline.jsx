import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  ArrowRight,
  ChevronRight,
  ChevronDown,
  FolderKanban,
  Loader2,
  User,
  Calendar,
  Edit2,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api, AuthContext } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const DELIVERY_STAGES = [
  { id: 'Request', label: 'Request', color: 'bg-slate-100', textColor: 'text-slate-700', dotColor: 'bg-slate-400' },
  { id: 'Solution Design', label: 'Solution Design', color: 'bg-blue-100', textColor: 'text-blue-700', dotColor: 'bg-blue-500' },
  { id: 'Commercials', label: 'Commercials', color: 'bg-indigo-100', textColor: 'text-indigo-700', dotColor: 'bg-indigo-500' },
  { id: 'Quote and Approval', label: 'Quote & Approval', color: 'bg-violet-100', textColor: 'text-violet-700', dotColor: 'bg-violet-500' },
  { id: 'Order Capture', label: 'Order Capture', color: 'bg-purple-100', textColor: 'text-purple-700', dotColor: 'bg-purple-500' },
  { id: 'Availability', label: 'Availability', color: 'bg-amber-100', textColor: 'text-amber-700', dotColor: 'bg-amber-500' },
  { id: 'Fulfillment', label: 'Fulfillment', color: 'bg-emerald-100', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500' },
  { id: 'Post-Delivery', label: 'Post-Delivery', color: 'bg-teal-100', textColor: 'text-teal-700', dotColor: 'bg-teal-500' },
];

const RAG_CONFIG = {
  'Red': { color: 'bg-red-500', border: 'border-red-300' },
  'Amber': { color: 'bg-amber-500', border: 'border-amber-300' },
  'Green': { color: 'bg-emerald-500', border: 'border-emerald-300' },
};

const DeliveryPipeline = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState({});

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const response = await api.get('/delivery-pipeline');
      setPipeline(response.data);
    } catch (error) {
      toast.error('Failed to load delivery pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || !isAdmin) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    // Optimistic update
    const newPipeline = { ...pipeline };
    const sourceProjects = [...(newPipeline[source.droppableId] || [])];
    const destProjects = [...(newPipeline[destination.droppableId] || [])];
    
    const [movedProject] = sourceProjects.splice(source.index, 1);
    destProjects.splice(destination.index, 0, movedProject);
    
    newPipeline[source.droppableId] = sourceProjects;
    newPipeline[destination.droppableId] = destProjects;
    setPipeline(newPipeline);

    try {
      await api.put(`/delivery-pipeline/move/${draggableId}`, null, {
        params: { new_stage: destination.droppableId }
      });
      toast.success(`Moved to ${destination.droppableId}`);
    } catch (error) {
      toast.error('Failed to move project');
      fetchPipeline(); // Revert on error
    }
  };

  const toggleProject = (id) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const canEditProject = (project) => {
    if (isAdmin) return true;
    return project.owner === user?.name || project.owner === user?.email;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#FE5B1B] animate-spin" />
      </div>
    );
  }

  const totalProjects = DELIVERY_STAGES.reduce((sum, stage) => sum + (pipeline[stage.id]?.length || 0), 0);

  return (
    <div className="space-y-6" data-testid="delivery-pipeline-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalProjects} projects across {DELIVERY_STAGES.length} stages
          {isAdmin && <span className="ml-2 text-xs text-gray-400">(Drag to move)</span>}
        </p>
      </div>

      {/* Stage Flow Indicator */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm overflow-x-auto">
        {DELIVERY_STAGES.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center min-w-[90px]">
              <div className={`w-10 h-10 rounded-full ${stage.color} flex items-center justify-center mb-2 border-2 border-white shadow-sm`}>
                <span className={`text-sm font-bold ${stage.textColor}`}>
                  {(pipeline[stage.id] || []).length}
                </span>
              </div>
              <span className="text-xs text-gray-600 text-center font-medium leading-tight">
                {stage.label}
              </span>
            </div>
            {idx < DELIVERY_STAGES.length - 1 && (
              <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0 mx-2" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Pipeline Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {DELIVERY_STAGES.map((stage) => {
            const projects = pipeline[stage.id] || [];
            
            return (
              <div key={stage.id} className="flex flex-col">
                {/* Column Header */}
                <div className={`${stage.color} rounded-t-xl px-3 py-2.5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                      <span className={`text-xs font-semibold ${stage.textColor} truncate`}>
                        {stage.label}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${stage.textColor}`}>
                      {projects.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={stage.id} isDropDisabled={!isAdmin}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[300px] bg-gray-50 rounded-b-xl p-2 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-gray-100 ring-2 ring-inset ring-gray-200' : ''
                      }`}
                    >
                      {projects.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <p className="text-xs text-center">No projects</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projects.map((project, index) => {
                            const isExpanded = expandedProjects[project.id];
                            const canEdit = canEditProject(project);
                            
                            return (
                              <Draggable
                                key={project.id}
                                draggableId={project.id}
                                index={index}
                                isDragDisabled={!isAdmin}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white rounded-lg border border-gray-100 shadow-sm transition-all ${
                                      snapshot.isDragging ? 'shadow-lg ring-2 ring-[#FE5B1B]/20' : ''
                                    } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                  >
                                    <div 
                                      className="p-2.5 cursor-pointer"
                                      onClick={() => toggleProject(project.id)}
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                          {isExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                          )}
                                          {/* RAG Status */}
                                          <div 
                                            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${RAG_CONFIG[project.rag_status || 'Green']?.color}`}
                                            title={`RAG: ${project.rag_status || 'Green'}`}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">
                                              {project.name}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                              {project.initiative_name}
                                            </p>
                                          </div>
                                        </div>
                                        {canEdit && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/projects/${project.id}`);
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Edit Project"
                                          >
                                            <Edit2 className="w-3 h-3 text-gray-400" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Expanded Details */}
                                    {isExpanded && (
                                      <div className="px-2.5 pb-2.5 pt-0 space-y-1.5 border-t border-gray-50">
                                        {project.description && (
                                          <p className="text-[10px] text-gray-500 line-clamp-2">
                                            {project.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                          <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <span>{project.owner || 'Unassigned'}</span>
                                          </div>
                                        </div>
                                        {project.milestones_count > 0 && (
                                          <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-gray-500">Milestones</span>
                                            <span className="font-medium text-gray-700">
                                              {project.milestones_completed}/{project.milestones_count}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                            project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                            project.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                            project.status === 'On Hold' ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-600'
                                          }`}>
                                            {project.status}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default DeliveryPipeline;
