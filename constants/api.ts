const DEFAULT_NETWORK_API_BASE_URL = 'http://146.190.138.248:2000';

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL =
  (envApiBaseUrl || DEFAULT_NETWORK_API_BASE_URL).replace(/\/+$/, '');
