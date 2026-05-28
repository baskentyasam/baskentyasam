import apiClient from '../api/axios';

export interface LoginRequest {
  username: string;
  password: string;
  role?: "student" | "instructor" | "cashier" | "superadmin" | "subadmin";
}

// Backend'den gelen response formatı
export interface BackendLoginResponse {
  token: string;
  userId: number;
  name: string;
  role: string; // "Student" veya "Instructor" (büyük harf ile)
}

// Frontend'in kullandığı format
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: "student" | "instructor" | "cashier" | "superadmin" | "subadmin";
    name?: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'instructor';
  studentNo?: string | null;
}

// Login işlemi
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    // Backend'in beklediği formata göre request body'yi hazırla
    const requestBody: any = {
      usernameOrEmail: credentials.username, // Kullanıcı adı veya email
      password: credentials.password,
    };

    // Role'ü backend formatına çevir
    if (credentials.role) {
      if (credentials.role === "instructor") requestBody.role = "Teacher";
      else if (credentials.role === "cashier") requestBody.role = "Staff";
      else if (credentials.role === "superadmin") requestBody.role = "SuperAdmin";
      else if (credentials.role === "subadmin") requestBody.role = "SubAdmin";
      else requestBody.role = "Student";
    }

    console.log('Login request body:', requestBody); // Debug için

    // Backend endpoint'i /Auth/login (büyük harf ile)
    const response = await apiClient.post<BackendLoginResponse>('/Auth/login', requestBody);

    // Backend'den gelen response'u frontend formatına dönüştür
    const backendData = response.data;

    console.log('Backend role:', backendData.role); // Debug için

    // Role'ü küçük harfe çevir ve normalize et
    const roleLower = (backendData.role || "").toLowerCase();
    let normalizedRole: "student" | "instructor" | "cashier" | "superadmin" | "subadmin";

    if (roleLower === "teacher" || roleLower === "instructor") {
      normalizedRole = "instructor";
    } else if (roleLower === "staff") {
      normalizedRole = "cashier";
    } else if (roleLower === "superadmin") {
      normalizedRole = "superadmin";
    } else if (roleLower === "subadmin") {
      normalizedRole = "subadmin";
    } else if (roleLower === "admin") {
      throw {
        message:
          "Legacy Admin hesabı devre dışıdır. Lütfen Sistem Yöneticisi veya Alt Admin hesabı kullanın.",
        status: 403,
      } as ApiError;
    } else {
      normalizedRole = "student";
    }

    console.log('Normalized role:', normalizedRole); // Debug için

    // Frontend formatına dönüştür
    const loginResponse: LoginResponse = {
      token: backendData.token,
      user: {
        id: backendData.userId.toString(),
        username: backendData.name, // Backend'de username yok, name kullanıyoruz
        role: normalizedRole,
        name: backendData.name,
      },
    };

    // Token ve kullanıcı bilgilerini localStorage'a kaydet
    if (loginResponse.token) {
      localStorage.setItem('token', loginResponse.token);
      localStorage.setItem('user', JSON.stringify(loginResponse.user));
    }

    return loginResponse;
  } catch (error: any) {
    console.error('Login error:', error.response?.data); // Debug için
    
    // E-posta doğrulama hatası için özel mesaj
    const errorMessage = error.response?.data?.message || error.response?.data?.error;
    
    let displayMessage = 'Giriş yapılırken bir hata oluştu.';
    
    if (errorMessage) {
      if (errorMessage.includes('mail') || errorMessage.includes('doğrula')) {
        displayMessage = errorMessage + '\n\nLütfen e-posta kutunuzu kontrol edin ve doğrulama linkine tıklayın. E-postayı bulamıyorsanız spam klasörünü kontrol edin.';
      } else if (errorMessage.includes('şifre') || errorMessage.includes('password')) {
        displayMessage = 'Kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
      } else if (errorMessage.includes('rol')) {
        displayMessage = errorMessage + '\n\nLütfen doğru rol seçimi yaptığınızdan emin olun.';
      } else {
        displayMessage = errorMessage;
      }
    }
    
    throw {
      message: displayMessage,
      status: error.response?.status,
    } as ApiError;
  }
};

// Kayıt işlemi
export const register = async (payload: RegisterRequest): Promise<LoginResponse> => {
  // Kayıt işleminden önce varsa eski oturumu kapat
  logout();

  try {
    const requestBody = {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role === 'instructor' ? 'Teacher' : 'Student', // Backend UserRole enum uses Teacher/Student
      studentNo: payload.studentNo || null,
    };

    const response = await apiClient.post<BackendLoginResponse>('/Auth/register', requestBody);
    const backendData = response.data;

    console.log('Backend role (register):', backendData.role); // Debug için

    // Role'ü küçük harfe çevir ve normalize et
    const roleLower = (backendData.role || "").toLowerCase();
    let normalizedRole: "student" | "instructor" | "cashier" | "superadmin" | "subadmin";

    if (roleLower === "teacher" || roleLower === "instructor") {
      normalizedRole = "instructor";
    } else if (roleLower === "staff") {
      normalizedRole = "cashier";
    } else if (roleLower === "superadmin") {
      normalizedRole = "superadmin";
    } else if (roleLower === "subadmin") {
      normalizedRole = "subadmin";
    } else if (roleLower === "admin") {
      throw {
        message:
          "Legacy Admin hesabı devre dışıdır. Lütfen Sistem Yöneticisi veya Alt Admin hesabı kullanın.",
        status: 403,
      } as ApiError;
    } else {
      normalizedRole = "student";
    }

    console.log('Normalized role (register):', normalizedRole); // Debug için

    const loginResponse: LoginResponse = {
      token: backendData.token,
      user: {
        id: backendData.userId.toString(),
        username: backendData.name,
        role: normalizedRole,
        name: backendData.name,
      },
    };

    // Token ve kullanıcı bilgilerini localStorage'a kaydet
    if (loginResponse.token) {
      localStorage.setItem('token', loginResponse.token);
      localStorage.setItem('user', JSON.stringify(loginResponse.user));
    }

    return loginResponse;
  } catch (error: any) {
    console.error('Register error:', error.response?.data);
    
    const errorMessage = error.response?.data?.message || error.response?.data?.error;
    
    let displayMessage = 'Kayıt yapılırken bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
    
    if (errorMessage) {
      if (errorMessage.includes('kullanılıyor') || errorMessage.includes('zaten')) {
        displayMessage = errorMessage + '\n\nFarklı bir kullanıcı adı veya e-posta adresi deneyin.';
      } else if (errorMessage.includes('Email') || errorMessage.includes('SMTP')) {
        displayMessage = 'E-posta gönderilemedi. Lütfen e-posta adresinizi kontrol edin veya daha sonra tekrar deneyin.';
      } else {
        displayMessage = errorMessage;
      }
    }
    
    throw {
      message: displayMessage,
      status: error.response?.status,
    } as ApiError;
  }
};

// Logout işlemi
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Kullanıcı bilgilerini al
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

export const getRoleDisplayName = (
  role?: "student" | "instructor" | "cashier" | "superadmin" | "subadmin"
): string => {
  if (!role) return "Kullanıcı";
  if (role === "superadmin") return "Sistem Yöneticisi";
  if (role === "subadmin") return "Alt Admin";
  if (role === "cashier") return "Kasiyer";
  if (role === "instructor") return "Akademik Personel";
  return "Öğrenci";
};

// Token kontrolü
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

/** Şifre sıfırlama talebi (e-posta enumeration azaltılmış genel mesaj döner). */
export const requestForgotPassword = async (email: string): Promise<string> => {
  try {
    const res = await apiClient.post<{ message: string }>('/Auth/forgot-password', { email });
    return res.data.message;
  } catch (error: any) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message;
    throw { message: msg || 'İstek gönderilemedi.', status: error.response?.status } as ApiError;
  }
};

/** E-postadaki token ile yeni şifre. */
export const resetPasswordWithToken = async (token: string, newPassword: string): Promise<string> => {
  try {
    const res = await apiClient.post<{ message: string }>('/Auth/reset-password', {
      token,
      newPassword,
    });
    return res.data.message;
  } catch (error: any) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message;
    throw { message: msg || 'Şifre güncellenemedi.', status: error.response?.status } as ApiError;
  }
};

export interface MyProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  studentNo?: string | null;
  profileImage?: string | null;
  department?: string | null;
  roomNumber?: string | null;
  phoneNumber?: string | null;
  classLevel?: string | null;
  courses?: string | null;
  firstLoginAt?: string | null;
  lastLoginAt?: string | null;
}

export interface UpdateProfilePayload {
  profileImage?: string | null;
  department?: string | null;
  roomNumber?: string | null;
  phoneNumber?: string | null;
  classLevel?: string | null;
  courses?: string | null;
  studentNo?: string | null;
}

export const getMyProfile = async (): Promise<MyProfile> => {
  try {
    const res = await apiClient.get<MyProfile>('/Auth/me');
    return res.data;
  } catch (error: any) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message;
    throw { message: msg || 'Profil bilgileri alınamadı.', status: error.response?.status } as ApiError;
  }
};

export const updateMyProfile = async (payload: UpdateProfilePayload): Promise<MyProfile> => {
  try {
    const res = await apiClient.put<MyProfile & { message?: string }>('/Auth/me', payload, {
      timeout: 60_000,
    });
    return res.data;
  } catch (error: any) {
    let msg =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message;

    if (error.response?.status === 413) {
      msg = 'Yüklenen veri sunucu için fazla büyük. Lütfen daha küçük bir fotoğraf seçin.';
    } else if (error.code === 'ECONNABORTED') {
      msg = 'Zaman aşımı. Lütfen tekrar deneyin.';
    }

    throw { message: msg || 'Profil güncellenemedi.', status: error.response?.status } as ApiError;
  }
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<string> => {
  try {
    const res = await apiClient.post<{ message: string }>('/Auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data.message;
  } catch (error: any) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message;
    throw { message: msg || 'Şifre değiştirilemedi.', status: error.response?.status } as ApiError;
  }
};

