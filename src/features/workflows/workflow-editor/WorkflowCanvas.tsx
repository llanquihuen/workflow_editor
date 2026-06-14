import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
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
import { TaskNode } from './components/TaskNode';
import { DUMMY_USERS } from '../../../utils/constants';

const nodeTypes = { customTask: TaskNode };

const estimateNodeHeight = (node: Node) => {
  const formTitles = node.data?.formTitles as string[] || [];
  const approvers = node.data?.approvers as string[] || [];
  const hasOverwriteCondition = !!node.data?.hasOverwriteCondition;
  const taskType = node.data?.taskType || 'normal';

  // 1. Header is roughly 40px
  let estimatedHeight = 40;

  // 2. Forms Section
  if (formTitles.length > 0) {
    estimatedHeight += 24 + (formTitles.length * 18);
  } else {
    estimatedHeight += 24; // empty space/padding
  }

  // 3. Approvers / Badges Section
  if (taskType === 'normal') {
    if (approvers.length > 0) {
      estimatedHeight += 52; // "Approvers (N)" label + avatar stack
    } else {
      estimatedHeight += 24; // empty space/padding
    }
    if (hasOverwriteCondition) {
      estimatedHeight += 28; // Overwritable badge + margin
    }
  } else {
    // Dynamic, ISO, System step badges
    estimatedHeight += 32;
  }

  // Add safety margins
  return estimatedHeight + 16;
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 250, ranksep: 50 });

  nodes.forEach((node) => {
    const estimatedHeight = estimateNodeHeight(node);
    dagreGraph.setNode(node.id, { width: 220, height: estimatedHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const estimatedHeight = estimateNodeHeight(node);

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
  const [simulatedSkippedTaskIds, setSimulatedSkippedTaskIds] = useState<string[]>([]);
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

  const getConditionRulesDescription = useCallback((cond: any) => {
    if (!cond || !cond.rules || cond.rules.length === 0) return '';
    
    return cond.rules.map((rule: any, idx: number) => {
      const form = (workflow.forms || []).find(f => f.id === rule.formId);
      const question = form?.questions.find(q => q.id === rule.questionId);
      if (!question) return `${rule.connective} rule`;
      
      let opText = '==';
      if (rule.operator === 'not_equals') opText = '!=';
      if (rule.operator === 'contains') opText = t('forms.operators.contains').toLowerCase();
      if (rule.operator === 'greater_than') opText = '>';
      if (rule.operator === 'less_than') opText = '<';
      
      const connectiveLabel = idx === 0 ? t('canvas.if', { defaultValue: 'If' }) : rule.connective;
      
      return `${connectiveLabel} [${question.label}] ${opText} "${rule.value}"`;
    }).join(' ');
  }, [workflow.forms, t]);

  const getForcedApproverNames = useCallback((cond: any) => {
    if (!cond || !cond.forcedApproverIds || cond.forcedApproverIds.length === 0) return '';
    return cond.forcedApproverIds.map((id: string) => {
      const user = DUMMY_USERS.find(u => u.id === id);
      return user ? user.name.split(' (')[0] : id;
    }).join(', ');
  }, []);

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

      const overwriteConditionsInfo = (task.conditions || [])
        .filter(c => c.type === 'overwrite')
        .map(c => {
          return {
            conditionName: c.name,
            rulesDescription: getConditionRulesDescription(c),
            forcedApprovers: getForcedApproverNames(c)
          };
        });

      return {
        id: task.id,
        type: 'customTask',
        position: { x: task.ui_metadata.x, y: task.ui_metadata.y },
        data: {
          label: task.name,
          formTitles: formTitles,
          approvers: approverNames,
          approverIds: task.approverIds || [],
          hasOverwriteCondition: (task.conditions || []).some(c => c.type === 'overwrite'),
          overwriteConditionsInfo: overwriteConditionsInfo,
          condition: task.condition,
          skipCondition: task.skipCondition,
          skipLabel: task.skipCondition ? getConditionLabel(task.skipCondition, t('canvas.skip_if')) : null,
          conditionsCount: (task.conditions || []).length,
          order: task.order,
          taskType: task.taskType || 'normal',
          isSkipped: simulatedSkippedTaskIds.includes(task.id)
        },
        selected: selectedTaskId === task.id
      };
    });
  }, [workflow.tasks, workflow.forms, selectedTaskId, getConditionLabel, getConditionRulesDescription, getForcedApproverNames, simulatedSkippedTaskIds, t]);

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
      const newSkipCondition = (targetTask.conditions || []).find(c => c.type === 'skip');
      const isSkipTarget = !!targetTask.skipCondition || !!newSkipCondition;

      let skipLabel: string | undefined = undefined;
      if (isSkipTarget) {
        if (newSkipCondition) {
          const prefix = t('canvas.skip_if', { defaultValue: 'Skip if' });
          const desc = getConditionRulesDescription(newSkipCondition);
          skipLabel = `${prefix}: ${desc}`;
        } else if (targetTask.skipCondition) {
          skipLabel = getConditionLabel(targetTask.skipCondition, t('canvas.skip_if'));
        }
      }

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
          label: isSkipTarget ? skipLabel : label,
          style: {
            stroke: isSkipTarget ? '#f97316' : '#fbbf24',
            strokeWidth: 2,
            strokeDasharray: isSkipTarget ? '5,5' : '5,5',
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
            label: isSkipTarget ? skipLabel : undefined,
            style: {
              stroke: isSkipTarget ? '#f9b116' : 'var(--edge-stroke)',
              strokeWidth: 2,
              strokeDasharray: isSkipTarget ? '5,5' : undefined,
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

    const processedEdges: Edge[] = [];
    const bypassEdges: Edge[] = [];

    edges.forEach(edge => {
      const targetTask = workflow.tasks.find(t => t.id === edge.target);
      const isTargetSkipped = simulatedSkippedTaskIds.includes(edge.target);
      const isSourceSkipped = simulatedSkippedTaskIds.includes(edge.source);

      // Check if this edge is a skip edge
      const newSkipCondition = (targetTask?.conditions || []).find(c => c.type === 'skip');
      const isSkipTarget = !!(targetTask?.skipCondition || newSkipCondition);

      const edgeStyle = { ...edge.style } as React.CSSProperties;
      let edgeAnimated = edge.animated;
      let edgeLabelBgStyle = edge.labelBgStyle ? { ...edge.labelBgStyle } as React.CSSProperties : undefined;
      const edgeLabelStyle = edge.labelStyle ? { ...edge.labelStyle } as React.CSSProperties : undefined;
      if (edgeLabelBgStyle) {
        edgeLabelBgStyle.fill = '#fff1e1';
        edgeLabelBgStyle.fillOpacity = 1;
        edgeLabelBgStyle.stroke = '#efb344';
        edgeLabelBgStyle.strokeWidth = 1;
        edgeLabelBgStyle.filter = 'drop-shadow(1px 1px 2px #EFB344FF)';
      }

      // Make skip edges hoverable/clickable by changing cursor and adding className
      let className = edge.className;
      if (isSkipTarget) {
        edgeStyle.cursor = 'pointer';
        className = (className ? `${className} ` : '') + 'clickable-flow-edge';
      }

      if (isSkipTarget && isTargetSkipped) {
        // The skip edge is active
        edgeStyle.stroke = '#22c55e';
        edgeStyle.strokeWidth = 3;
        edgeStyle.strokeDasharray = undefined;
        edgeAnimated = true;
        if (!edgeLabelBgStyle) {
          edgeLabelBgStyle = {};
        }
        edgeLabelBgStyle.fill = '#e1ffec';
        edgeLabelBgStyle.fillOpacity = 1;
        edgeLabelBgStyle.stroke = '#357a2d';
        edgeLabelBgStyle.strokeWidth = 1;
        edgeLabelBgStyle.filter = 'drop-shadow(1px 1px 2px #55ef44)';
        if (edgeLabelStyle) {
          edgeLabelStyle.fill = '#22c55e';
          edgeLabelStyle.fontWeight = 'bold';
        }
      } else if (isSourceSkipped || (isTargetSkipped && !isSkipTarget)) {
        // Regular incoming/outgoing edges to/from skipped node should turn faint/gray
        edgeStyle.stroke = '#94a3b8';
        edgeStyle.opacity = 0.25;
        edgeStyle.strokeDasharray = '3,3';
        edgeAnimated = false;
        if (edgeLabelStyle) {
          edgeLabelStyle.fill = '#94a3b8';
          edgeLabelStyle.opacity = 0.4;
        }
      }

      processedEdges.push({
        ...edge,
        animated: edgeAnimated,
        style: edgeStyle,
        labelBgStyle: edgeLabelBgStyle,
        labelStyle: edgeLabelStyle,
        className,
      });

      // Generate bypass edge if target is skipped and source is not skipped
      if (isTargetSkipped && !isSourceSkipped) {
        const targetIndex = workflow.tasks.findIndex(t => t.id === edge.target);
        let nextActiveId = '';
        for (let k = targetIndex + 1; k < workflow.tasks.length; k++) {
          const t = workflow.tasks[k];
          if (!simulatedSkippedTaskIds.includes(t.id)) {
            nextActiveId = t.id;
            break;
          }
        }

        if (nextActiveId) {
          bypassEdges.push({
            id: `bypass-${edge.source}-${nextActiveId}`,
            source: edge.source,
            target: nextActiveId,
            animated: true,
            label: t('canvas.bypassed_flow', { defaultValue: 'Bypassed' }),
            style: {
              stroke: '#22c55e',
              strokeWidth: 2.5,
              strokeDasharray: '5,5',
              cursor: 'pointer'
            },
            className: 'clickable-flow-edge',
            labelShowBg: true,
            labelBgPadding: [6, 3],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
            labelStyle: { fill: '#22c55e', fontWeight: 700, fontSize: 10 }
          });
        }
      }
    });

    const uniqueBypassEdges: Edge[] = [];
    const bypassKeys = new Set<string>();
    bypassEdges.forEach(be => {
      const key = `${be.source}->${be.target}`;
      if (!bypassKeys.has(key)) {
        bypassKeys.add(key);
        uniqueBypassEdges.push(be);
      }
    });

    return [...processedEdges, ...uniqueBypassEdges];
  }, [workflow.tasks, workflow.forms, getConditionLabel, getConditionRulesDescription, simulatedSkippedTaskIds, t]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rawNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);

  useEffect(() => {
    setNodes(rawNodes);
  }, [rawNodes, setNodes]);

  useEffect(() => {
    setEdges(rawEdges);
  }, [rawEdges, setEdges]);

  const tasksOrderSignature = workflow.tasks.map(t => t.id).join(',');
  const edgesSignature = rawEdges
    .filter(e => !e.id.startsWith('bypass-'))
    .map(e => `${e.source}->${e.target}`)
    .join(',');

  const prevTasksOrder = useRef("");
  const prevEdgesSignature = useRef("");

  const handleAutoLayout = useCallback(() => {
    if (rawNodes.length === 0) return;
    const baselineEdges = rawEdges.filter(e => !e.id.startsWith('bypass-'));
    const { nodes: layoutedNodes } = getLayoutedElements(rawNodes, baselineEdges);
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
          maxZoom: 1.0
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

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (edge.id.startsWith('bypass-')) {
      const match = edge.id.match(/^bypass-(.+?)-(.+)$/);
      if (match) {
        const sourceId = match[1];
        const targetId = match[2];
        const sourceIndex = workflow.tasks.findIndex(t => t.id === sourceId);
        const targetIndex = workflow.tasks.findIndex(t => t.id === targetId);
        if (sourceIndex !== -1 && targetIndex !== -1) {
          const bypassedIds = workflow.tasks
            .slice(sourceIndex + 1, targetIndex)
            .map(t => t.id);
          
          setSimulatedSkippedTaskIds(prev => prev.filter(id => !bypassedIds.includes(id)));
        }
      }
      return;
    }

    const targetTaskId = edge.target;
    const targetTask = workflow.tasks.find(t => t.id === targetTaskId);
    if (!targetTask) return;

    const newSkipCondition = (targetTask.conditions || []).find(c => c.type === 'skip');
    const isSkipTarget = !!targetTask.skipCondition || !!newSkipCondition;

    if (isSkipTarget) {
      setSimulatedSkippedTaskIds(prev => {
        if (prev.includes(targetTaskId)) {
          return prev.filter(id => id !== targetTaskId);
        } else {
          return [...prev, targetTaskId];
        }
      });
    }
  }, [workflow.tasks, setSimulatedSkippedTaskIds]);

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
          <button className="btn-premium-outline" onClick={handleAutoLayout}>
            {t('canvas.auto_layout', { defaultValue: 'Auto-Layout' })}
          </button>
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
          onEdgeClick={onEdgeClick}
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
