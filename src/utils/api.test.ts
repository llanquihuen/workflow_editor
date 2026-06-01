import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, getAuthToken, setAuthToken, removeAuthToken, getAuthUsername, setAuthUsername } from './api';

// Sustituimos la función fetch global del navegador por una función falsa de Vitest
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('API Utils (src/utils/api.ts)', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
  });

  describe('Autenticación LocalStorage', () => {
    it('debería guardar y recuperar el token y nombre de usuario correctamente', () => {
      setAuthToken('test-token');
      expect(getAuthToken()).toBe('test-token');
      
      setAuthUsername('test-user');
      expect(getAuthUsername()).toBe('test-user');
      
      removeAuthToken();
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('Llamadas a la API Backend', () => {
    it('login - debería hacer login y guardar el token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'mock-token', username: 'mock-user' })
      });

      const result = await api.login('user', 'pass');
      expect(result.token).toBe('mock-token');
      expect(getAuthToken()).toBe('mock-token'); // Verificamos que se guardó
    });

    it('login - debería fallar si las credenciales son incorrectas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Credenciales inválidas' })
      });

      await expect(api.login('user', 'bad-pass')).rejects.toThrow('Credenciales inválidas');
    });

    it('getWorkflows - debería obtener la lista de flujos y pasar los headers', async () => {
      setAuthToken('valid-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'wk-1', name: 'Flujo 1' }]
      });

      const workflows = await api.getWorkflows();
      expect(workflows.length).toBe(1);
      
      // Verificamos que se haya enviado el token en la petición
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
    });

    it('getWorkflow - debería obtener un flujo específico', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'wk-1', name: 'Flujo 1' })
      });
      const data = await api.getWorkflow('wk-1');
      expect(data.name).toBe('Flujo 1');
    });

    it('saveWorkflow - debería guardar el flujo y enviar changeSummary como QueryParam', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'wk-1', name: 'Saved' })
      });
      const data = await api.saveWorkflow({ id: 'wk-1' } as any, 'Agregada nueva tarea');
      
      expect(data.name).toBe('Saved');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('changeSummary=Agregada+nueva+tarea'),
        expect.any(Object)
      );
    });

    it('deleteWorkflow - debería eliminar un flujo sin errores', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await expect(api.deleteWorkflow('wk-1')).resolves.not.toThrow();
    });

    it('deleteWorkflow - debería capturar y lanzar error 403 (No autorizado)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
      await expect(api.deleteWorkflow('wk-1')).rejects.toThrow('No tiene permisos para eliminar este flujo');
    });

    it('getHistory - debería obtener el historial', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ version: 'v1.0', changeSummary: 'Init' }]
      });
      const data = await api.getHistory('wk-1');
      expect(data[0].version).toBe('v1.0');
    });

    it('getHistoryVersionJson - debería parsear la versión como JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'wk-1', version: 'v1.5' })
      });
      const data = await api.getHistoryVersionJson('wk-1', 'v1.5');
      expect(data.version).toBe('v1.5');
    });

    it('register - debería registrar exitosamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Usuario creado'
      });
      const res = await api.register('user', 'pass', 'email');
      expect(res).toBe('Usuario creado');
    });
  });
});
