import apiClient from './api';
import axios from 'axios';
import { useAuthStore } from '@/store/use-auth-store';

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  const mockAxiosInstance = {
    defaults: {
      baseURL: 'http://localhost:3000/api/v1',
      headers: { common: {} },
    },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  return {
    ...actualAxios,
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  };
});

describe('Web API Client & Auth Interceptors', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'priya-1', fullName: 'Priya Sharma', email: 'priya@example.com' } as any,
      token: 'valid-access-token',
      refreshToken: 'valid-refresh-token',
      selectedProfileId: null,
      isAuthenticated: true,
    });
  });

  it('should attach Bearer token to request headers', () => {
    // Get the request interceptor handler
    const requestHandler = (apiClient.interceptors.request.use as jest.Mock).mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };

    const modifiedConfig = requestHandler(config);

    expect(modifiedConfig.headers['Authorization']).toBe('Bearer valid-access-token');
    expect(modifiedConfig.headers['x-patient-id']).toBeUndefined();
  });

  it('should attach x-patient-id header when proxying as caregiver for family member', () => {
    useAuthStore.setState({
      user: { id: 'rajesh-1', fullName: 'Rajesh Sharma' } as any,
      token: 'rajesh-token',
      selectedProfileId: 'kamla-shadow-id',
      isAuthenticated: true,
    });

    const requestHandler = (apiClient.interceptors.request.use as jest.Mock).mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };

    const modifiedConfig = requestHandler(config);

    expect(modifiedConfig.headers['Authorization']).toBe('Bearer rajesh-token');
    expect(modifiedConfig.headers['x-patient-id']).toBe('kamla-shadow-id');
  });

  it('should omit x-patient-id header when selectedProfileId equals primary user id', () => {
    useAuthStore.setState({
      user: { id: 'priya-1', fullName: 'Priya Sharma' } as any,
      token: 'priya-token',
      selectedProfileId: 'priya-1',
      isAuthenticated: true,
    });

    const requestHandler = (apiClient.interceptors.request.use as jest.Mock).mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };

    const modifiedConfig = requestHandler(config);

    expect(modifiedConfig.headers['Authorization']).toBe('Bearer priya-token');
    expect(modifiedConfig.headers['x-patient-id']).toBeUndefined();
  });
});
