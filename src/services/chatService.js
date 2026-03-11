import axios from 'axios';

const API_BASE = '/api/chat';
const SERVER_URL = 'http://localhost:3003';

export const chatService = {
  async sendMessage(prompt, sessionId, files = []) {
    const formData = new FormData();
    formData.append('prompt', prompt);
    if (sessionId) formData.append('sessionId', sessionId);
    files.forEach(file => formData.append('files', file));

    const { data } = await axios.post(`${SERVER_URL}${API_BASE}/send`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  async getHistory(sessionId) {
    const { data } = await axios.get(`${SERVER_URL}${API_BASE}/history/${sessionId}`);
    return data;
  },

  async getConversations() {
    const { data } = await axios.get(`${SERVER_URL}${API_BASE}/conversations`);
    return data;
  },

  async deleteConversation(sessionId) {
    const { data } = await axios.delete(`${SERVER_URL}${API_BASE}/${sessionId}`);
    return data;
  }
};
