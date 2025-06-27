import axios from 'axios';
import API_BASE_URL from '@/config/api';

export const submitTypingBehavior = async (token: string, typingStats:any,deviceMetrics:any) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/behavior/typing`, {
    typingStats,
    deviceMetrics
  }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}