const privacy = require("../../utils/privacy");

function decorateOptions(currentMode) {
  return privacy.locationModeOptions.map((option) => ({
    value: option.value,
    title: option.title,
    desc: option.desc,
    active: option.value === currentMode
  }));
}

Page({
  data: {
    currentMode: "none",
    currentSummary: "默认不记录位置",
    options: decorateOptions("none")
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const currentMode = privacy.getDefaultLocationMode();
    this.setData({
      currentMode,
      currentSummary: privacy.getLocationModeSummary(currentMode),
      options: decorateOptions(currentMode)
    });
  },

  selectMode(event) {
    const mode = event.currentTarget.dataset.value;
    privacy.setDefaultLocationMode(mode);
    this.refresh();
    wx.showToast({ title: "已保存", icon: "success" });
  }
});
