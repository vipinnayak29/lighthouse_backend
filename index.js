const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const lighthouse = require("@lighthouse-web3/sdk");

// paste your Lighthouse API key here (NOT nft.storage key)
const LIGHTHOUSE_API_KEY = "8b03a276.e0276c23b5914789ab150d22682933f9";

const LOG_PATH = path.resolve(__dirname, "..", "approvedLogs.txt");
const PORT = 8787;

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "", "utf8");

app.get("/health", (_req, res) => res.json({ ok: true, log: LOG_PATH }));

app.post("/upload", async (req, res) => {
  try {
    const { json } = req.body || {};
    if (!json || typeof json !== "object") {
      return res.status(400).json({ error: "Body must be { json: <object> }" });
    }
    if (!LIGHTHOUSE_API_KEY || /PASTE_LIGHTHOUSE/i.test(LIGHTHOUSE_API_KEY)) {
      return res.status(500).json({ error: "LIGHTHOUSE_API_KEY not set" });
    }

    // Upload as raw text (the JSON string)
    const text = JSON.stringify(json);
    const result = await lighthouse.uploadText(text, LIGHTHOUSE_API_KEY);
    // result example: { data: { Hash: 'baf...', Name: 'text.txt', Size: '...' } }
    const cid = result?.data?.Hash;
    if (!cid) throw new Error("No CID returned from Lighthouse");

    // gateway URL (public)
    const url = `https://gateway.lighthouse.storage/ipfs/${cid}`;

    // append structured log (NDJSON)
    const record = {
      ts: new Date().toISOString(),
      cid,
      url,
      claimId: json.id || null,
      snapshot: json
    };
    fs.appendFileSync(LOG_PATH, JSON.stringify(record) + "\n", "utf8");

    console.log(`[Lighthouse] Stored: ${url}`);
    res.json({ cid, url });
  } catch (err) {
    console.error("[Lighthouse] Server error:", err?.message || err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  // console.log(`Lighthouse server at http://localhost:${PORT}`);
  console.log(`Logging to ${LOG_PATH}`);
});
