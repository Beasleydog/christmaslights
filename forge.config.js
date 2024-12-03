const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");

// Log the resolved path to help debug
const gifPath = path.join(process.cwd(), "install.gif");
console.log("Loading GIF resolved path:", gifPath);
console.log("GIF file exists:", require("fs").existsSync(gifPath));

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, "logo.ico"),
    executableName: "HolidayLights",
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "HolidayLights",
        setupIcon: path.resolve(__dirname, "logo.ico"),
        iconUrl:
          "https://raw.githubusercontent.com/Beasleydog/christmaslights/refs/heads/main/logo.ico",
        loadingGif: gifPath,
        setupExe: "HolidayLights Setup.exe",
        noMsi: true,
      },
    },
  ],
};
