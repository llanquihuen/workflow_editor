import { describe, it, expect } from 'vitest';
import { DUMMY_USERS } from './constants';

describe('Constants', () => {
  it('DUMMY_USERS debería contener una lista de usuarios con id y name', () => {
    expect(Array.isArray(DUMMY_USERS)).toBe(true);
    expect(DUMMY_USERS.length).toBeGreaterThan(0);
    
    const firstUser = DUMMY_USERS[0];
    expect(firstUser).toHaveProperty('id');
    expect(firstUser).toHaveProperty('name');
  });
});
