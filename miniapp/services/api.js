const app = getApp();

let loginPromise = null;

function getBaseUrl() {
  return app.globalData.apiBaseUrl;
}

function getToken() {
  return wx.getStorageSync("authToken");
}

function setToken(token) {
  wx.setStorageSync("authToken", token);
}

function request(path, options) {
  const method = options && options.method ? options.method : "GET";
  const data = options && options.data ? options.data : undefined;
  const auth = !options || options.auth !== false;
  const headers = {
    "content-type": "application/json"
  };
  const token = getToken();

  if (auth && token) {
    headers.authorization = "Bearer " + token;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: getBaseUrl() + path,
      method,
      data,
      header: headers,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data || {});
          return;
        }

        reject({
          statusCode: res.statusCode,
          data: res.data || {},
          message: res.data && res.data.message ? res.data.message : "请求失败"
        });
      },
      fail(error) {
        reject({
          statusCode: 0,
          data: error,
          message: "无法连接 API"
        });
      }
    });
  });
}

function wxLoginCode() {
  return new Promise((resolve) => {
    wx.login({
      success(res) {
        resolve(res.code || "dev-code");
      },
      fail() {
        resolve("dev-code");
      }
    });
  });
}

function login() {
  if (loginPromise) return loginPromise;

  loginPromise = wxLoginCode()
    .then((code) => request("/auth/wechat-login", {
      method: "POST",
      auth: false,
      data: { code }
    }))
    .then((payload) => {
      setToken(payload.token);
      wx.setStorageSync("currentUser", payload.user);
      return payload;
    })
    .finally(() => {
      loginPromise = null;
    });

  return loginPromise;
}

function ensureLogin() {
  if (getToken()) return Promise.resolve(getToken());
  return login().then((payload) => payload.token);
}

function authedRequest(path, options) {
  return ensureLogin().then(() => request(path, options));
}

module.exports = {
  login,
  ensureLogin,
  request: authedRequest,
  rawRequest: request
};
