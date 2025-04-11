import api from './api';
import { adaptApiResponse } from './serviceAdapter';

// Create a new conversation
export const createConversation = async (title = 'Nova Conversa') => {
  try {
    const response = await api.post('/chat/conversations', { title });
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw error?.response?.data || { message: error?.message || 'Network error' };
  }
};

// Get all conversations
export const getConversations = async () => {
  try {
    const response = await api.get('/chat/conversations');
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw error?.response?.data || { message: error?.message || 'Network error' };
  }
};

// Get single conversation with messages
export const getConversation = async (conversationId) => {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  try {
    const response = await api.get(`/chat/conversations/${conversationId}`);
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw error?.response?.data || { message: error?.message || 'Network error' };
  }
};

// Get messages for a conversation - This actually gets the whole conversation with messages
export const getMessages = async (conversationId) => {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  try {
    // The backend doesn't have a separate endpoint for messages
    // It returns messages as part of the conversation data
    const response = await api.get(`/chat/conversations/${conversationId}`);
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw error?.response?.data || { message: error?.message || 'Network error' };
  }
};

// Send message to conversation
export const sendMessage = async (conversationId, message, includeDocuments = true) => {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Valid message content is required');
  }
  
  try {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
      message,
      includeDocuments
    });
    
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw error?.response?.data || { message: error?.message || 'Network error' };
  }
};

// Update conversation title
export const updateConversation = async (conversationId, title) => {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Valid title is required');
  }
  
  try {
    const response = await api.put(`/chat/conversations/${conversationId}`, { title });
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw error?.response?.data || { message: error?.message || 'Network error' };
  }
};

// Delete conversation
export const deleteConversation = async (conversationId) => {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  try {
    const response = await api.delete(`/chat/conversations/${conversationId}`);
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw error?.response?.data || { message: error?.message || 'Network error' };
  }
};

export default {
  createConversation,
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  updateConversation,
  deleteConversation
};