function resolveApiBaseUrl() {
  try {
    const account = wx.getAccountInfoSync();
    const envVersion = account && account.miniProgram ? account.miniProgram.envVersion : "develop";

    if (envVersion === "release" || envVersion === "trial") {
      return "https://squat-spot.vercel.app/api";
    }
  } catch (error) {
    // Keep local development usable if account info is unavailable in tooling.
  }

  return "http://127.0.0.1:3000/api";
}

App({
  globalData: {
    apiBaseUrl: resolveApiBaseUrl()
  }
});
