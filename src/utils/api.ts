let rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
if (rawApiUrl && !/^https?:\/\//i.test(rawApiUrl)) {
  rawApiUrl = `http://${rawApiUrl}`;
}
const API_BASE_URL = `${rawApiUrl}/api/v1`;

export interface ApiWorkflowTask {
  id: string;
  name: string;
  order: number;
  x: number;
  y: number;
  conditionData: string | null;
}

export interface ApiWorkflow {
  id: string;
  name: string;
  version: string;
  ownerId: string;
  rating: number;
  enabled: boolean;
  tasks: any[];
  forms: any[];
}


export interface ApiHistoryVersion {
  id: number;
  workflowId: string;
  version: string;
  modifiedAt: string;
  modifiedBy: string;
  changeSummary: string;
}

// Helpers for token storage
export const getAuthToken = () => localStorage.getItem('bank_workflow_token');
export const setAuthToken = (token: string) => localStorage.setItem('bank_workflow_token', token);
export const removeAuthToken = () => localStorage.removeItem('bank_workflow_token');
export const getAuthUsername = () => localStorage.getItem('bank_workflow_username');
export const setAuthUsername = (username: string) => localStorage.setItem('bank_workflow_username', username);

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async login(username: string, password: string): Promise<{ token: string; username: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error de inicio de sesión' }));
      throw new Error(err.message || 'Credenciales inválidas');
    }

    const data = await res.json();
    setAuthToken(data.token);
    setAuthUsername(data.username);
    return data;
  },

  async register(username: string, password: string, email: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, role: 'ROLE_ADMIN' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error de registro' }));
      throw new Error(err.message || 'Error al registrar usuario');
    }

    return res.text();
  },

  async getWorkflows(): Promise<ApiWorkflow[]> {
    const res = await fetch(`${API_BASE_URL}/workflows`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      throw new Error('No se pudieron obtener los workflows de la base de datos');
    }

    return res.json();
  },

  async getWorkflow(id: string): Promise<ApiWorkflow> {
    const res = await fetch(`${API_BASE_URL}/workflows/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Error al cargar el workflow con ID: ${id}`);
    }

    return res.json();
  },

  async saveWorkflow(workflow: ApiWorkflow, changeSummary: string): Promise<ApiWorkflow> {
    const url = new URL(`${API_BASE_URL}/workflows`);
    if (changeSummary) {
      url.searchParams.append('changeSummary', changeSummary);
    }

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(workflow),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al guardar' }));
      throw new Error(err.message || 'Error al persistir el workflow en el servidor');
    }

    return res.json();
  },

  async getHistory(id: string): Promise<ApiHistoryVersion[]> {
    const res = await fetch(`${API_BASE_URL}/workflows/${id}/history`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      throw new Error('Error al consultar el historial de versiones');
    }

    return res.json();
  },

  async getHistoryVersionJson(id: string, version: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/workflows/${id}/history/${version}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      throw new Error('Error al obtener el snapshot histórico');
    }

    const text = await res.text();
    return JSON.parse(text);
  }
};
