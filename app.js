import {
  Client,
  handle_file,
} from "https://cdn.jsdelivr.net/npm/@gradio/client@1.9.0/dist/index.min.js";

const ui = {
  spaceId: document.getElementById("spaceId"),
  embedEndpoint: document.getElementById("embedEndpoint"),
  extractEndpoint: document.getElementById("extractEndpoint"),
  connectBtn: document.getElementById("connectBtn"),
  apiInfo: document.getElementById("apiInfo"),

  embedForm: document.getElementById("embedForm"),
  hostImage: document.getElementById("hostImage"),
  watermarkImage: document.getElementById("watermarkImage"),
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
  const space = ui.spaceId.value.trim();
  if (!space) {
    throw new Error("Space ID is required");
  }
  client = await Client.connect(space);
  const api = await client.view_api(true);
  setLog(ui.apiInfo, JSON.stringify(api, null, 2));
}

async function runEmbed(event) {
  event.preventDefault();
  if (!client) {
    setLog(ui.embedLog, "Connect API first.");
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
    const endpoint = parseEndpoint(ui.embedEndpoint.value);
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
  if (!client) {
    setLog(ui.extractLog, "Connect API first.");
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
    const endpoint = parseEndpoint(ui.extractEndpoint.value);
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
  ui.connectBtn.addEventListener("click", async () => {
    ui.connectBtn.disabled = true;
    setLog(ui.apiInfo, "Connecting...");
    try {
      await connectClient();
    } catch (err) {
      setLog(ui.apiInfo, `Connect failed: ${err?.message || err}`);
    } finally {
      ui.connectBtn.disabled = false;
    }
  });

  ui.embedForm.addEventListener("submit", runEmbed);
  ui.extractForm.addEventListener("submit", runExtract);

  // Set disabled style by default.
  setDownloadLink(ui.embedImageDownload, null, "watermarked.png");
  setDownloadLink(ui.metadataDownload, null, "metadata.npz");
  setDownloadLink(ui.extractImageDownload, null, "extracted.png");
}

bootstrap();
