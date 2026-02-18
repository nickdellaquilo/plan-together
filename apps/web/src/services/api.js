import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Profile endpoints
export const profileAPI = {
  getMe: () => api.get('/profile/me'),
  updateMe: (data) => api.put('/profile/me', data),
  getUser: (userId) => api.get(`/profile/${userId}`),
};

// Friends endpoints
export const friendsAPI = {
  getFriends: () => api.get('/friends'),
  getRequests: () => api.get('/friends/requests'),
  sendRequest: (friendId) => api.post('/friends/request', { friendId }),
  acceptRequest: (friendshipId) => api.post(`/friends/accept/${friendshipId}`),
  rejectRequest: (friendshipId) => api.delete(`/friends/reject/${friendshipId}`),
  findByPhone: (phoneNumber) => api.post('/friends/find-by-phone', { phoneNumber }),
  searchUsers: (query) => api.get('/friends/search', { params: { query } }),
  removeFriend: (friendId) => api.delete(`/friends/${friendId}`),
};

export default api;