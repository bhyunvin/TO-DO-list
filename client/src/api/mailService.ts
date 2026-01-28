import { api, ApiError } from './client';

const mailApi = api.mail;

const contactService = {
  // 문의 메일 발송
  sendContactEmail: async (formData: FormData) => {
    try {
      const payload: Record<string, any> = {};
      formData.forEach((value, key) => {
        payload[key] = value;
      });

      const { data, error } = await mailApi.contact.post(payload);

      if (error) {
        throw new ApiError(
          typeof error.value === 'string' ? error.value : '메일 전송 실패',
          Number(error.status),
          error.value,
        );
      }
      return data;
    } catch (error) {
      console.error('Contact email send error:', error);
      throw error;
    }
  },
};

export default contactService;
