const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  fetchMilestones: (resultsUrl) =>
    ipcRenderer.send("fetch-milestones", resultsUrl),
  onFetchError: (callback) => ipcRenderer.on("error-fetch", callback),
  onMilestones: (callback) => ipcRenderer.on("latest-milestones", callback),
  onUpdateResultsUrl: (callback) =>
    ipcRenderer.on("update-resultsurl", callback),
});

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});

ipcRenderer.on("asynchronous-reply", (event, arg) => {
  console.log(arg); // prints "pong"
});
