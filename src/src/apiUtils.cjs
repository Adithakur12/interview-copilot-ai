function parseApiResponse(response, fallbackMessage = 'Request failed') {
  return response.text().then((text) => {
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }

    if (!response.ok) {
      const message = data?.error || data?.message || fallbackMessage;
      const error = new Error(message);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  });
}

function normalizeArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.data)) return value.data;
  return fallback;
}

function normalizeObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return fallback;
}

module.exports = {
  parseApiResponse,
  normalizeArray,
  normalizeObject,
};


