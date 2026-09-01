// Same rules as com.lia.util.Validation on the server - the server is the
// real source of truth, this just gives instant feedback before the round trip.

const USERNAME_MIN_LENGTH = 8;
const USERNAME_MAX_LENGTH = 24;
const LRN_LENGTH = 12;

function validateUsername(username) {
  const trimmed = (username || "").trim();
  if (!trimmed) {
    return "Username is required!";
  }
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters long!`;
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return `Username must not exceed ${USERNAME_MAX_LENGTH} characters!`;
  }
  return null;
}

function validateLrn(lrn) {
  const trimmed = (lrn || "").trim();
  if (!trimmed) {
    return "LRN is required!";
  }
  if (!/^\d+$/.test(trimmed)) {
    return "LRN must contain numbers only!";
  }
  if (trimmed.length !== LRN_LENGTH) {
    return `LRN must be ${LRN_LENGTH} numbers!`;
  }
  return null;
}

function validateEmail(email) {
  if (!email || !/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
    return "Please enter a valid email address!";
  }
  return null;
}

// checked one rule at a time so the person knows exactly what's missing
function validatePassword(password) {
  const value = password || "";
  if (value.length < 8) {
    return "Password must be at least 8 characters!";
  }
  if (!/[A-Za-z]/.test(value)) {
    return "Password must have a letter!";
  }
  if (!/\d/.test(value)) {
    return "Password must have a number!";
  }
  return null;
}
