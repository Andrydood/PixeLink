const { app, BrowserWindow } = require("electron");
const serve = require("electron-serve");
const path = require("path");
const {startServer} = require('../server');

const appServe = app.isPackaged ? serve({
  directory: path.join(__dirname, "../out")
}) : null;

const createWindow = () => {

  const win = new BrowserWindow({
    width: 500,
    height: 220,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    },
    // resizable: false
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver', 1);

  if (app.isPackaged) {
    appServe(win).then(() => {
      win.loadURL("app://-");
    });
  } else {
    win.loadURL("http://localhost:3000/");
    win.webContents.on("did-fail-load", (e, code, desc) => {
      win.webContents.reloadIgnoringCache();
    });
  }
}

app.on("ready", () => {
  startServer().then(() => {
    createWindow();
  });
});

app.on("window-all-closed", () => {
    if(process.platform !== "darwin"){
        app.quit();
    }
});