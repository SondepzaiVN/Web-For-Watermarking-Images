import {
  Client,
  handle_file,
} from "https://cdn.jsdelivr.net/npm/@gradio/client@1.9.0/dist/index.min.js";

const API_CONFIG = {
  spaceId: "channelson4321/Watermarking-Image-Son",
  embedEndpoint: "/embed",
  extractEndpoint: "/extract",
};

const ui = {
  embedForm: document.getElementById("embedForm"),
  hostImage: document.getElementById("hostImage"),
  hostPreview: document.getElementById("hostPreview"),
  watermarkImage: document.getElementById("watermarkImage"),
  watermarkPreview: document.getElementById("watermarkPreview"),
  mode: document.getElementById("mode"),
  watermarkText: document.getElementById("watermarkText"),
  alpha: document.getElementById("alpha"),
  nRoi: document.getElementById("nRoi"),
  seed: document.getElementById("seed"),
  affine: document.getElementById("affine"),
  embedBtn: document.getElementById("embedBtn"),
  embedImageOut: document.getElementById("embedImageOut"),
  embedImageDownload: document.getElementById("embedImageDownload"),
  metadataDownload: document.getElementById("metadataDownload"),
  embedLog: document.getElementById("embedLog"),

  extractForm: document.getElementById("extractForm"),
  suspectImage: document.getElementById("suspectImage"),
  metadataFile: document.getElementById("metadataFile"),
  extractBtn: document.getElementById("extractBtn"),
  extractImageOut: document.getElementById("extractImageOut"),
  extractImageDownload: document.getElementById("extractImageDownload"),
  decodedText: document.getElementById("decodedText"),
  extractLog: document.getElementById("extractLog"),
};

let client = null;
let connectPromise = null;

function setLog(node, msg) {
  node.textContent = msg;
}

function setDownloadLink(anchor, fileData, fallbackName) {
  if (!fileData || !fileData.url) {
    anchor.classList.add("disabled");
    anchor.removeAttribute("href");
    anchor.textContent = "No file available";
    return;
  }
  anchor.classList.remove("disabled");
  anchor.href = fileData.url;
  anchor.download = fileData.orig_name || fallbackName;
  anchor.textContent = `Download ${fileData.orig_name || fallbackName}`;
}

function parseEndpoint(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    throw new Error("Endpoint is empty");
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

function showPreview(fileInput, imageNode) {
  const file = fileInput.files?.[0];
  if (!file) {
    imageNode.removeAttribute("src");
    imageNode.classList.remove("visible");
    return;
  }
  const url = URL.createObjectURL(file);
  imageNode.src = url;
  imageNode.classList.add("visible");
}

function normalizeFileData(value) {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return normalizeFileData(value[0]);
  }
  if (typeof value === "string") {
    return { url: value, orig_name: "file" };
  }
  if (value.url) {
    return value;
  }
  return null;
}

async function connectClient() {
  client = await Client.connect(API_CONFIG.spaceId);
  return client;
}

async function ensureClient() {
  if (client) {
    return client;
  }
  if (!connectPromise) {
    connectPromise = connectClient().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }
  return connectPromise;
}

async function runEmbed(event) {
  event.preventDefault();

  try {
    await ensureClient();
  } catch (err) {
    setLog(ui.embedLog, `Cannot connect to API: ${err?.message || err}`);
    return;
  }

  const hostFile = ui.hostImage.files[0];
  if (!hostFile) {
    setLog(ui.embedLog, "Please choose a host image.");
    return;
  }

  const mode = ui.mode.value;
  const watermarkFile = ui.watermarkImage.files[0] || null;
  if (mode === "image" && !watermarkFile) {
    setLog(ui.embedLog, "Please choose watermark image for image mode.");
    return;
  }

  ui.embedBtn.disabled = true;
  setLog(
    ui.embedLog,
    "Embedding... (Space may wake from sleep, first call can be slow)",
  );

  try {
    const endpoint = parseEndpoint(API_CONFIG.embedEndpoint);
    const payload = [
      handle_file(hostFile),
      mode,
      mode === "image" ? handle_file(watermarkFile) : null,
      ui.watermarkText.value,
      Number(ui.alpha.value),
      Number(ui.nRoi.value),
      Number(ui.seed.value),
      Boolean(ui.affine.checked),
    ];

    const result = await client.predict(endpoint, payload);
    const [imageOut, metadataOut, embedLog] = result.data;

    const imageData = normalizeFileData(imageOut);
    const metadataData = normalizeFileData(metadataOut);

    if (imageData && imageData.url) {
      ui.embedImageOut.src = imageData.url;
    }
    setDownloadLink(ui.embedImageDownload, imageData, "watermarked.png");
    setDownloadLink(ui.metadataDownload, metadataData, "metadata.npz");
    setLog(ui.embedLog, String(embedLog || "Embed complete."));
  } catch (err) {
    setLog(ui.embedLog, `Embed failed: ${err?.message || err}`);
  } finally {
    ui.embedBtn.disabled = false;
  }
}

async function runExtract(event) {
  event.preventDefault();

  try {
    await ensureClient();
  } catch (err) {
    setLog(ui.extractLog, `Cannot connect to API: ${err?.message || err}`);
    return;
  }

  const suspectFile = ui.suspectImage.files[0];
  const metadataFile = ui.metadataFile.files[0];
  if (!suspectFile || !metadataFile) {
    setLog(ui.extractLog, "Please choose suspect image and metadata file.");
    return;
  }

  ui.extractBtn.disabled = true;
  setLog(
    ui.extractLog,
    "Extracting... (first call can be slow if Space is sleeping)",
  );

  try {
    const endpoint = parseEndpoint(API_CONFIG.extractEndpoint);
    const payload = [handle_file(suspectFile), handle_file(metadataFile)];
    const result = await client.predict(endpoint, payload);
    const [imageOut, decodedText, extractLog] = result.data;

    const imageData = normalizeFileData(imageOut);
    if (imageData && imageData.url) {
      ui.extractImageOut.src = imageData.url;
    }

    ui.decodedText.textContent = decodedText || "";
    setDownloadLink(ui.extractImageDownload, imageData, "extracted.png");
    setLog(ui.extractLog, String(extractLog || "Extract complete."));
  } catch (err) {
    setLog(ui.extractLog, `Extract failed: ${err?.message || err}`);
  } finally {
    ui.extractBtn.disabled = false;
  }
}

function setupTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  const contents = [...document.querySelectorAll(".tab-content")];

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      const content = document.getElementById(tab.dataset.tab);
      if (content) {
        content.classList.add("active");
      }
    });
  });
}

function bootstrap() {
  setupTabs();

  ui.hostImage.addEventListener("change", () => {
    showPreview(ui.hostImage, ui.hostPreview);
  });
  ui.watermarkImage.addEventListener("change", () => {
    showPreview(ui.watermarkImage, ui.watermarkPreview);
  });

  ensureClient().catch(() => {
    // Lazy reconnect on Embed/Extract if initial auto-connect fails.
  });

  ui.embedForm.addEventListener("submit", runEmbed);
  ui.extractForm.addEventListener("submit", runExtract);

  // Set disabled style by default.
  setDownloadLink(ui.embedImageDownload, null, "watermarked.png");
  setDownloadLink(ui.metadataDownload, null, "metadata.npz");
  setDownloadLink(ui.extractImageDownload, null, "extracted.png");
}

bootstrap();
