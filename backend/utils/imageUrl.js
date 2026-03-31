const API_BASE_URL = process.env.APP_URL || "https://api.sarvatirthamayi.com/";

function formatImageUrl(value) {
  if (!value) return "";

  const raw = String(value).trim().replace(/\\/g, "/");

  // Already absolute URL -> keep as-is
  if (/^https?:\/\//i.test(raw)) {
    // Optional localhost rewrite for production
    return raw.replace(/^http:\/\/localhost:5000\//i, API_BASE_URL);
  }

  // "localhost:5000/uploads/..." without protocol
  if (/^localhost:5000\//i.test(raw)) {
    return raw.replace(/^localhost:5000\//i, API_BASE_URL);
  }

  // "/uploads/..."
  if (raw.startsWith("/")) {
    return `${API_BASE_URL}${raw.slice(1)}`;
  }

  // "uploads/..."
  return `${API_BASE_URL}${raw}`;
}

module.exports = formatImageUrl;