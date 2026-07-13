import API from "../../api/axios";
import axios from "axios";

let cachedConfig = null;

export const fetchBunnyConfig = async () => {
  if (cachedConfig) return cachedConfig;

  const response = await API.get("/admin/auth/bunny-config");
  cachedConfig = response.data;

  return cachedConfig;
};

const safePathSegment = (value) => {
  return encodeURIComponent(
    String(value || "")
      .trim()
      .replace(/^\/+|\/+$/g, "")
  );
};

const getExtension = (file) => {
  const name = file?.name || "";
  const ext = name.includes(".")
    ? name.split(".").pop().toLowerCase()
    : "";

  return ext ? `.${ext}` : "";
};

const uploadThroughBackend = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  const formData = new FormData();

  formData.append("type", type);
  formData.append("subfolder", subfolder);
  formData.append("file", file);

  const response = await API.post(
    "/admin/auth/bunny-upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) /
              progressEvent.total
          );

          onProgress(percentCompleted);
        }
      },
    }
  );

  return response.data.url;
};

const uploadDirectToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  const {
    storageHosts = [],
    storageZone,
    accessKey,
    cdnUrl,
  } = await fetchBunnyConfig();

  const filename = `${Date.now()}-${Math.round(
    Math.random() * 1000000000
  )}${getExtension(file)}`;

  const remoteFolder =
    `${safePathSegment(type)}/${safePathSegment(
      subfolder
    )}`;

  let lastError = null;

  for (const storageHost of storageHosts) {
    const uploadUrl =
      `https://${storageHost}/${storageZone}/${remoteFolder}/${filename}`;

    try {
      const response = await axios.put(uploadUrl, file, {
        headers: {
          AccessKey: accessKey,
          "Content-Type":
            file.type || "application/octet-stream",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) /
                progressEvent.total
            );

            onProgress(percentCompleted);
          }
        },
      });

      if (response.status >= 200 && response.status < 300) {
        return `${cdnUrl}/${remoteFolder}/${filename}`;
      }

      lastError = new Error(
        `Bunny upload failed (${response.status})`
      );
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      const isRetryable = status === 401 || status === 403 || !err?.response;

      if (!isRetryable) {
        break;
      }

      // Try the next storage host if available.
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Bunny upload failed");
};

const uploadDirectToBunnyStream = async (file, onProgress) => {
  const config = await fetchBunnyConfig();
  const { libraryId, apiKey, pullZone } = config.bunnyStream || {};
  if (!libraryId || !apiKey || !pullZone) {
    throw new Error("Missing Bunny Stream configuration in bunny-config");
  }

  // Normalize pullZone host name
  let pullZoneHost = String(pullZone).trim().replace(/\/+$/, "");
  if (pullZoneHost && !pullZoneHost.includes(".")) {
    pullZoneHost = `${pullZoneHost}.b-cdn.net`;
  }

  // Step 1: Create Video Object
  const title = file.name || `Video-${Date.now()}`;
  const createUrl = `https://video.bunnycdn.com/library/${libraryId}/videos`;

  console.log("Direct Bunny Stream Upload: Creating video object...");
  const createResponse = await axios.post(
    createUrl,
    { title },
    {
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/json",
      },
    }
  );

  const videoId = createResponse.data.guid;
  if (!videoId) {
    throw new Error("Failed to retrieve video GUID from Bunny Stream API");
  }

  console.log(`Direct Bunny Stream Upload: Video object created with GUID: ${videoId}. Starting upload...`);

  // Step 2: Upload raw file contents
  const uploadUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
  await axios.put(uploadUrl, file, {
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/octet-stream",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  console.log("Direct Bunny Stream Upload: Upload complete!");

  // Return the playlist URL format
  return `https://${pullZoneHost}/${videoId}/playlist.m3u8`;
};

export const uploadToBunny = async (
  file,
  type,
  subfolder,
  onProgress
) => {
  if (!file) return "";

  const isVideo = subfolder === "videos" || subfolder === "trailers" || subfolder === "teasers" || subfolder === "clips";

  if (isVideo) {
    console.log("USING DIRECT BUNNY STREAM UPLOAD FOR VIDEO:", subfolder);
    return uploadDirectToBunnyStream(
      file,
      onProgress
    );
  }

  console.log(
    "USING DIRECT BUNNY UPLOAD FOR:",
    subfolder
  );

  try {
    return await uploadDirectToBunny(
      file,
      type,
      subfolder,
      onProgress
    );
  } catch (err) {
    const status = err?.response?.status;
    const shouldFallbackToBackend =
      !err?.response ||
      status === 401 ||
      status === 403 ||
      status === 0;

    if (!shouldFallbackToBackend) {
      throw err;
    }

    return uploadThroughBackend(
      file,
      type,
      subfolder,
      onProgress
    );
  }
};
