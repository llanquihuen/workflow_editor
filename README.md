# Workflow Editor Visual

A powerful, interactive workflow editor built with React, TypeScript, and Zustand. This tool allows developers and designers to visualize, build, and modify complex process logic through both an interactive visual node canvas and real-time JSON code editing.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Zustand](https://img.shields.io/badge/Zustand-State-orange) ![React Flow](https://img.shields.io/badge/React%20Flow-12-ff0072) ![Monaco Editor](https://img.shields.io/badge/Monaco-Editor-lightgrey)

## ✨ Key Features

*   **Real-Time Bidirectional Synchronization:** Modify the JSON code and watch the visual diagram update automatically. Drag a node in the canvas and watch its `x` and `y` coordinates change in the JSON immediately.
*   **Smart Auto-Layout Engine:** Uses `dagre` to automatically resolve and organize directed acyclic graph (DAG) architectures. If you move too many elements and the canvas gets messy, the "Auto-Layout" button will reposition tasks while respecting their logical order and conditional branches.
*   **Spatial Freedom (Drag & Drop):** Free and persistent node positioning on the canvas, saved internally in the workflow's JSON structure.
*   **Dynamic Branching Logic:** Tasks flow linearly by default. However, when you set up a condition based on answers from previous forms, the canvas engine visually branches the flow to show parallel paths (e.g., if `role == admin`).
*   **Dark and Light Themes:** Built with CSS variables to support an instant toggle between "Dark Mode" and "Light Mode" (including automatic theme adaptation for the Monaco Editor environment).
*   **Integrated Task Management:** A side panel to configure task names, reorder their logical sequence (`up`/`down`), associate global forms, and assign approvers without touching a single line of code.

## 🛠️ Technologies Used

*   **Core:** React 18, TypeScript, Vite.
*   **Graph Visualization:** `@xyflow/react` (React Flow) for rendering the interactive canvas and connection lines.
*   **Layout Algorithm:** `dagre` for mathematical calculation of automatic, collision-free node positions.
*   **Code Editor:** `@monaco-editor/react` to provide a VS Code-like experience directly in the browser with JSON validation and syntax highlighting.
*   **State Management:** `zustand` for reactive and lightning-fast global state storage.
*   **Styling:** Vanilla CSS with variable architectures for theming (`:root` and `.light-theme`).

## 🚀 Installation and Local Setup

Follow these steps to run the development environment on your local machine.

1.  **Clone the repository** or download the files.
2.  **Install dependencies** using `npm` (or `yarn`/`pnpm`):
    ```bash
    npm install
    ```
3.  **Start the local development server:**
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to `http://localhost:5173` (or the port indicated in your terminal).

## 🧩 Data Structure (JSON)

The entire editor revolves around a unified JSON object. The base format for each task is as follows:

```json
{
  "id": "task-1",
  "name": "Application Entry",
  "order": 1,
  "formIds": ["form-global-1"],
  "approverIds": ["user-1", "user-2"],
  "condition": {
    "dependentTaskId": "task-0",
    "formId": "form-global-0",
    "questionId": "q-1",
    "operator": "equals",
    "value": "Admin"
  },
  "ui_metadata": {
    "x": 0,
    "y": 150
  }
}
```
*The properties within `condition` will automatically determine whether the canvas visualizes the task within the main sequential flow or branches it off as a parallel path.*

## ⚙️ Useful Commands

*   `npm run dev` - Starts the development environment.
*   `npm run build` - Compiles the project with TypeScript and generates an optimized production bundle in the `dist` folder.
*   `npm run preview` - Starts a lightweight local server to test the compiled production bundle.

## 👥 Contributing

Feel free to experiment, add new custom node types, or integrate additional UI components. All diagramming logic is centralized in `WorkflowCanvas.tsx`, and the storage schema lives in `useWorkflowStore.ts`.
