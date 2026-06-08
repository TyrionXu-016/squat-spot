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
  { value: "fuzzy", title: "模糊位置", desc: "显示大致区域" },
  { value: "precise", title: "精确位置", desc: "显示具体地点" }
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
    placeName: "家里",
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
    this.setData({
      locationMode: mode,
      placeName: mode === "none" ? "家里" : this.data.placeName || "望京"
    });
  },

  submit() {
    if (this.data.saving) return;
    const locationMode = this.data.locationMode;
    const payload = {
      status: this.data.status,
      tags: this.data.selectedTags,
      note: this.data.note,
      locationMode,
      placeName: this.data.placeName
    };

    if (locationMode !== "none") {
      payload.lat = 39.904211;
      payload.lng = 116.407395;
      payload.placeName = locationMode === "fuzzy" ? "望京" : "望京 SOHO";
    }

    this.setData({ saving: true });
    api.request("/checkins", {
      method: "POST",
      data: payload
    })
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
