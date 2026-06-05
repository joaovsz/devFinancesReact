export const COMMERCE_MODULE_OWNER_EMAIL = "joaovitor1713coin@gmail.com"

export function canAccessCommerceModule(email?: string | null) {
  if (import.meta.env.DEV) {
    return true
  }

  return email?.trim().toLowerCase() === COMMERCE_MODULE_OWNER_EMAIL
}
