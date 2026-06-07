export const PASSWORD_POLICY_MESSAGE =
  'Şifre 8-15 karakter olmalı; en az bir harf, bir rakam ve bir özel karakter içermelidir.';

export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 15) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/[0-9]/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return null;
}
