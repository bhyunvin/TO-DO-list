import apiClient from './apiClient';

const contactService = {
  // 문의 메일 발송
  sendContactEmail: async (formData) => {
    try {
      const response = await apiClient.post('/mail/contact', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Contact email send error:', error);
      throw error;
    }
  },
};

export default contactService;
