import { create } from 'zustand';
import type { Workflow, Task, Form } from '../types/workflow.types';

type ViewMode = 'flow' | 'forms';

interface WorkflowState {
  workflow: Workflow;
  updateWorkflow: (newWorkflow: Workflow) => void;

  // Navigation State
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;

  // Task State
  selectedTaskId: string | null;
  setSelectedTask: (id: string | null) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTasksPositions: (positions: { id: string, x: number, y: number }[]) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  reorderTask: (taskId: string, direction: 'up' | 'down') => void;

  // Form State
  selectedFormId: string | null;
  setSelectedForm: (id: string | null) => void;
  addForm: (form: Form) => void;
  updateForm: (formId: string, updates: Partial<Form>) => void;
  deleteForm: (formId: string) => void;
}

// Función auxiliar para recalcular el layout vertical y el orden
const recalculateLayout = (tasks: Task[]): Task[] => {
  return tasks.map((task, index) => ({
    ...task,
    order: index + 1,
    ui_metadata: {
      x: 250,
      y: index * 150 + 50
    }
  }));
};

const initialTasks: Task[] = recalculateLayout([
  {
    id: "task-1",
    name: "Registro e Inscripción",
    order: 1,
    formIds: ["form-registro"],
    ui_metadata: { x: 0, y: 0 }
  },
  {
    id: "task-2",
    name: "Autorización de Menores",
    order: 2,
    formIds: ["form-autorizacion"],
    condition: {
      dependentTaskId: "task-1",
      formId: "form-registro",
      questionId: "q-edad",
      operator: "less_than",
      value: "18"
    },
    ui_metadata: { x: 0, y: 0 }
  },
  {
    id: "task-3",
    name: "Trámites de Viaje Internacional",
    order: 3,
    formIds: ["form-internacional"],
    condition: {
      dependentTaskId: "task-1",
      formId: "form-registro",
      questionId: "q-origen",
      operator: "equals",
      value: "Sí, viaje internacional"
    },
    ui_metadata: { x: 0, y: 0 }
  },
  {
    id: "task-4",
    name: "Logística de Alojamiento",
    order: 4,
    formIds: ["form-estancia"],
    ui_metadata: { x: 0, y: 0 }
  },
  {
    id: "task-5",
    name: "Preparación de Equipamiento Técnico",
    order: 5,
    formIds: ["form-equipamiento"],
    condition: {
      dependentTaskId: "task-1",
      formId: "form-registro",
      questionId: "q-curso",
      operator: "equals",
      value: "Introducción a React & TypeScript"
    },
    ui_metadata: { x: 0, y: 0 }
  },
  {
    id: "task-6",
    name: "Aprobación Académica y Presupuestaria",
    order: 6,
    approverIds: ["usr-1", "usr-2", "usr-3"],
    ui_metadata: { x: 0, y: 0 }
  }
]);

const initialWorkflow: Workflow = {
  id: 'wf-001',
  name: 'Acreditación Académica y Logística Internacional',
  tasks: initialTasks,
  forms: [
    {
      id: "form-registro",
      title: "Registro del Participante",
      description: "Recopilación de información básica y selección del curso académico.",
      questions: [
        {
          id: "q-nombre",
          type: "text",
          label: "Nombre completo del alumno",
          required: true
        },
        {
          id: "q-edad",
          type: "number",
          label: "Edad",
          required: true
        },
        {
          id: "q-origen",
          type: "dropdown",
          label: "¿Proviene del extranjero?",
          options: [
            "No, residente nacional",
            "Sí, viaje internacional"
          ],
          required: true
        },
        {
          id: "q-pais-origen",
          type: "text",
          label: "País de procedencia",
          required: true,
          condition: {
            questionId: "q-origen",
            operator: "equals",
            value: "Sí, viaje internacional"
          }
        },
        {
          id: "q-curso",
          type: "dropdown",
          label: "Curso Seleccionado",
          options: [
            "Liderazgo Efectivo",
            "Introducción a React & TypeScript",
            "Seguridad de la Información"
          ],
          required: true
        },
        {
          id: "q-experiencia-previa",
          type: "dropdown",
          label: "¿Tiene conocimientos previos en programación?",
          options: [
            "No, principiante",
            "Sí, nivel básico",
            "Sí, nivel avanzado"
          ],
          required: true,
          condition: {
            questionId: "q-curso",
            operator: "equals",
            value: "Introducción a React & TypeScript"
          }
        }
      ]
    },
    {
      id: "form-autorizacion",
      title: "Consentimiento de Apoderado",
      description: "Requerido únicamente para participantes menores de 18 años.",
      questions: [
        {
          id: "q-nombre-apoderado",
          type: "text",
          label: "Nombre completo del tutor o apoderado legal",
          required: true
        },
        {
          id: "q-telefono-tutor",
          type: "text",
          label: "Teléfono de emergencia del apoderado",
          required: true
        },
        {
          id: "q-tipo-tutoria",
          type: "dropdown",
          label: "Tipo de parentesco",
          options: [
            "Padre/Madre",
            "Tutor Legal",
            "Otro familiar facultado"
          ],
          required: true
        },
        {
          id: "q-detalles-tutoria",
          type: "text",
          label: "Especifique el tipo de parentesco o tutoría",
          required: true,
          condition: {
            questionId: "q-tipo-tutoria",
            operator: "equals",
            value: "Otro familiar facultado"
          }
        }
      ]
    },
    {
      id: "form-internacional",
      title: "Visas y Permisos de Viaje",
      description: "Información para la llegada del participante al país sede.",
      questions: [
        {
          id: "q-tiene-visa",
          type: "dropdown",
          label: "¿Cuenta con visa o permiso de viaje vigente?",
          options: [
            "Sí, vigente",
            "No, requiere asistencia de la empresa",
            "No, pero la gestionaré por mi cuenta"
          ],
          required: true
        },
        {
          id: "q-numero-visa",
          type: "text",
          label: "Número de visado o ID de viaje",
          required: true,
          isSensitive: true,
          condition: {
            questionId: "q-tiene-visa",
            operator: "equals",
            value: "Sí, vigente"
          }
        },
        {
          id: "q-documento-asistencia",
          type: "dropdown",
          label: "Tipo de asistencia consular requerida",
          options: [
            "Carta de Invitación Firmada",
            "Patrocinio Completo",
            "Certificado de Inscripción"
          ],
          required: true,
          condition: {
            questionId: "q-tiene-visa",
            operator: "equals",
            value: "No, requiere asistencia de la empresa"
          }
        }
      ]
    },
    {
      id: "form-estancia",
      title: "Logística y Alojamiento",
      description: "Gestión de hospedaje y requerimientos personales.",
      questions: [
        {
          id: "q-requiere-alojamiento",
          type: "dropdown",
          label: "¿Requiere alojamiento corporativo?",
          options: [
            "No, resido en la ciudad del curso",
            "Sí, en hotel corporativo de la empresa",
            "Sí, en domicilio particular o familiar"
          ],
          required: true
        },
        {
          id: "q-hotel-sucursal",
          type: "dropdown",
          label: "Sucursal del Hotel Corporativo asignada",
          options: [
            "Hotel Plaza Centro",
            "Hotel Plaza Costanera"
          ],
          required: true,
          condition: {
            questionId: "q-requiere-alojamiento",
            operator: "equals",
            value: "Sí, en hotel corporativo de la empresa"
          }
        },
        {
          id: "q-direccion-particular",
          type: "text",
          label: "Dirección completa del domicilio de estancia",
          required: true,
          isSensitive: true,
          condition: {
            questionId: "q-requiere-alojamiento",
            operator: "equals",
            value: "Sí, en domicilio particular o familiar"
          }
        },
        {
          id: "q-regimen-alimentario",
          type: "dropdown",
          label: "¿Tiene requerimientos alimenticios específicos?",
          options: [
            "No, ninguno",
            "Vegano / Vegetariano",
            "Alergias o Restricciones Médicas"
          ],
          required: true,
          condition: {
            questionId: "q-requiere-alojamiento",
            operator: "not_equals",
            value: "No, resido en la ciudad del curso"
          }
        },
        {
          id: "q-especificar-alergias",
          type: "text",
          label: "Especifique las alergias o restricciones médicas",
          required: true,
          condition: {
            questionId: "q-regimen-alimentario",
            operator: "equals",
            value: "Alergias o Restricciones Médicas"
          }
        }
      ]
    },
    {
      id: "form-equipamiento",
      title: "Requerimientos Tecnológicos",
      description: "Preparación de los recursos informáticos para las clases.",
      questions: [
        {
          id: "q-computador-tipo",
          type: "dropdown",
          label: "¿Qué tipo de equipo utilizará en el curso?",
          options: [
            "Laptop personal",
            "Laptop provista por la empresa"
          ],
          required: true
        },
        {
          id: "q-os-preferido",
          type: "dropdown",
          label: "Sistema Operativo preferido para el entorno",
          options: [
            "macOS (Recomendado)",
            "Windows 11",
            "Linux (Ubuntu)"
          ],
          required: true
        },
        {
          id: "q-os-personalizado",
          type: "text",
          label: "Especifique distribución o entorno personalizado",
          required: true,
          condition: {
            questionId: "q-os-preferido",
            operator: "equals",
            value: "Linux (Ubuntu)"
          }
        },
        {
          id: "q-requiere-pantalla-extra",
          type: "dropdown",
          label: "¿Requiere monitor secundario para el laboratorio?",
          options: [
            "Sí, monitor 24\" FHD",
            "No, suficiente con la pantalla de la laptop"
          ],
          required: true
        }
      ]
    }
  ]
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflow: initialWorkflow,
  currentView: 'flow',
  selectedTaskId: null,
  selectedFormId: null,
  theme: 'light',

  updateWorkflow: (newWorkflow) => set({ workflow: newWorkflow }),

  setCurrentView: (view) => set({ currentView: view }),

  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  updateTask: (taskId, updates) => set((state) => ({
    workflow: {
      ...state.workflow,
      tasks: state.workflow.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    },
  })),

  updateTasksPositions: (positions) => set((state) => {
    const newTasks = state.workflow.tasks.map(task => {
      const pos = positions.find(p => p.id === task.id);
      if (pos) {
        return { ...task, ui_metadata: { x: pos.x, y: pos.y } };
      }
      return task;
    });
    return { workflow: { ...state.workflow, tasks: newTasks } };
  }),

  addTask: (task) => set((state) => {
    const newTasks = [...state.workflow.tasks, task];
    return {
      workflow: {
        ...state.workflow,
        tasks: recalculateLayout(newTasks),
      },
      selectedTaskId: task.id
    };
  }),

  deleteTask: (taskId) => set((state) => {
    const tasks = state.workflow.tasks;
    const index = tasks.findIndex(t => t.id === taskId);

    // Proteger la tarea inicial (índice 0)
    if (index === 0) return state;

    const newTasks = tasks.filter(t => t.id !== taskId);

    return {
      workflow: {
        ...state.workflow,
        tasks: recalculateLayout(newTasks),
      },
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId
    };
  }),

  reorderTask: (taskId, direction) => set((state) => {
    const tasks = [...state.workflow.tasks];
    const index = tasks.findIndex(t => t.id === taskId);

    if (index === -1) return state;

    // Reglas de protección de la tarea inicial (índice 0)
    if (index === 0 && direction === 'down') return state; // La 0 no puede bajar
    if (index === 1 && direction === 'up') return state;   // La 1 no puede subir (reemplazar a la 0)

    // Restricciones lógicas de condiciones
    if (direction === 'up' && index > 1) { // Nota: > 1 para no afectar a la 0
      const taskToMove = tasks[index];
      if (taskToMove.condition) {
        const depIndex = tasks.findIndex(t => t.id === taskToMove.condition!.dependentTaskId);
        if (index - 1 <= depIndex) {
          return state; // No puede subir por encima (o al mismo nivel) de su dependencia
        }
      }

      const temp = tasks[index];
      tasks[index] = tasks[index - 1];
      tasks[index - 1] = temp;
    } else if (direction === 'down' && index > 0 && index < tasks.length - 1) {
      const taskToMove = tasks[index];
      const taskBelow = tasks[index + 1];
      if (taskBelow.condition && taskBelow.condition.dependentTaskId === taskToMove.id) {
        return state; // No puede bajar por debajo de una tarea que depende de ella
      }

      const temp = tasks[index];
      tasks[index] = tasks[index + 1];
      tasks[index + 1] = temp;
    } else {
      return state;
    }

    return {
      workflow: {
        ...state.workflow,
        tasks: recalculateLayout(tasks)
      }
    };
  }),

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  setSelectedForm: (id) => set({ selectedFormId: id }),

  addForm: (form) => set((state) => ({
    workflow: {
      ...state.workflow,
      forms: [...(state.workflow.forms || []), form]
    }
  })),

  updateForm: (formId, updates) => set((state) => ({
    workflow: {
      ...state.workflow,
      forms: (state.workflow.forms || []).map((form) =>
        form.id === formId ? { ...form, ...updates } : form
      )
    }
  })),

  deleteForm: (formId) => set((state) => ({
    workflow: {
      ...state.workflow,
      forms: (state.workflow.forms || []).filter(f => f.id !== formId),
      tasks: state.workflow.tasks.map(t => {
        if (t.formIds?.includes(formId)) {
          return { ...t, formIds: t.formIds.filter(id => id !== formId) };
        }
        return t;
      })
    },
    selectedFormId: state.selectedFormId === formId ? null : state.selectedFormId
  })),
}));
