"use client";

import { useEffect, useState, useMemo } from "react";
import { getProfile, updateProfile, changePassword } from "@/features/auth/api";
import type { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from "@/features/auth/types";
import { useToast } from "@/components/shared/Toast";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

function generateRandomPassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "bg-slate-200" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 2) return { level: 1, label: "Yếu", color: "bg-red-500" };
  if (score <= 4) return { level: 2, label: "Trung bình", color: "bg-yellow-500" };
  return { level: 3, label: "Mạnh", color: "bg-green-500" };
}

export default function AccountPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form states for profile info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passwordHint, setPasswordHint] = useState("");

  // Form states for password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setName(data.name || "");
      setEmail(data.email || "");
      setPasswordHint(data.passwordHint || "");
    } catch {
      notify({ message: "Không thể tải thông tin tài khoản.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasProfileChanges = useMemo(() => {
    if (!profile) return false;
    return (
      name !== (profile.name || "") ||
      email !== (profile.email || "") ||
      passwordHint !== (profile.passwordHint || "")
    );
  }, [profile, name, email, passwordHint]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      notify({ message: "Vui lòng nhập tên quản trị.", variant: "error" });
      return;
    }
    if (!email.trim()) {
      notify({ message: "Vui lòng nhập email.", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload: UpdateProfileRequest = {
        name: name.trim(),
        email: email.trim(),
        passwordHint: passwordHint.trim() || null,
      };
      await updateProfile(payload);
      notify({ message: "Cập nhật thông tin thành công.", variant: "success" });
      loadProfile();
    } catch {
      notify({ message: "Cập nhật thất bại. Vui lòng thử lại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      notify({ message: "Vui lòng nhập mật khẩu hiện tại.", variant: "error" });
      return;
    }
    if (!newPassword) {
      notify({ message: "Vui lòng nhập mật khẩu mới.", variant: "error" });
      return;
    }
    if (newPassword.length < 6) {
      notify({ message: "Mật khẩu mới phải có ít nhất 6 ký tự.", variant: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      notify({ message: "Xác nhận mật khẩu không khớp.", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload: ChangePasswordRequest = {
        currentPassword,
        newPassword,
      };
      await changePassword(payload);
      notify({ message: "Đổi mật khẩu thành công.", variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      notify({ message: "Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generateRandomPassword(12);
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setHidePassword(false);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Chưa có";
    try {
      return new Date(dateStr).toLocaleString("vi-VN");
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Cấu hình hệ thống</p>
          <h1 className="text-xl font-semibold text-slate-900">Thông Tin Tài Khoản</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Cấu hình hệ thống", href: "/settings/config" },
            { label: "Thông Tin Tài Khoản" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Information Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Thông tin cơ bản</h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tên Quản Trị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên quản trị..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Username (read-only) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
              <input
                type="text"
                value={profile?.username || ""}
                disabled
                className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
              <p className="mt-1 text-xs text-slate-500">Username không thể thay đổi</p>
            </div>

            {/* Last Login (read-only) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Đăng nhập gần nhất</label>
              <input
                type="text"
                value={formatDate(profile?.lastLogin ?? null)}
                disabled
                className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
            </div>

            {/* Password Hint */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gợi ý mật khẩu</label>
              <input
                type="text"
                value={passwordHint}
                onChange={(e) => setPasswordHint(e.target.value)}
                placeholder="Nhập gợi ý mật khẩu..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={!hasProfileChanges || saving}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Cập nhật thông tin"}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Đổi mật khẩu</h2>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mật khẩu hiện tại <span className="text-red-500">*</span>
              </label>
              <input
                type={hidePassword ? "password" : "text"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={hidePassword ? "password" : "text"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  title="Tạo mật khẩu ngẫu nhiên"
                >
                  Ngẫu nhiên
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full ${
                          level <= passwordStrength.level ? passwordStrength.color : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1 text-xs ${
                    passwordStrength.level === 1 ? "text-red-600" :
                    passwordStrength.level === 2 ? "text-yellow-600" : "text-green-600"
                  }`}>
                    Độ mạnh: {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type={hidePassword ? "password" : "text"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Mật khẩu không khớp</p>
              )}
            </div>

            {/* Hide Password Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hidePassword"
                checked={hidePassword}
                onChange={(e) => setHidePassword(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="hidePassword" className="text-sm text-slate-700">
                Ẩn mật khẩu
              </label>
            </div>

            {/* Change Password Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || !confirmPassword || saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Đang xử lý..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
