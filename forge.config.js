const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "./logo.ico",
    executableName: "HolidayLights",
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "HolidayLights",
        setupIcon: "./logo.ico",
        iconUrl: `file://${__dirname}/logo.ico`,
        loadingGif: "./installing.gif",
        setupExe: "HolidayLights Setup.exe",
        noMsi: true,
      },
    },
  ],
};
