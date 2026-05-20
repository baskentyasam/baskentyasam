import apiClient from '../api/axios';

export interface Teacher {
  id: number;
  name: string;
  role: string;
  studentNo?: string | null;
  department?: string | null;
  roomNumber?: string | null;
  phoneNumber?: string | null;
  profileImage?: string | null;
  courses?: string | null;
}

export interface ApiError {
  message: string;
  status?: number;
}

/**
 * Öğretmen listesini getirir.
 * Opsiyonel olarak department (bölüm) ile filtreleme ve search (ad ön-eki) gönderebilirsin.
 */
export const getTeachers = async (params?: {
  department?: string;
  search?: string;
}): Promise<Teacher[]> => {
  try {
    const response = await apiClient.get<Teacher[]>('/Auth/teachers', {
      params: {
        department: params?.department || undefined,
        search: params?.search || undefined,
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message: error.response?.data?.message || 'Öğretmenler yüklenirken bir hata oluştu',
      status: error.response?.status,
    } as ApiError;
  }
};

/** Sistemde kayıtlı öğretim elemanı bölümlerinin listesi (distinct). */
export const getTeacherDepartments = async (): Promise<string[]> => {
  try {
    const response = await apiClient.get<string[]>('/Auth/departments');
    return response.data || [];
  } catch (error: any) {
    throw {
      message: error.response?.data?.message || 'Bölümler yüklenirken bir hata oluştu',
      status: error.response?.status,
    } as ApiError;
  }
};

/** Belirli bir öğretim elemanının verdiği ders listesini getirir. */
export const getTeacherCourses = async (teacherId: number): Promise<string[]> => {
  try {
    const response = await apiClient.get<string[]>(`/Auth/teachers/${teacherId}/courses`);
    return response.data || [];
  } catch (error: any) {
    throw {
      message: error.response?.data?.message || 'Dersler yüklenirken bir hata oluştu',
      status: error.response?.status,
    } as ApiError;
  }
};
