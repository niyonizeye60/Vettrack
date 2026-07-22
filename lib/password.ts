import bcrypt from "bcryptjs"

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/

export function isHashedPassword(password: string): boolean {
  return BCRYPT_HASH_PATTERN.test(password)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Accepts either a bcrypt hash or a legacy plain-text password, so existing
// accounts created before hashing was introduced keep working.
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isHashedPassword(stored)) {
    return bcrypt.compare(plain, stored)
  }
  return plain === stored
}
