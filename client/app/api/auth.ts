import axios from 'axios';
import API_BASE_URL from '@/config/api';

export const login = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const verifyMpin = async (token: string, mpin: string) => {
    try {
    const res = await axios.post(`${API_BASE_URL}/api/auth/mpin`, { mpin }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
    } catch (error) {
        throw error;    
    }
};