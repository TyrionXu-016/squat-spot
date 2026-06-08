const api = require("../../services/api");
const privacy = require("../../utils/privacy");

const statusOptions = [
  { value: "smooth", label: "顺畅" },
  { value: "normal", label: "一般" },
  { value: "hard", label: "艰难" }
];

const tagNames = ["家里", "公司", "咖啡后", "火锅后", "旅行中"];

const locationOptions = [
  { value: "none", title: "不记录位置", desc: "仅记录时间和标签" },
  { value: "fuzzy", title: "模糊位置", desc: "提交时获取当前位置，并只保存大致区域" },
  { value: "precise", title: "精确位置", desc: "提交时获取当前位置，并保存具体点位" }
];

Page({
  data: {
    statusOptions,
    tagOptions: tagNames.map((name) => ({ name, active: name === "家里" })),
    locationOptions,
    status: "smooth",
    selectedTags: ["家里"],
    note: "",
    noteCount: 0,
    locationMode: "none",
    saving: false
  },

  onLoad() {
    this.applyLocationMode(privacy.getDefaultLocationMode());
  },

  selectStatus(event) {
    this.setData({ status: event.currentTarget.dataset.value });
  },

  toggleTag(event) {
    const tag = event.currentTarget.dataset.tag;
    const selected = this.data.selectedTags.slice();
    const index = selected.indexOf(tag);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(tag);
    }
    this.setData({
      selectedTags: selected,
      tagOptions: tagNames.map((name) => ({
        name,
        active: selected.indexOf(name) >= 0
      }))
    });
  },

  onNoteInput(event) {
    this.setData({
      note: event.detail.value,
      noteCount: event.detail.value.length
    });
  },

  selectLocationMode(event) {
    this.applyLocationMode(event.currentTarget.dataset.value);
  },

  applyLocationMode(mode) {
    this.setData({ locationMode: mode });
  },

  resolvePlaceName(locationMode) {
    if (locationMode === "fuzzy") return "附近位置";
    if (locationMode === "precise") return "当前位置";
    if (this.data.selectedTags.indexOf("家里") >= 0) return "家里";
    if (this.data.selectedTags.indexOf("公司") >= 0) return "公司";
    return null;
  },

  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: "gcj02",
        success: resolve,
        fail: reject
      });
    });
  },

  buildPayload() {
    const locationMode = this.data.locationMode;
    const payload = {
      status: this.data.status,
      tags: this.data.selectedTags,
      note: this.data.note,
      locationMode,
      placeName: this.resolvePlaceName(locationMode)
    };

    if (locationMode === "none") {
      return Promise.resolve(payload);
    }

    return this.getCurrentLocation()
      .then((location) => Object.assign(payload, {
        lat: location.latitude,
        lng: location.longitude
      }))
      .catch(() => {
        throw new Error("获取位置失败，请允许位置权限或选择不记录位置");
      });
  },

  submit() {
    if (this.data.saving) return;

    this.setData({ saving: true });
    this.buildPayload()
      .then((payload) => api.request("/checkins", {
        method: "POST",
        data: payload
      }))
      .then(() => {
        wx.showToast({ title: "打卡成功", icon: "success" });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/home/home" });
        }, 450);
      })
      .catch((error) => {
        wx.showToast({ title: error.message || "提交失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ saving: false });
      });
  }
});
