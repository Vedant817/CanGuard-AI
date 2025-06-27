import axios from 'axios';
import API_BASE_URL from '@/config/api';

export const getSessionStatus = async (token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/user/session-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.session;
  } catch (error) {
    throw error;
  }
}


export const getUserProfile = async (token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    throw error;
  }
};