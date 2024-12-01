const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");

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
        iconUrl: `file:///${path
          .resolve(__dirname, "logo.ico")
          .replace(/\\/g, "/")}`,
        setupExe: "HolidayLights Setup.exe",
        noMsi: true,
      },
    },
  ],
};
