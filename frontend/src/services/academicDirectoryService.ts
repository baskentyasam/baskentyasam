import apiClient from "../api/axios";
import { ApiError } from "./teacherService";

export interface FacultyOption {
  id: number;
  name: string;
}

export interface DepartmentOption {
  id: number;
  facultyId: number;
  name: string;
}

export const getActiveFaculties = async (): Promise<FacultyOption[]> => {
  try {
    const response = await apiClient.get<FacultyOption[]>("/faculties/active");
    return response.data;
  } catch (error: any) {
    throw {
      message: error.response?.data?.message || "Fakülteler yüklenirken bir hata oluştu",
      status: error.response?.status,
    } as ApiError;
  }
};

export const getDepartmentsByFaculty = async (facultyId: number): Promise<DepartmentOption[]> => {
  try {
    const response = await apiClient.get<DepartmentOption[]>("/departments", {
      params: { facultyId },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message: error.response?.data?.message || "Bölümler yüklenirken bir hata oluştu",
      status: error.response?.status,
    } as ApiError;
  }
};
