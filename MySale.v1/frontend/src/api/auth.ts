import api from './client';
import type { LoginResponse, User } from '../types';

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  
  const response = await api.post('/api/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export const getMyModules = async (): Promise<{ code: string; name: string; icon: string; route: string }[]> => {
  const response = await api.get('/api/auth/my-modules');
  return response.data;
};
