import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  getInstructorAppointments,
  getPendingRequests,
  updateAppointmentStatus,
  Appointment,
  ApiError,
} from "../services/appointmentService";
import {
  getMySchedule,
  saveSchedule,
  type ScheduleCell,
} from "../services/scheduleService";

const days = ["Pzt", "Sal", "Çar", "Per", "Cum"];
const times = [
  "09.00-09.50",
  "10.00-10.50",
  "11.00-11.50",
  "12.00-12.50",
  "13.00-13.50",
  "14.00-14.50",
  "15.00-15.50",
  "16.00-16.50",
];

const getInitials = (name?: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

interface StudentInfoProps {
  apt: Appointment;
}

const StudentInfo: React.FC<StudentInfoProps> = ({ apt }) => (
  <div className="flex items-start gap-3">
    <span className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-[#d71920] to-[#8a1014] flex items-center justify-center text-white text-sm font-bold">
      {apt.studentProfileImage ? (
        <img
          src={apt.studentProfileImage}
          alt={apt.studentName || "Öğrenci"}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(apt.studentName)
      )}
    </span>

    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-900 truncate">
        {apt.studentName || "Bilinmiyor"}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 mt-0.5">
        {apt.studentNo && <span>No: {apt.studentNo}</span>}
        {apt.studentFaculty && <span>· {apt.studentFaculty}</span>}
        {apt.studentDepartment && <span>· {apt.studentDepartment}</span>}
        {apt.studentClassLevel && <span>· {apt.studentClassLevel}. sınıf</span>}
      </div>
    </div>
  </div>
);

type TabType = "requests" | "myAppointments";
type DragMode = "add" | "remove";

const InstructorAppointmentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleCell[]>([]);

  const dragState = useRef<{ active: boolean; mode: DragMode }>({
    active: false,
    mode: "add",
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [activeTab]);

  useEffect(() => {
    loadSchedule();
  }, []);

  useEffect(() => {
    const endDrag = () => {
      dragState.current.active = false;
    };

    window.addEventListener("mouseup", endDrag);
    window.addEventListener("blur", endDrag);

    return () => {
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("blur", endDrag);
    };
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    setError("");

    try {
      let data: Appointment[];

      if (activeTab === "requests") {
        data = await getPendingRequests();
      } else {
        data = await getInstructorAppointments();
      }

      setAppointments(data);
    } catch (err) {
      const apiError = err as ApiError;
      console.error("Randevu yükleme hatası:", err);
      setError(apiError.message || "Randevular yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    appointmentId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);

      if (!appointment) {
        alert("Randevu bulunamadı");
        return;
      }

      await updateAppointmentStatus(appointmentId, status, appointment);
      await loadAppointments();
    } catch (err) {
      const apiError = err as ApiError;
      alert(
        apiError.message || "Randevu durumu güncellenirken bir hata oluştu"
      );
    }
  };

  const toggleSlotSimple = (key: string) => {
    setScheduleSlots((prev) => {
      const idx = prev.findIndex((s) => s.slot === key);

      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }

      return [...prev, { slot: key, courseCode: "" }];
    });
  };

  const applyDragToSlot = (key: string, mode: DragMode) => {
    setScheduleSlots((prev) => {
      const idx = prev.findIndex((s) => s.slot === key);

      if (mode === "add" && idx < 0) {
        return [...prev, { slot: key, courseCode: "" }];
      }

      if (mode === "remove" && idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }

      return prev;
    });
  };

  const onSlotPointerDown = (e: React.MouseEvent, key: string) => {
    if ((e.target as HTMLElement).closest("input")) return;

    e.preventDefault();

    const already = scheduleSlots.some((s) => s.slot === key);
    const mode: DragMode = already ? "remove" : "add";

    dragState.current = { active: true, mode };
    applyDragToSlot(key, mode);
  };

  const onSlotMouseEnter = (key: string) => {
    if (!dragState.current.active) return;

    applyDragToSlot(key, dragState.current.mode);
  };

  const updateSlotCourseCode = (slotKey: string, courseCode: string) => {
    setScheduleSlots((prev) =>
      prev.map((c) =>
        c.slot === slotKey ? { ...c, courseCode } : c
      )
    );
  };

  const loadSchedule = async () => {
    try {
      const schedule = await getMySchedule();

      setScheduleSlots(
        schedule.map((s) => ({
          slot: s.slot,
          courseCode: s.courseCode ?? "",
        }))
      );
    } catch (err) {
      console.error("Ders programı yükleme hatası:", err);
    }
  };

  const handleSaveSchedule = async () => {
    if (scheduleSlots.length === 0) {
      alert("Lütfen en az bir saat seçin.");
      return;
    }

    setSavingSchedule(true);

    try {
      await saveSchedule(scheduleSlots);
      alert("Ders programı başarıyla kaydedildi!");
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || "Ders programı kaydedilirken bir hata oluştu");
    } finally {
      setSavingSchedule(false);
    }
  };

  const pendingAppointments =
    activeTab === "requests"
      ? appointments
      : appointments.filter((apt) => apt.status?.toLowerCase() === "pending");

  const approvedAppointments = appointments.filter(
    (apt) => apt.status?.toLowerCase() === "approved"
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
          <h1 className="text-2xl font-semibold">Randevu Yönetimi</h1>

          <Link
            to="/ogretim-elemani"
            className="text-sm underline hover:opacity-90"
          >
            Öğretim elemanı anasayfasına dön
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <section className="lg:col-span-3 bg-white rounded-xl border shadow">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === "requests"
                    ? "border-b-2 border-[#d71920] text-[#d71920]"
                    : "text-slate-500"
                }`}
              >
                Gelen Talepler
              </button>

              <button
                onClick={() => setActiveTab("myAppointments")}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === "myAppointments"
                    ? "border-b-2 border-[#d71920] text-[#d71920]"
                    : "text-slate-500"
                }`}
              >
                Randevularım
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <p className="text-slate-500">Yükleniyor...</p>
                </div>
              )}

              {!loading && activeTab === "requests" && (
                <div className="space-y-4">
                  {pendingAppointments.length === 0 ? (
                    <p className="text-slate-500 text-sm">
                      Henüz gelen randevu talebi yok.
                    </p>
                  ) : (
                    pendingAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <StudentInfo apt={apt} />

                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() =>
                                handleStatusUpdate(apt.id, "approved")
                              }
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              Onayla
                            </button>

                            <button
                              onClick={() =>
                                handleStatusUpdate(apt.id, "rejected")
                              }
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                            >
                              Reddet
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {(apt as any).subject ||
                              apt.course ||
                              "Ders belirtilmemiş"}
                          </p>

                          <p className="text-sm text-slate-600">
                            Sebep:{" "}
                            {(() => {
                              const reason =
                                (apt as any).requestReason || apt.reason || "";
                              const reasonLower = reason.toLowerCase().trim();

                              if (reasonLower === "question") return "Soru sorma";
                              if (reasonLower === "exam")
                                return "Sınav kağıdına bakma";
                              if (reasonLower === "other") return "Diğer";
                              if (reason.trim()) return reason;

                              return "Sebep belirtilmemiş";
                            })()}
                          </p>

                          <p className="text-sm text-slate-600">
                            {apt.date
                              ? new Date(apt.date).toLocaleDateString("tr-TR")
                              : "Tarih belirtilmemiş"}{" "}
                            -{" "}
                            {apt.time
                              ? typeof apt.time === "string"
                                ? apt.time
                                : typeof apt.time === "object" && apt.time !== null
                                  ? `${String((apt.time as any).hours || 0).padStart(
                                      2,
                                      "0"
                                    )}:${String(
                                      (apt.time as any).minutes || 0
                                    ).padStart(2, "0")}`
                                  : "Saat belirtilmemiş"
                              : "Saat belirtilmemiş"}
                          </p>

                          {(apt as any).rejectionReason && (
                            <p className="text-sm text-red-500 italic">
                              Red Nedeni: {(apt as any).rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!loading && activeTab === "myAppointments" && (
                <div className="space-y-4">
                  {approvedAppointments.length === 0 ? (
                    <p className="text-slate-500 text-sm">
                      Onayladığınız randevular burada listelenecek.
                    </p>
                  ) : (
                    approvedAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="border border-slate-200 rounded-lg p-4 bg-white"
                      >
                        <StudentInfo apt={apt} />

                        <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {apt.course || "Ders belirtilmemiş"}
                          </p>

                          <p className="text-sm text-slate-600">
                            Sebep:{" "}
                            {(() => {
                              const r = apt.reason || "";
                              const lower = r.toLowerCase().trim();

                              if (lower === "question") return "Soru sorma";
                              if (lower === "exam")
                                return "Sınav kağıdına bakma";
                              if (lower === "other") return apt.note || "Diğer";

                              return r || "Sebep belirtilmemiş";
                            })()}
                          </p>

                          <p className="text-sm text-slate-600">
                            {apt.date
                              ? new Date(apt.date).toLocaleDateString("tr-TR")
                              : "Tarih belirtilmemiş"}{" "}
                            -{" "}
                            {apt.time
                              ? typeof apt.time === "string"
                                ? apt.time
                                : typeof apt.time === "object" && apt.time !== null
                                  ? `${String((apt.time as any).hours || 0).padStart(
                                      2,
                                      "0"
                                    )}:${String(
                                      (apt.time as any).minutes || 0
                                    ).padStart(2, "0")}`
                                  : "Saat belirtilmemiş"
                              : "Saat belirtilmemiş"}
                          </p>

                          {apt.note && (
                            <p className="text-sm text-slate-500 italic">
                              Not: {apt.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-xl border p-4 shadow">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold">
                Haftalık Ders Programı
              </h2>

              <button
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#d71920] rounded hover:bg-[#b8151a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSchedule ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-600 leading-snug">
              Boş kutucuklarda basılı tutup sürükleyerek seçim yapın veya
              seçimi kaldırın. Ders kodunu ilgili alana yazın.
            </p>

            <div className="grid grid-cols-6 text-xs gap-1 select-none">
              <div />

              {days.map((d) => (
                <div key={d} className="text-center font-medium">
                  {d}
                </div>
              ))}

              {times.map((t) => (
                <React.Fragment key={t}>
                  <div className="text-right pr-2 text-[11px] whitespace-nowrap min-w-[88px] flex items-center justify-end">
                    {t}
                  </div>

                  {days.map((d) => {
                    const key = `${d}-${t}`;
                    const cell = scheduleSlots.find((s) => s.slot === key);
                    const active = !!cell;

                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => onSlotPointerDown(e, key)}
                        onMouseEnter={() => onSlotMouseEnter(key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSlotSimple(key);
                          }
                        }}
                        className={`rounded border transition px-0.5 py-0.5 flex flex-col justify-center overflow-hidden cursor-pointer ${
                          active
                            ? "min-h-[2.75rem] bg-red-600 border-red-700 shadow-inner"
                            : "min-h-[2.125rem] bg-slate-100 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        {active ? (
                          <input
                            type="text"
                            inputMode="text"
                            autoComplete="off"
                            placeholder="Kod"
                            title={cell?.courseCode || undefined}
                            value={cell?.courseCode ?? ""}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateSlotCourseCode(key, e.target.value)
                            }
                            className="w-full min-w-0 max-w-full box-border text-[13px] font-semibold leading-none text-center px-1 py-0.5 rounded border border-red-900/35 bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-1 focus:ring-white overflow-hidden text-ellipsis"
                          />
                        ) : (
                          <span className="text-[transparent] select-none pointer-events-none text-xs">
                            –
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default InstructorAppointmentManagement;