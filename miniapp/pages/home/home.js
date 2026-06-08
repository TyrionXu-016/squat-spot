const api = require("../../services/api");
const { decorateCheckin, formatTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    summary: {
      totalCount: 0,
      monthCount: 0,
      streakDays: 0,
      favoritePlace: null,
      lastCheckinAt: null
    },
    recentCheckins: [],
    hasRecentCheckins: false
  },

  onShow() {
    this.loadHome();
  },

  loadHome() {
    this.setData({ loading: true, error: "" });

    Promise.all([
      api.request("/stats/summary"),
      api.request("/checkins?range=all")
    ])
      .then(([statsPayload, checkinsPayload]) => {
        const summary = statsPayload.summary || {};
        const recentCheckins = (checkinsPayload.checkins || []).slice(0, 3).map(decorateCheckin);
        this.setData({
          summary: Object.assign({}, summary, {
            lastCheckinText: formatTime(summary.lastCheckinAt)
          }),
          recentCheckins,
          hasRecentCheckins: recentCheckins.length > 0,
          loading: false
        });
      })
      .catch((error) => {
        this.setData({
          error: error.message || "加载失败",
          loading: false
        });
      });
  },

  goCheckin() {
    wx.navigateTo({ url: "/pages/checkin/checkin" });
  },

  goPrivacySettings() {
    wx.navigateTo({ url: "/pages/checkin/checkin?focus=location" });
  },

  goRecords() {
    wx.switchTab({ url: "/pages/records/records" });
  }
});
