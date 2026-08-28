// Shared validation rules for registration and profile editing.
// These mirror com.lia.util.Validation on the server -- the server is the
// real source of truth (a request can always bypass this file), but
// checking here first gives instant feedback instead of a round trip.

const USERNAME_MIN_LENGTH = 8;
const USERNAME_MAX_LENGTH = 24;
const LRN_LENGTH = 12;

// Returns an error message string, or null if the username is valid.
function validateUsername(username) {
  const trimmed = (username || "").trim();
  if (!trimmed) {
    return "Username is required.";
  }
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters long.`;
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return `Username must not exceed ${USERNAME_MAX_LENGTH} characters.`;
  }
  return null;
}

// Returns an error message string, or null if the LRN is valid.
function validateLrn(lrn) {
  if (!lrn || !/^\d{12}$/.test(lrn.trim())) {
    return `LRN must be exactly ${LRN_LENGTH} digits.`;
  }
  return null;
}

// Returns an error message string, or null if the email is valid.
function validateEmail(email) {
  if (!email || !/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

// Returns an error message string, or null if the password is strong enough.
function validatePassword(password) {
  if (!password || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    return "Password must be at least 8 characters and include both letters and numbers.";
  }
  return null;
}
