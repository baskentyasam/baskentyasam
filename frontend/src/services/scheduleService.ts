import apiClient from '../api/axios';

/** Öğretim elemanı program hücresi (slot anahtarı + opsiyonel ders kodu) */
export type ScheduleCell = {
  slot: string;
  courseCode?: string;
};

/** Öğrenci tarafı: müsaitlik (dayOfWeek + startTime); courseName isteğe bağlı. */
export interface ScheduleSlot {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  courseName?: string;
  slot: string;
}

const mapScheduleCell = (item: Record<string, unknown>): ScheduleCell => ({
  slot: String(item.slot ?? item.Slot ?? ""),
  courseCode: String(
    item.courseName ?? item.CourseName ?? item.courseCode ?? item.CourseCode ?? ""
  ),
});

export const getMySchedule = async (): Promise<ScheduleCell[]> => {
  try {
    const response = await apiClient.get<Record<string, unknown>[]>("/Schedule/my-schedule");
    return response.data.map(mapScheduleCell);
  } catch (error: any) {
    console.error("Ders programı yükleme hatası:", error);
    throw {
      message: error.response?.data?.message || "Ders programı yüklenirken bir hata oluştu",
      status: error.response?.status,
    };
  }
};

export const saveSchedule = async (slots: ScheduleCell[]): Promise<void> => {
  try {
    await apiClient.post("/Schedule/save", {
      slots: slots.map((cell) => ({
        slot: cell.slot,
        courseName: cell.courseCode?.trim() ? cell.courseCode.trim() : null,
      })),
    });
  } catch (error: any) {
    console.error("Ders programı kaydetme hatası:", error);
    throw {
      message: error.response?.data?.message || "Ders programı kaydedilirken bir hata oluştu",
      status: error.response?.status,
    };
  }
};

export const getInstructorSchedule = async (instructorId: number): Promise<ScheduleSlot[]> => {
  try {
    const response = await apiClient.get<ScheduleSlot[]>(`/Schedule/instructor/${instructorId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching instructor schedule:', error);
    return [];
  }
};
