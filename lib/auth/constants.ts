export const SESSION_COOKIE = "qf_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** 32-byte session tokens are stored as 64 hex characters. */
export const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
