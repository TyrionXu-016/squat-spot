const DEFAULT_LOCATION_MODE_KEY = "defaultLocationMode";

const locationModeOptions = [
  {
    value: "none",
    title: "不记录位置",
    desc: "只保存时间、状态和备注",
    summary: "默认不记录位置"
  },
  {
    value: "fuzzy",
    title: "模糊位置",
    desc: "保存大致区域，用于地图足迹",
    summary: "默认记录模糊位置"
  },
  {
    value: "precise",
    title: "精确位置",
    desc: "保存经纬度，用于精确点位",
    summary: "默认记录精确位置"
  }
];

function isValidLocationMode(mode) {
  return locationModeOptions.some((option) => option.value === mode);
}

function getDefaultLocationMode() {
  const mode = wx.getStorageSync(DEFAULT_LOCATION_MODE_KEY);
  return isValidLocationMode(mode) ? mode : "none";
}

function setDefaultLocationMode(mode) {
  if (!isValidLocationMode(mode)) return;
  wx.setStorageSync(DEFAULT_LOCATION_MODE_KEY, mode);
}

function getLocationModeSummary(mode) {
  const option = locationModeOptions.find((item) => item.value === mode);
  return option ? option.summary : locationModeOptions[0].summary;
}

module.exports = {
  locationModeOptions,
  getDefaultLocationMode,
  setDefaultLocationMode,
  getLocationModeSummary
};
