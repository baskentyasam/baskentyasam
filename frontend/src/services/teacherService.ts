import apiClient from '../api/axios';

export interface Teacher {
  id: number;
  name: string;
  role: string;
  studentNo?: string | null;
}

export interface ApiError {
  message: string;
  status?: number;
}

// Öğretmen listesini getir
export const getTeachers = async (): Promise<Teacher[]> => {
  try {
    const response = await apiClient.get<Teacher[]>('/Auth/teachers');
    return response.data;
  } catch (error: any) {
    throw {
      message: error.response?.data?.message || 'Öğretmenler yüklenirken bir hata oluştu',
      status: error.response?.status,
    } as ApiError;
  }
};

