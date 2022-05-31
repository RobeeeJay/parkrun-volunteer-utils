const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { getMilestones } = require("./milestones");
const process = require("process");
const fs = require("fs");
const CONFIG_FILENAME = "parkrun-utils.cfg";
let config = {};

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  ipcMain.on("fetch-milestones", async (event, resultsUrl) => {
    // Let's just check this URL a bit before we try and fetch it!
    if (
      !resultsUrl.startsWith("https://www.parkrun.org.uk/") ||
      !resultsUrl.endsWith("/results/latestresults/")
    ) {
      // Tell the UI that this went badly
      //event.reply("asynchronous-reply", "pong");
      event.reply("error-fetch", "Oops! The webpage URL doesn't look right!");
    } else {
      // Let's try saving the URL to a config file and then retrieving this milestone
      try {
        config.resultsUrl = resultsUrl;

        // Write out the config but don't check if it works
        fs.writeFile(CONFIG_FILENAME, JSON.stringify(config), (err) => {});

        const milestones = await getMilestones(resultsUrl);

        event.reply("latest-milestones", milestones);
      } catch (err) {
        console.log(err);
        // Tell the UI that this went badly
        event.reply(
          "error-fetch",
          "Oops! Something went kind of wrong getting milestones!"
        );
      }
    }
  });

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  await mainWindow.loadFile("index.html");

  mainWindow.webContents.send("update-resultsurl", config.resultsUrl);
};

// Attempt to read a config if one exists
try {
  config = JSON.parse(fs.readFileSync(CONFIG_FILENAME));
} catch (err) {
  config = { resultsUrl: "" };
}

// Wait for the app to be ready before we create a window
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit the app when no windows are open on non-macOS platforms
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
