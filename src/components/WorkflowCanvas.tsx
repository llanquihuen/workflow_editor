import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { TaskNode } from './TaskNode';
import { DUMMY_USERS } from '../utils/constants';

const nodeTypes = { customTask: TaskNode };

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 250, ranksep: 50 });

  nodes.forEach((node) => {
    const formTitles = node.data?.formTitles as string[] || [];
    // Base height ~110px. If there are forms, add the header space + space for each form.
    const estimatedHeight = 110 + (formTitles.length > 0 ? 25 + (formTitles.length * 18) : 25);
    dagreGraph.setNode(node.id, { width: 220, height: estimatedHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const formTitles = node.data?.formTitles as string[] || [];
    const estimatedHeight = 110 + (formTitles.length > 0 ? 25 + (formTitles.length * 18) : 25);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 220 / 2,
        y: nodeWithPosition.y - estimatedHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

const WorkflowCanvasContent = () => {
  const { t } = useTranslation();
  const {
    workflow,
    setSelectedTask,
    selectedTaskId,
    addTask,
    updateTask,
    updateTasksPositions,
    theme
  } = useWorkflowStore();

  const { fitView } = useReactFlow();

  const getConditionLabel = useCallback((condition: any, prefix: string) => {
    const form = (workflow.forms || []).find(f => f.id === condition.formId);
    const question = form?.questions.find(q => q.id === condition.questionId);
    if (!question) return t('common.conditional');

    let opText = '==';
    if (condition.operator === 'not_equals') opText = '!=';
    if (condition.operator === 'contains') opText = t('forms.operators.contains').toLowerCase();
    if (condition.operator === 'greater_than') opText = '>';
    if (condition.operator === 'less_than') opText = '<';

    return `${prefix} ${question.label} ${opText} ${condition.value}`;
  }, [workflow.forms, t]);

  const rawNodes: Node[] = useMemo(() => {
    return workflow.tasks.map((task) => {
      const formTitles = (task.formIds || []).map(id => {
        const form = (workflow.forms || []).find(f => f.id === id);
        return form ? form.title : id;
      });

      const approverNames = (task.approverIds || []).map(id => {
        const user = DUMMY_USERS.find(u => u.id === id);
        return user ? user.name.split(' (')[0] : id;
      });

      return {
        id: task.id,
        type: 'customTask',
        position: { x: task.ui_metadata.x, y: task.ui_metadata.y },
        data: {
          label: task.name,
          formTitles: formTitles,
          approvers: approverNames,
          condition: task.condition,
          skipCondition: task.skipCondition,
          skipLabel: task.skipCondition ? getConditionLabel(task.skipCondition, t('canvas.skip_if')) : null,
          order: task.order,
          taskType: task.taskType || 'normal'
        },
        selected: selectedTaskId === task.id
      };
    });
  }, [workflow.tasks, workflow.forms, selectedTaskId, getConditionLabel, t]);

  const rawEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    if (workflow.tasks.length === 0) return edges;

    let uncoveredLeaves = [workflow.tasks[0].id];

    const isSameCondition = (c1: any, c2: any) => {
      if (!c1 && !c2) return true;
      if (!c1 || !c2) return false;
      return c1.dependentTaskId === c2.dependentTaskId &&
        c1.formId === c2.formId &&
        c1.questionId === c2.questionId &&
        c1.operator === c2.operator &&
        c1.value === c2.value;
    };

    for (let i = 1; i < workflow.tasks.length; i++) {
      const targetTask = workflow.tasks[i];
      const isConditional = !!targetTask.condition;
      const isSkipTarget = !!targetTask.skipCondition;

      if (isConditional) {
        let sourceId = '';

        // Buscar hacia atrás la tarea origen:
        // 1. O la última tarea incondicional.
        // 2. O la última tarea con exactamente la misma condición.
        for (let j = i - 1; j >= 0; j--) {
          const prevTask = workflow.tasks[j];
          if (!prevTask.condition || isSameCondition(prevTask.condition, targetTask.condition)) {
            sourceId = prevTask.id;
            break;
          }
        }

        if (!sourceId) sourceId = workflow.tasks[0].id; // Fallback

        const sourceTask = workflow.tasks.find(t => t.id === sourceId);
        const sourceHasSameCondition = isSameCondition(sourceTask?.condition, targetTask.condition);

        let label = undefined;
        // Solo mostrar label si es el inicio de la rama
        if (!sourceHasSameCondition) {
          const form = (workflow.forms || []).find(f => f.id === targetTask.condition!.formId);
          const question = form?.questions.find(q => q.id === targetTask.condition!.questionId);
          if (question) {
            label = getConditionLabel(targetTask.condition!, t('canvas.if'));
          } else {
            label = t('common.conditional');
          }
        }

        edges.push({
          id: `e-${sourceId}-${targetTask.id}`,
          source: sourceId,
          target: targetTask.id,
          animated: true,
          label: isSkipTarget
            ? getConditionLabel(targetTask.skipCondition!, t('canvas.skip_if'))
            : label,
          style: {
            stroke: '#fbbf24',
            strokeWidth: 2,
            strokeDasharray: isSkipTarget ? '1,6' : '5,5',
            strokeLinecap: isSkipTarget ? 'round' : undefined,
          },
          labelShowBg: !!(label || isSkipTarget),
          labelBgPadding: (label || isSkipTarget) ? [6, 3] : undefined,
          labelBgBorderRadius: (label || isSkipTarget) ? 4 : undefined,
          labelBgStyle: (label || isSkipTarget) ? { fill: '#ffffff', fillOpacity: 0.95 } : undefined,
          labelStyle: (label || isSkipTarget) ? { fill: '#111827', fontWeight: 700, fontSize: 11 } : undefined,
        });

        if (sourceHasSameCondition) {
          // Reemplaza a su predecesor directo en las hojas (es una continuación)
          uncoveredLeaves = uncoveredLeaves.filter(id => id !== sourceId);
          uncoveredLeaves.push(targetTask.id);
        } else {
          // Es una nueva rama, el origen no se consume
          uncoveredLeaves.push(targetTask.id);
        }

      } else {
        // Tarea incondicional: conecta desde TODAS las hojas no cubiertas
        if (uncoveredLeaves.length === 0) {
          uncoveredLeaves.push(workflow.tasks[i - 1].id);
        }

        uncoveredLeaves.forEach(leafId => {
          edges.push({
            id: `e-${leafId}-${targetTask.id}`,
            source: leafId,
            target: targetTask.id,
            animated: false,
            label: isSkipTarget
              ? getConditionLabel(targetTask.skipCondition!, t('canvas.skip_if'))
              : undefined,
            style: {
              stroke: 'var(--edge-stroke)',
              strokeWidth: 2,
              strokeDasharray: isSkipTarget ? '1,6' : undefined,
              strokeLinecap: isSkipTarget ? 'round' : undefined,
            },
            labelShowBg: isSkipTarget,
            labelBgPadding: isSkipTarget ? [6, 3] : undefined,
            labelBgBorderRadius: isSkipTarget ? 4 : undefined,
            labelBgStyle: isSkipTarget ? { fill: '#ffffff', fillOpacity: 0.95 } : undefined,
            labelStyle: isSkipTarget ? { fill: '#111827', fontWeight: 700, fontSize: 11 } : undefined,
          });
        });

        // Esta tarea consume todas las ramas
        uncoveredLeaves = [targetTask.id];
      }

    }
    return edges;
  }, [workflow.tasks, workflow.forms, getConditionLabel, t]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rawNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);

  useEffect(() => {
    setNodes(rawNodes);
  }, [rawNodes, setNodes]);

  useEffect(() => {
    setEdges(rawEdges);
  }, [rawEdges, setEdges]);

  const tasksOrderSignature = workflow.tasks.map(t => t.id).join(',');
  const edgesSignature = rawEdges.map(e => `${e.source}->${e.target}`).join(',');

  const prevTasksOrder = useRef("");
  const prevEdgesSignature = useRef("");

  const handleAutoLayout = useCallback(() => {
    if (rawNodes.length === 0) return;
    const { nodes: layoutedNodes } = getLayoutedElements(rawNodes, rawEdges);
    updateTasksPositions(layoutedNodes.map(n => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y
    })));
  }, [rawNodes, rawEdges, updateTasksPositions]);

  useEffect(() => {
    if (
      tasksOrderSignature !== prevTasksOrder.current ||
      edgesSignature !== prevEdgesSignature.current
    ) {
      prevTasksOrder.current = tasksOrderSignature;
      prevEdgesSignature.current = edgesSignature;
      handleAutoLayout();
    }
  }, [tasksOrderSignature, edgesSignature, handleAutoLayout]);

  // Smoothly center and fit viewport whenever tasks list or edges change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 600, padding: 0.2 });
    }, 120);
    return () => clearTimeout(timer);
  }, [fitView, tasksOrderSignature, edgesSignature]);

  const lastCenteredTaskId = useRef<string | null>(null);

  // Smoothly center on the selected task when selectedTaskId changes
  useEffect(() => {
    if (selectedTaskId && selectedTaskId !== lastCenteredTaskId.current) {
      const targetNode = nodes.find(n => n.id === selectedTaskId);
      if (targetNode) {
        lastCenteredTaskId.current = selectedTaskId;
        fitView({
          nodes: [{ id: selectedTaskId }],
          duration: 500,
          padding: 0.3,
          maxZoom: 0.85
        });
      }
    } else if (!selectedTaskId) {
      lastCenteredTaskId.current = null;
    }
  }, [selectedTaskId, fitView, nodes]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedTask(node.id);
    },
    [setSelectedTask]
  );

  const onPaneClick = useCallback(() => {
    // No-op: Evita deseleccionar la tarea activa al hacer clic en el fondo del lienzo
  }, []);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    updateTask(node.id, { ui_metadata: { x: node.position.x, y: node.position.y } });
  }, [updateTask]);

  const isDuplicateTaskName = (name: string) => {
    return workflow.tasks.some(t => t.name.toLowerCase() === name.toLowerCase().trim());
  };

  const handleAddNewTask = () => {
    let baseName = t('tasks.new_task');
    let newName = baseName;
    let counter = 1;
    while (isDuplicateTaskName(newName)) {
      newName = `${baseName} ${counter}`;
      counter++;
    }

    const newTask = {
      id: `task-${Date.now()}`,
      name: newName,
      order: workflow.tasks.length + 1,
      ui_metadata: { x: 0, y: 0 }
    };
    addTask(newTask);
  };

  return (
    <div className="panel-container canvas-panel" style={{ position: 'relative' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{t('canvas.title')}</h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn-premium-action" onClick={handleAddNewTask}>{t('tasks.add_task')}</button>
        </div>
      </div>
      <div className="panel-content" style={{ padding: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
        >
          <Background color={theme === 'light' ? '#cbd5e1' : '#334155'} gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export const WorkflowCanvas = () => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent />
    </ReactFlowProvider>
  );
};
