const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "bot-data.json");

const defaultData = {
  messages: {},  // Žinučių skaičius
  warns: {},     // Mod įspėjimai ir statistika
  economy: {}    // Minigames / Don centai
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Klaida užkraunant duomenis:", err);
  }
  saveData(defaultData);
  return defaultData;
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Klaida išsaugant duomenis:", err);
  }
}

module.exports = { loadData, saveData };
