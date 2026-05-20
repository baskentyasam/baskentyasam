import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  createAppointment,
  getStudentAppointments,
  Appointment,
  ApiError,
} from "../services/appointmentService";
import {
  getTeachers,
  getTeacherDepartments,
  getTeacherCourses,
  Teacher,
} from "../services/teacherService";
import {
  getInstructorSchedule,
  ScheduleSlot,
} from "../services/scheduleService";

type Reason = "question" | "exam" | "other";
type TabType = "request" | "myAppointments";

const getInitials = (name?: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const TeacherAppointmentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("request");

  // Bölüm + arama + seçim
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherCourses, setTeacherCourses] = useState<string[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Form alanları
  const [course, setCourse] = useState("");
  const [reason, setReason] = useState<Reason>("question");
  const [otherReason, setOtherReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  // Diğer
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [error, setError] = useState("");

  const ALL_TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30",
  ];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const isWeekend = (() => {
    if (!date) return false;
    const d = new Date(date);
    const day = d.getDay();
    return day === 0 || day === 6;
  })();

  /* ============================
     BÖLÜMLERİ YÜKLE
  ============================ */
  useEffect(() => {
    const loadDeps = async () => {
      try {
        const data = await getTeacherDepartments();
        setDepartments(data);
      } catch (err) {
        console.error("Bölüm yükleme hatası:", err);
      }
    };
    loadDeps();
  }, []);

  /* ============================
     ÖĞRETMENLERİ YÜKLE (bölüm değişince)
  ============================ */
  useEffect(() => {
    const loadTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const data = await getTeachers({
          department: selectedDepartment || undefined,
        });
        setTeachers(data);
      } catch (err) {
        console.error("Öğretmen yükleme hatası:", err);
        setTeachers([]);
      } finally {
        setLoadingTeachers(false);
      }
    };
    loadTeachers();
    // Bölüm değişince seçili hoca da resetlensin
    setSelectedTeacher(null);
    setTeacherCourses([]);
    setCourse("");
    setSchedule([]);
  }, [selectedDepartment]);

  /* ============================
     ARAMA İLE FİLTRELEME (frontend tarafı)
  ============================ */
  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    // İsmin ilk harfleri ya da herhangi bir kelimesinin baş harfleri ile başlasın
    return teachers.filter((t) => {
      const lower = (t.name || "").toLowerCase();
      if (lower.startsWith(q)) return true;
      return lower.split(/\s+/).some((part) => part.startsWith(q));
    });
  }, [teachers, teacherSearch]);

  /* ============================
     ÖĞRETMEN SEÇİLDİĞİNDE: dersleri + schedule yükle
  ============================ */
  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedTeacher) {
        setSchedule([]);
        setTeacherCourses([]);
        return;
      }
      try {
        const [courses, scheduleData] = await Promise.all([
          getTeacherCourses(selectedTeacher.id),
          getInstructorSchedule(selectedTeacher.id),
        ]);
        setTeacherCourses(courses);
        setSchedule(scheduleData);
      } catch (err) {
        console.error("Hoca detayları yüklenemedi:", err);
      }
    };
    loadDetails();
    setCourse(""); // Hoca değişince ders sıfırlansın
  }, [selectedTeacher]);

  /* ============================
     RANDEVULAR
  ============================ */
  const loadAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const data = await getStudentAppointments();
      setAppointments(
        data.filter(
          (a) =>
            a.status?.toLowerCase() === "approved" ||
            a.status?.toLowerCase() === "rejected",
        ),
      );
    } catch (err) {
      console.error("Randevu yükleme hatası:", err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Tarih veya hoca değiştiğinde saati sıfırla
  useEffect(() => {
    setTime("");
  }, [date, selectedTeacher]);

  /* ============================
     UYGUN SAATLER
  ============================ */
  const getAvailableTimes = () => {
    if (!date) return [];
    const dateObj = new Date(date);
    const day = dateObj.getDay();
    if (day === 0 || day === 6) return [];

    const now = new Date();
    const isToday = date === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let candidateSlots = ALL_TIME_SLOTS;
    if (isToday) {
      candidateSlots = ALL_TIME_SLOTS.filter((slot) => {
        const [h, m] = slot.split(":").map(Number);
        return h * 60 + m > currentMinutes;
      });
    }

    if (!schedule || schedule.length === 0) return candidateSlots;

    const busyStarts = schedule
      .filter((s) => s.dayOfWeek === day)
      .map((s) => s.startTime);

    const allBusySlots: string[] = [];
    busyStarts.forEach((start) => {
      allBusySlots.push(start);
      const parts = start.split(":");
      if (parts.length === 2) {
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        m += 30;
        if (m >= 60) {
          m -= 60;
          h += 1;
        }
        const nextSlot = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        allBusySlots.push(nextSlot);
      }
    });

    return candidateSlots.filter((slot) => !allBusySlots.includes(slot));
  };

  const availableTimes = getAvailableTimes();

  /* ============================
     SUBMIT
  ============================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedTeacher) {
      setError("Lütfen bir öğretim elemanı seçiniz.");
      return;
    }
    if (!course) {
      setError("Lütfen bir ders seçiniz.");
      return;
    }
    if (date && date < todayStr) {
      setError("Geçmiş bir tarih seçilemez.");
      return;
    }
    if (isWeekend) {
      setError("Hafta sonu randevu alınamaz.");
      return;
    }

    setLoading(true);
    try {
      const finalReason =
        reason === "other"
          ? otherReason
          : reason === "question"
            ? "Soru sorma"
            : "Sınav kağıdına bakma";

      await createAppointment({
        lecturerName: selectedTeacher.name,
        course,
        reason: finalReason,
        date,
        time,
      });

      alert("Randevu talebiniz başarıyla oluşturuldu.");
      setSelectedTeacher(null);
      setTeacherSearch("");
      setCourse("");
      setReason("question");
      setOtherReason("");
      setDate("");
      setTime("");

      await loadAppointments();
      setActiveTab("myAppointments");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Randevu oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  /* ============================
     UI
  ============================ */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between">
          <h1 className="text-2xl font-semibold">Öğretim Elemanıyla Görüşme</h1>
          <Link to="/ogrenci" className="underline text-sm">
            Öğrenci anasayfasına dön
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          <section className="lg:col-span-3 bg-white rounded-xl border shadow">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("request")}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === "request"
                  ? "border-b-2 border-[#d71920] text-[#d71920]"
                  : "text-slate-500"
                  }`}
              >
                Randevu Talebi
              </button>
              <button
                onClick={() => setActiveTab("myAppointments")}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === "myAppointments"
                  ? "border-b-2 border-[#d71920] text-[#d71920]"
                  : "text-slate-500"
                  }`}
              >
                Randevularım
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-4">
                  {error}
                </div>
              )}

              {activeTab === "request" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* BÖLÜM SEÇİMİ */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Bölüm
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="">Tüm bölümler</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ÖĞRETMEN ARAMA + LİSTE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Öğretim Elemanı
                    </label>

                    {!selectedTeacher ? (
                      <>
                        <input
                          type="text"
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          placeholder="Hoca adıyla ara (örn: meh)"
                          className="w-full border rounded px-3 py-2 text-sm mb-2"
                        />

                        <div className="max-h-64 overflow-y-auto border rounded divide-y">
                          {loadingTeachers ? (
                            <div className="p-3 text-sm text-slate-500">
                              Yükleniyor...
                            </div>
                          ) : filteredTeachers.length === 0 ? (
                            <div className="p-3 text-sm text-slate-500">
                              {selectedDepartment
                                ? "Bu bölüme ait öğretim elemanı bulunamadı."
                                : "Öğretim elemanı bulunamadı."}
                            </div>
                          ) : (
                            filteredTeachers.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTeacher(t)}
                                className="w-full flex items-center gap-3 p-2 text-left hover:bg-slate-50"
                              >
                                <span className="flex-shrink-0 h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-[#d71920] to-[#8a1014] flex items-center justify-center text-white text-xs font-bold">
                                  {t.profileImage ? (
                                    <img
                                      src={t.profileImage}
                                      alt={t.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    getInitials(t.name)
                                  )}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-medium text-slate-900 truncate">
                                    {t.name}
                                  </span>
                                  {t.department && (
                                    <span className="block text-xs text-slate-500 truncate">
                                      {t.department}
                                    </span>
                                  )}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 border rounded p-3 bg-slate-50">
                        <span className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-[#d71920] to-[#8a1014] flex items-center justify-center text-white text-sm font-bold">
                          {selectedTeacher.profileImage ? (
                            <img
                              src={selectedTeacher.profileImage}
                              alt={selectedTeacher.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(selectedTeacher.name)
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {selectedTeacher.name}
                          </p>
                          {selectedTeacher.department && (
                            <p className="text-xs text-slate-500 truncate">
                              {selectedTeacher.department}
                            </p>
                          )}
                          {selectedTeacher.roomNumber && (
                            <p className="text-xs text-slate-500 truncate">
                              Oda: {selectedTeacher.roomNumber}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedTeacher(null)}
                          className="text-xs text-[#d71920] underline hover:opacity-80 shrink-0"
                        >
                          Değiştir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DERS */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ders
                    </label>
                    {selectedTeacher && teacherCourses.length > 0 ? (
                      <select
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        required
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        <option value="">Ders seçiniz</option>
                        {teacherCourses.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder={
                          selectedTeacher
                            ? "Bu hoca henüz ders eklememiş. Dersi yazabilirsiniz"
                            : "Önce bir öğretim elemanı seçiniz"
                        }
                        disabled={!selectedTeacher}
                        className="w-full border rounded px-3 py-2 text-sm disabled:bg-slate-100"
                      />
                    )}
                  </div>

                  {/* SEBEP */}
                  <div className="flex gap-4 text-sm">
                    <label>
                      <input
                        type="radio"
                        checked={reason === "question"}
                        onChange={() => setReason("question")}
                      />{" "}
                      Soru
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={reason === "exam"}
                        onChange={() => setReason("exam")}
                      />{" "}
                      Sınav
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={reason === "other"}
                        onChange={() => setReason("other")}
                      />{" "}
                      Diğer
                    </label>
                  </div>

                  {reason === "other" && (
                    <textarea
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      placeholder="Sebebinizi yazın"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  )}

                  {/* TARİH + SAAT */}
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={date}
                      min={todayStr}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="border rounded px-3 py-2 text-sm"
                    />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className="border rounded px-3 py-2 text-sm w-full"
                      disabled={!date || isWeekend || availableTimes.length === 0}
                    >
                      <option value="">
                        {!date
                          ? "Önce Tarih Seçiniz"
                          : isWeekend
                            ? "Hafta Sonu Seçilemez"
                            : availableTimes.length === 0
                              ? "Müsaitlik Yok"
                              : "Saat Seçiniz"}
                      </option>
                      {availableTimes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isWeekend && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm">
                      Hafta sonu randevu alınamaz. Lütfen Pazartesi - Cuma arası bir tarih seçin.
                    </div>
                  )}

                  {date && !isWeekend && availableTimes.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm">
                      Seçtiğiniz gün için uygun saat bulunmuyor. Lütfen başka bir gün seçin.
                    </div>
                  )}

                  <button
                    disabled={loading || isWeekend || !time || !selectedTeacher || !course}
                    className="w-full bg-[#d71920] text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Gönderiliyor..." : "Randevu Talep Et"}
                  </button>
                </form>
              )}

              {activeTab === "myAppointments" && (
                <div className="space-y-3">
                  {loadingAppointments ? (
                    <p className="text-sm text-slate-500">Yükleniyor...</p>
                  ) : appointments.length === 0 ? (
                    <p className="text-sm text-slate-500">Henüz randevu yok.</p>
                  ) : (
                    appointments.map((apt) => {
                      const isApproved = apt.status?.toLowerCase() === "approved";
                      return (
                        <div
                          key={apt.id}
                          className={`p-4 rounded border ${isApproved
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                            }`}
                        >
                          <p className="font-semibold text-sm text-slate-900">
                            {(apt as any).subject ||
                              apt.course ||
                              "Ders belirtilmemiş"}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Öğretim Elemanı:{" "}
                            {(apt as any).teacherName ||
                              (apt as any).lecturerName ||
                              "Bilinmiyor"}
                            {apt.teacherDepartment && (
                              <span className="text-slate-500">
                                {" "}· {apt.teacherDepartment}
                              </span>
                            )}
                          </p>
                          {isApproved && apt.teacherRoomNumber && (
                            <p className="text-xs text-slate-700 mt-0.5 font-medium">
                              📍 Oda: {apt.teacherRoomNumber}
                            </p>
                          )}
                          <p className="text-xs text-slate-600">
                            {apt.date
                              ? new Date(apt.date).toLocaleDateString("tr-TR")
                              : "Tarih yok"}{" "}
                            –{" "}
                            {apt.time
                              ? typeof apt.time === "string"
                                ? apt.time
                                : `${String(
                                  (apt.time as any).hours || 0,
                                ).padStart(2, "0")}:${String(
                                  (apt.time as any).minutes || 0,
                                ).padStart(2, "0")}`
                              : "Saat yok"}
                          </p>
                          <span
                            className={`inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-medium ${isApproved
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                              }`}
                          >
                            {isApproved ? "Onaylandı" : "Reddedildi"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-xl border p-5 shadow self-start h-auto">            <h2 className="text-sm font-semibold mb-3">Bilgilendirme</h2>
            <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
              <li>
                Önce bölüm seçip ardından hoca adıyla arama yapabilirsiniz.
              </li>
              <li>Seçilen hocanın verdiği dersler otomatik listelenir.</li>
              <li>Randevu saatleri <strong>09:00 – 16:30</strong> arasıdır.</li>
              <li>
                Randevu durumunu <strong>"Randevularım"</strong> sekmesinden takip edebilirsiniz.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TeacherAppointmentPage;
