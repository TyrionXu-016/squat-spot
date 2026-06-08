const REMOTE_API_BASE_URL = "https://squat.tyrion.space/api";
const LOCAL_API_BASE_URL = "http://127.0.0.1:3000/api";
const USE_LOCAL_API_IN_DEVELOP = false;

function resolveApiBaseUrl() {
  try {
    const account = wx.getAccountInfoSync();
    const envVersion = account && account.miniProgram ? account.miniProgram.envVersion : "develop";

    if (envVersion === "release" || envVersion === "trial") {
      return REMOTE_API_BASE_URL;
    }

    if (envVersion === "develop" && USE_LOCAL_API_IN_DEVELOP) {
      return LOCAL_API_BASE_URL;
    }
  } catch (error) {
    // Keep local development usable if account info is unavailable in tooling.
  }

  return REMOTE_API_BASE_URL;
}

App({
  globalData: {
    apiBaseUrl: resolveApiBaseUrl()
  }
});
