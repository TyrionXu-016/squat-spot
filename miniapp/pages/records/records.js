const api = require("../../services/api");
const { decorateCheckin } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    tagFilters: [{ name: "全部", active: true }],
    selectedTag: "",
    records: [],
    hasRecords: false,
    detail: null,
    showDetail: false
  },

  onShow() {
    this.loadPage();
  },

  loadPage() {
    this.setData({ loading: true, error: "" });

    Promise.all([
      api.request("/tags"),
      this.loadRecordsRequest(this.data.selectedTag)
    ])
      .then(([tagsPayload, recordsPayload]) => {
        const tags = (tagsPayload.tags || []).map((tag) => tag.name);
        const uniqueTags = ["全部"].concat(tags.filter((tag, index) => tags.indexOf(tag) === index));
        this.setData({
          tagFilters: uniqueTags.map((name) => ({
            name,
            active: name === "全部" ? !this.data.selectedTag : name === this.data.selectedTag
          })),
          records: (recordsPayload.checkins || []).map(decorateCheckin),
          hasRecords: (recordsPayload.checkins || []).length > 0,
          loading: false
        });
      })
      .catch((error) => {
        this.setData({
          loading: false,
          error: error.message || "加载失败"
        });
      });
  },

  loadRecordsRequest(tag) {
    const query = tag ? "?tag=" + encodeURIComponent(tag) : "?range=all";
    return api.request("/checkins" + query);
  },

  selectTag(event) {
    const name = event.currentTarget.dataset.name;
    const selectedTag = name === "全部" ? "" : name;
    this.setData({ selectedTag }, () => this.loadPage());
  },

  openDetail(event) {
    const id = event.currentTarget.dataset.id;
    api.request("/checkins/" + id)
      .then((payload) => {
        this.setData({
          detail: decorateCheckin(payload.checkin),
          showDetail: true
        });
      })
      .catch((error) => {
        wx.showToast({ title: error.message || "加载失败", icon: "none" });
      });
  },

  closeDetail() {
    this.setData({ showDetail: false, detail: null });
  },

  noop() {},

  deleteRecord() {
    if (!this.data.detail) return;
    const id = this.data.detail.id;

    wx.showModal({
      title: "删除记录",
      content: "删除后不会在地图和统计中显示。",
      confirmText: "删除",
      confirmColor: "#e85a52",
      success: (res) => {
        if (!res.confirm) return;

        api.request("/checkins/" + id, { method: "DELETE" })
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.setData({ showDetail: false, detail: null });
            this.loadPage();
          })
          .catch((error) => {
            wx.showToast({ title: error.message || "删除失败", icon: "none" });
          });
      }
    });
  }
});
