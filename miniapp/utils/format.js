const statusText = {
  smooth: "顺畅",
  normal: "一般",
  hard: "艰难"
};

const statusClass = {
  smooth: "status-smooth",
  normal: "status-normal",
  hard: "status-hard"
};

const locationText = {
  none: "不记录位置",
  fuzzy: "模糊位置",
  precise: "精确位置"
};

function pad(value) {
  return value < 10 ? "0" + value : "" + value;
}

function formatTime(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  return pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function formatDateTime(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  return (date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function decorateCheckin(item) {
  return Object.assign({}, item, {
    statusText: statusText[item.status] || item.status,
    statusClass: statusClass[item.status] || "status-smooth",
    locationText: locationText[item.locationMode] || item.locationMode,
    timeText: formatTime(item.checkedAt),
    dateTimeText: formatDateTime(item.checkedAt),
    tagText: item.tags && item.tags.length ? item.tags.join(" / ") : "未添加标签"
  });
}

module.exports = {
  statusText,
  statusClass,
  locationText,
  formatTime,
  formatDateTime,
  decorateCheckin
};
