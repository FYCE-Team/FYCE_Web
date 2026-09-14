const API_URL = import.meta.env.VITE_API_BASE_URL;

export const register = async (data) => {
    const response = await fetch(
        `${API_URL}/auth/register`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Đăng ký thất bại"
        );
    }

    return result;
};

export const verifyOtp = async ({
    userId,
    otp
}) => {
    const response = await fetch(
        `${API_URL}/auth/verify-otp`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId,
                otp
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Xác thực OTP thất bại"
        );
    }

    return result;
};

export const resendOtp = async ({
    userId
}) => {
    const response = await fetch(
        `${API_URL}/auth/resend-otp`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId
            })
        }
    );

    const result =
        await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Không thể gửi lại OTP"
        );
    }

    return result;
};

export const login = async ({
    identifier,
    password,
    rememberMe
}) => {
    const response = await fetch(
        `${API_URL}/auth/login`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                identifier,
                password,
                rememberMe
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Đăng nhập thất bại"
        );
    }

    return result;
};

export const logout = async () => {
    const response = await fetch(
        `${API_URL}/auth/logout`,
        {
            method: "POST",
            credentials: "include"
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Đăng xuất thất bại"
        );
    }

    return result;
};

export const loginWithGoogle = async (
    credential
) => {
    const response = await fetch(
        `${API_URL}/auth/google`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                credential
            })
        }
    );

    const result =
        await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Đăng nhập Google thất bại"
        );
    }

    return result;
};

export const refresh = async () => {
    const response = await fetch(
        `${API_URL}/auth/refresh`,
        {
            method: "POST",
            credentials: "include"
        }
    );

    const result =
        await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Không thể làm mới phiên đăng nhập"
        );
    }

    return result;
};
export const forgotPassword = async (email) => {
  const response = await fetch(
    `${API_URL}/auth/forgot-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ email })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Không thể gửi mã OTP khôi phục"
    );
  }

  return result;
};

export const verifyResetOtp = async ({
  email,
  otp
}) => {
  const response = await fetch(
    `${API_URL}/auth/verify-reset-otp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        otp
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Mã OTP không hợp lệ"
    );
  }

  return result;
};

export const resendResetOtp = async (
  email
) => {
  const response = await fetch(
    `${API_URL}/auth/resend-reset-otp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ email })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Không thể gửi lại mã OTP"
    );
  }

  return result;
};

export const resetPassword = async ({
  resetToken,
  password
}) => {
  const response = await fetch(
    `${API_URL}/auth/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        resetToken,
        password
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Không thể đặt lại mật khẩu"
    );
  }

  return result;
};

export const updateProfile = async (
    data,
    accessToken
) => {
    const response = await fetch(
        `${API_URL}/auth/me`,
        {
            method: "PATCH",
            headers: {
                "Content-Type":
                    "application/json",
                Authorization:
                    `Bearer ${accessToken}`
            },
            credentials: "include",
            body: JSON.stringify(data)
        }
    );

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result?.success
    ) {
        const error = new Error(
            result?.message ||
                "Không thể cập nhật thông tin tài khoản"
        );

        error.status = response.status;
        error.data = result?.data || null;

        throw error;
    }

    return result;
};

