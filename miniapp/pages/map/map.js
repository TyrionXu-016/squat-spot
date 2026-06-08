const api = require("../../services/api");
const { decorateCheckin } = require("../../utils/format");

const rangeOptions = [
  { value: "today", label: "今天", active: true },
  { value: "week", label: "本周", active: false },
  { value: "month", label: "本月", active: false },
  { value: "all", label: "全部", active: false }
];

Page({
  data: {
    range: "today",
    rangeOptions,
    loading: true,
    error: "",
    latitude: 39.9042,
    longitude: 116.4074,
    markers: [],
    hasMarkers: false,
    markerRecords: [],
    selected: null
  },

  onShow() {
    this.loadMap();
  },

  selectRange(event) {
    const range = event.currentTarget.dataset.value;
    this.setData({
      range,
      rangeOptions: this.data.rangeOptions.map((item) => ({
        value: item.value,
        label: item.label,
        active: item.value === range
      })),
      selected: null
    }, () => this.loadMap());
  },

  loadMap() {
    this.setData({ loading: true, error: "", selected: null });
    api.request("/checkins/map?range=" + this.data.range)
      .then((payload) => {
        const points = payload.markers || [];
        const markers = points.map((point, index) => ({
          id: index + 1,
          apiId: point.id,
          latitude: point.latitude,
          longitude: point.longitude,
          title: point.title,
          width: 34,
          height: 34,
          callout: {
            content: point.title,
            color: "#126338",
            fontSize: 13,
            borderRadius: 6,
            padding: 6,
            display: "BYCLICK"
          }
        }));
        const markerRecords = points.map((point, index) => Object.assign(
          decorateCheckin({
            id: point.id,
            status: point.status,
            locationMode: point.locationMode,
            checkedAt: point.checkedAt,
            placeName: point.title,
            tags: []
          }),
          {
            markerId: index + 1,
            latitude: point.latitude,
            longitude: point.longitude
          }
        ));

        this.setData({
          markers,
          hasMarkers: markers.length > 0,
          markerRecords,
          latitude: points[0] ? points[0].latitude : 39.9042,
          longitude: points[0] ? points[0].longitude : 116.4074,
          loading: false
        });
      })
      .catch((error) => {
        this.setData({
          loading: false,
          error: error.message || "地图加载失败"
        });
      });
  },

  onMarkerTap(event) {
    const markerId = event.detail.markerId;
    const marker = this.data.markers.find((item) => item.id === markerId);
    if (!marker) return;

    this.loadCheckinDetail(marker.apiId);
  },

  selectRecord(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    this.loadCheckinDetail(id);
  },

  loadCheckinDetail(id) {
    api.request("/checkins/" + id)
      .then((payload) => {
        this.setData({ selected: decorateCheckin(payload.checkin) });
      })
      .catch((error) => {
        wx.showToast({ title: error.message || "加载失败", icon: "none" });
      });
  },

  goCheckin() {
    wx.navigateTo({ url: "/pages/checkin/checkin" });
  }
});
