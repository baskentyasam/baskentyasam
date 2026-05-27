import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  AdminAppointment,
  AdminAppointmentTeacher,
  AdminDepartment,
  AdminFaculty,
  AdminFacultyHierarchy,
  AdminScheduleSlot,
  AppointmentStatusFilter,
  STATUS_FILTER_OPTIONS,
  assignTeacherDepartment,
  cancelAdminAppointment,
  formatAppointmentDateTime,
  getAdminAppointmentTeachers,
  getAdminAppointments,
  getAdminDepartments,
  getAdminFaculties,
  getAdminFacultyHierarchy,
  getAdminTeacherSchedule,
  setTeacherAppointmentVisibility,
} from "../services/adminAppointmentService";

type TabId = "appointments" | "teachers" | "schedule" | "faculty";

const DAY_NAMES: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
};

const AdminAppointmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("appointments");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [faculties, setFaculties] = useState<AdminFaculty[]>([]);
  const [allDepartments, setAllDepartments] = useState<AdminDepartment[]>([]);
  const [facultyHierarchy, setFacultyHierarchy] = useState<AdminFacultyHierarchy[]>([]);

  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [teachers, setTeachers] = useState<AdminAppointmentTeacher[]>([]);
  const [schedule, setSchedule] = useState<AdminScheduleSlot[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | "">("");

  const [facultyFilter, setFacultyFilter] = useState<number | "">("");
  const [departmentFilter, setDepartmentFilter] = useState<number | "">("");
  const [teacherFilter, setTeacherFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherActiveFilter, setTeacherActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const [deptModalTeacher, setDeptModalTeacher] = useState<AdminAppointmentTeacher | null>(null);
  const [modalFacultyId, setModalFacultyId] = useState<number | "">("");
  const [modalDepartmentId, setModalDepartmentId] = useState<number | "">("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchDraft.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const filterDepartments = useMemo(() => {
    if (facultyFilter === "") return allDepartments;
    return allDepartments.filter((d) => d.facultyId === facultyFilter);
  }, [allDepartments, facultyFilter]);

  const modalDepartments = useMemo(() => {
    if (modalFacultyId === "") return [];
    return allDepartments.filter((d) => d.facultyId === modalFacultyId);
  }, [allDepartments, modalFacultyId]);

  const filteredTeachersForDropdown = useMemo(() => {
    let list = teachers;
    if (departmentFilter !== "") {
      list = list.filter((t) => t.departmentId === departmentFilter);
    } else if (facultyFilter !== "") {
      list = list.filter((t) => t.facultyId === facultyFilter);
    }
    return list;
  }, [teachers, facultyFilter, departmentFilter]);

  const loadCatalog = useCallback(async () => {
    const [facultyData, departmentData] = await Promise.all([
      getAdminFaculties(),
      getAdminDepartments(),
    ]);
    setFaculties(facultyData);
    setAllDepartments(departmentData);
  }, []);

  const loadTeachers = useCallback(async () => {
    const params: {
      search?: string;
      isActive?: boolean;
      facultyId?: number;
      departmentId?: number;
    } = {};
    if (teacherSearch.trim()) params.search = teacherSearch.trim();
    if (teacherActiveFilter === "active") params.isActive = true;
    if (teacherActiveFilter === "inactive") params.isActive = false;
    const data = await getAdminAppointmentTeachers(params);
    setTeachers(data);
    return data;
  }, [teacherSearch, teacherActiveFilter]);

  const loadAppointments = useCallback(async () => {
    const params: {
      teacherId?: number;
      facultyId?: number;
      departmentId?: number;
      status?: string;
      from?: string;
      to?: string;
      search?: string;
    } = {};
    if (teacherFilter !== "") params.teacherId = teacherFilter;
    if (departmentFilter !== "") params.departmentId = departmentFilter;
    else if (facultyFilter !== "") params.facultyId = facultyFilter;
    if (statusFilter) params.status = statusFilter;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    if (debouncedSearch) params.search = debouncedSearch;
    const data = await getAdminAppointments(params);
    setAppointments(data);
  }, [
    teacherFilter,
    facultyFilter,
    departmentFilter,
    statusFilter,
    fromDate,
    toDate,
    debouncedSearch,
  ]);

  const loadSchedule = useCallback(async (teacherId: number) => {
    const data = await getAdminTeacherSchedule(teacherId);
    setSchedule(data);
  }, []);

  const loadHierarchy = useCallback(async () => {
    const data = await getAdminFacultyHierarchy();
    setFacultyHierarchy(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        await loadCatalog();
        await loadTeachers();
      } catch (err: any) {
        setError(err?.response?.data?.message || "Veriler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [loadCatalog, loadTeachers]);

  useEffect(() => {
    if (activeTab !== "appointments") return;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        await loadAppointments();
      } catch (err: any) {
        setError(err?.response?.data?.message || "Randevular yüklenemedi.");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [activeTab, loadAppointments]);

  useEffect(() => {
    if (activeTab !== "teachers") return;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        await loadTeachers();
      } catch (err: any) {
        setError(err?.response?.data?.message || "Öğretim elemanları yüklenemedi.");
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [activeTab, loadTeachers]);

  useEffect(() => {
    if (activeTab !== "faculty") return;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        await loadHierarchy();
      } catch (err: any) {
        setError(err?.response?.data?.message || "Fakülte/bölüm listesi yüklenemedi.");
        setFacultyHierarchy([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [activeTab, loadHierarchy]);

  useEffect(() => {
    if (activeTab !== "schedule" || selectedTeacherId === "") {
      setSchedule([]);
      return;
    }
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        await loadSchedule(selectedTeacherId);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Uygunluk bilgisi yüklenemedi.");
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [activeTab, selectedTeacherId, loadSchedule]);

  useEffect(() => {
    if (facultyFilter === "") return;
    if (departmentFilter !== "" && !filterDepartments.some((d) => d.id === departmentFilter)) {
      setDepartmentFilter("");
    }
  }, [facultyFilter, departmentFilter, filterDepartments]);

  useEffect(() => {
    if (teacherFilter === "") return;
    if (!filteredTeachersForDropdown.some((t) => t.id === teacherFilter)) {
      setTeacherFilter("");
    }
  }, [teacherFilter, filteredTeachersForDropdown]);

  const handleFacultyFilterChange = (value: string) => {
    const id = value === "" ? "" : Number(value);
    setFacultyFilter(id);
    setDepartmentFilter("");
    setTeacherFilter("");
  };

  const handleDepartmentFilterChange = (value: string) => {
    setDepartmentFilter(value === "" ? "" : Number(value));
    setTeacherFilter("");
  };

  const handleCancel = async (appointment: AdminAppointment) => {
    if (appointment.status !== "Pending") return;
    const reason = window.prompt(
      "İptal sebebi (boş bırakılırsa varsayılan metin kullanılır):",
      "Sistem yöneticisi tarafından iptal edildi.",
    );
    if (reason === null) return;

    setActionLoading(true);
    setError("");
    try {
      await cancelAdminAppointment(appointment.id, reason || undefined);
      await loadAppointments();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Randevu iptal edilemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const openDeptModal = (teacher: AdminAppointmentTeacher) => {
    setDeptModalTeacher(teacher);
    setModalFacultyId(teacher.facultyId ?? "");
    setModalDepartmentId(teacher.departmentId ?? "");
  };

  const closeDeptModal = () => {
    setDeptModalTeacher(null);
    setModalFacultyId("");
    setModalDepartmentId("");
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptModalTeacher) return;

    setActionLoading(true);
    setError("");
    try {
      await assignTeacherDepartment(
        deptModalTeacher.id,
        modalDepartmentId === "" ? null : modalDepartmentId,
      );
      await loadTeachers();
      if (activeTab === "appointments") await loadAppointments();
      closeDeptModal();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Bölüm ataması kaydedilemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleVisibility = async (teacher: AdminAppointmentTeacher) => {
    setActionLoading(true);
    setError("");
    try {
      await setTeacherAppointmentVisibility(teacher.id, !teacher.isVisibleForAppointment);
      await loadTeachers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Görünürlük güncellenemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadgeClass = (status: string) => {
    if (status === "Pending") return "admin-badge-inactive";
    if (status === "Approved") return "admin-badge-active";
    return "admin-btn-outline-red px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-100 bg-red-50 text-red-700";
  };

  const scheduleTeacherOptions =
    teachers.length > 0 ? teachers : filteredTeachersForDropdown;

  return (
    <AdminLayout
      title="Randevu Yönetimi"
      subtitle="Öğretim elemanı uygunluklarını ve randevu kayıtlarını buradan takip edebilirsiniz."
    >
      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {(
          [
            { id: "appointments" as TabId, label: "Randevular" },
            { id: "teachers" as TabId, label: "Öğretim Elemanları" },
            { id: "schedule" as TabId, label: "Uygunluklar" },
            { id: "faculty" as TabId, label: "Fakülte / Bölüm" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab ${activeTab === tab.id ? "admin-tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="admin-card admin-card-body mb-6 text-sm text-red-600">{error}</div>
      )}

      {activeTab === "appointments" && (
        <>
          <section className="admin-card admin-card-body mb-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="admin-label">Fakülte</label>
                <select
                  className="admin-input"
                  value={facultyFilter === "" ? "" : String(facultyFilter)}
                  onChange={(e) => handleFacultyFilterChange(e.target.value)}
                >
                  <option value="">Tüm fakülteler</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Bölüm</label>
                <select
                  className="admin-input"
                  value={departmentFilter === "" ? "" : String(departmentFilter)}
                  onChange={(e) => handleDepartmentFilterChange(e.target.value)}
                  disabled={facultyFilter === "" && filterDepartments.length === allDepartments.length}
                >
                  <option value="">Tüm bölümler</option>
                  {(facultyFilter === "" ? allDepartments : filterDepartments).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Öğretim elemanı</label>
                <select
                  className="admin-input"
                  value={teacherFilter === "" ? "" : String(teacherFilter)}
                  onChange={(e) =>
                    setTeacherFilter(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  <option value="">Tümü</option>
                  {filteredTeachersForDropdown.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Durum</label>
                <select
                  className="admin-input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AppointmentStatusFilter)}
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Başlangıç tarihi</label>
                <input
                  type="date"
                  className="admin-input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="admin-label">Bitiş tarihi</label>
                <input
                  type="date"
                  className="admin-input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="admin-label">Öğrenci ara (ad / e-posta / no)</label>
                <input
                  className="admin-input"
                  placeholder="Öğrenci adı veya e-posta..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="admin-card overflow-hidden">
            {loading ? (
              <div className="admin-card-body admin-empty">Randevular yükleniyor...</div>
            ) : appointments.length === 0 ? (
              <div className="admin-card-body admin-empty">Randevu bulunamadı.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 font-medium text-slate-700">Öğrenci</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Öğretim elemanı</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Fakülte / Bölüm</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Tarih / Saat</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Konu</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Durum</th>
                      <th className="px-6 py-4 font-medium text-slate-700">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{a.studentName}</div>
                          <div className="text-xs text-slate-500">{a.studentEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{a.teacherName}</div>
                          <div className="text-xs text-slate-500">{a.teacherEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div>{a.teacherFacultyName}</div>
                          <div className="text-xs text-slate-500">{a.teacherDepartmentName}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {formatAppointmentDateTime(a.date, a.time)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900">{a.subject}</div>
                          <div className="text-xs text-slate-500">{a.requestReason}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={statusBadgeClass(a.status)}>{a.statusDisplayName}</span>
                          {a.rejectionReason && (
                            <div className="mt-1 text-xs text-slate-500">{a.rejectionReason}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {a.status === "Pending" ? (
                            <button
                              type="button"
                              className="admin-btn-outline-red"
                              disabled={actionLoading}
                              onClick={() => void handleCancel(a)}
                            >
                              İptal Et
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "teachers" && (
        <>
          <section className="admin-card admin-card-body mb-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="admin-label">Ara</label>
                <input
                  className="admin-input"
                  placeholder="Ad veya e-posta..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="admin-label">Hesap durumu</label>
                <select
                  className="admin-input"
                  value={teacherActiveFilter}
                  onChange={(e) =>
                    setTeacherActiveFilter(e.target.value as "all" | "active" | "inactive")
                  }
                >
                  <option value="all">Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>
          </section>

          <section className="admin-card overflow-hidden">
            {loading ? (
              <div className="admin-card-body admin-empty">Öğretim elemanları yükleniyor...</div>
            ) : teachers.length === 0 ? (
              <div className="admin-card-body admin-empty">Öğretim elemanı bulunamadı.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 font-medium text-slate-700">Ad Soyad</th>
                      <th className="px-6 py-4 font-medium text-slate-700">E-posta</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Fakülte</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Bölüm</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Hesap</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Randevuda</th>
                      <th className="px-6 py-4 font-medium text-slate-700">Randevu özeti</th>
                      <th className="px-6 py-4 font-medium text-slate-700">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-medium text-slate-900">{t.name}</td>
                        <td className="px-6 py-4 text-slate-600">{t.email}</td>
                        <td className="px-6 py-4 text-slate-600">{t.facultyName}</td>
                        <td className="px-6 py-4 text-slate-600">{t.departmentName}</td>
                        <td className="px-6 py-4">
                          <span className={t.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                            {t.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            className={
                              t.isVisibleForAppointment
                                ? "admin-badge-active cursor-pointer"
                                : "admin-badge-inactive cursor-pointer"
                            }
                            disabled={actionLoading}
                            title="Randevu listesinde görünürlük (hesap pasifleştirme değildir)"
                            onClick={() => void handleToggleVisibility(t)}
                          >
                            {t.isVisibleForAppointment ? "Görünür" : "Gizli"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          Toplam: {t.totalAppointments} · Bekleyen: {t.pendingAppointments} · Onay:{" "}
                          {t.approvedAppointments} · Red: {t.rejectedAppointments}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="admin-btn-outline-gray"
                              disabled={actionLoading}
                              onClick={() => openDeptModal(t)}
                            >
                              Bölüm Ata / Düzenle
                            </button>
                            <button
                              type="button"
                              className="admin-btn-outline-blue"
                              onClick={() => {
                                setSelectedTeacherId(t.id);
                                setActiveTab("schedule");
                              }}
                            >
                              Uygunlukları Gör
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "schedule" && (
        <>
          <section className="admin-card admin-card-body mb-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="admin-label">Öğretim elemanı</label>
                <select
                  className="admin-input"
                  value={selectedTeacherId === "" ? "" : String(selectedTeacherId)}
                  onChange={(e) =>
                    setSelectedTeacherId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  <option value="">Seçin</option>
                  {scheduleTeacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-sm text-slate-500">
                  Bu görünüm salt okunurdur. Düzenleme Faz 3&apos;te eklenecektir.
                </p>
              </div>
            </div>
          </section>

          <section className="admin-card admin-card-body">
            {selectedTeacherId === "" ? (
              <div className="admin-empty">Uygunlukları görmek için öğretim elemanı seçin.</div>
            ) : loading ? (
              <div className="admin-empty">Uygunluklar yükleniyor...</div>
            ) : schedule.length === 0 ? (
              <div className="admin-empty">Bu öğretim elemanı için kayıtlı ders programı yok.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {schedule.map((slot) => (
                  <div
                    key={slot.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="font-medium text-slate-900">
                      {DAY_NAMES[slot.dayOfWeek] || `Gün ${slot.dayOfWeek}`}
                    </div>
                    <div className="text-sm text-slate-600">{slot.startTime}</div>
                    <div className="mt-1 text-xs text-slate-500">{slot.courseName || slot.slot}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "faculty" && (
        <section className="admin-card admin-card-body">
          <h3 className="mb-2 text-base font-semibold text-slate-900">Fakülte / Bölüm Yapısı</h3>
          <p className="mb-6 text-sm text-slate-500">
            Bu sekme salt okunurdur. Yeni fakülte/bölüm ekleme ve düzenleme sonraki aşamada eklenecektir.
          </p>
          {loading ? (
            <div className="admin-empty">Yükleniyor...</div>
          ) : facultyHierarchy.length === 0 ? (
            <div className="admin-empty">Kayıtlı fakülte bulunamadı.</div>
          ) : (
            <div className="space-y-6">
              {facultyHierarchy.map((faculty) => (
                <div key={faculty.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-slate-900">{faculty.name}</h4>
                    <span
                      className={
                        faculty.isActive ? "admin-badge-active" : "admin-badge-inactive"
                      }
                    >
                      {faculty.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  {faculty.departments.length === 0 ? (
                    <p className="text-sm text-slate-500">Bölüm tanımlı değil.</p>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {faculty.departments.map((dept) => (
                        <li
                          key={dept.id}
                          className="rounded-lg border border-white bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          {dept.name}
                          {!dept.isActive && (
                            <span className="ml-2 text-xs text-slate-400">(pasif)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {deptModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-card w-full max-w-lg">
            <div className="admin-card-body">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Bölüm Ata / Düzenle</h3>
                  <p className="mt-1 text-sm text-slate-500">{deptModalTeacher.name}</p>
                </div>
                <button type="button" className="text-slate-400 hover:text-slate-600" onClick={closeDeptModal}>
                  ✕
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => void handleSaveDepartment(e)}>
                <div>
                  <label className="admin-label">Fakülte</label>
                  <select
                    className="admin-input"
                    value={modalFacultyId === "" ? "" : String(modalFacultyId)}
                    onChange={(e) => {
                      setModalFacultyId(e.target.value === "" ? "" : Number(e.target.value));
                      setModalDepartmentId("");
                    }}
                  >
                    <option value="">Seçin</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Bölüm</label>
                  <select
                    className="admin-input"
                    value={modalDepartmentId === "" ? "" : String(modalDepartmentId)}
                    onChange={(e) =>
                      setModalDepartmentId(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    disabled={modalFacultyId === ""}
                  >
                    <option value="">Atanmamış (kaldır)</option>
                    {modalDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button type="submit" className="admin-btn-primary" disabled={actionLoading}>
                    Kaydet
                  </button>
                  <button type="button" className="admin-btn-secondary" onClick={closeDeptModal}>
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAppointmentsPage;
