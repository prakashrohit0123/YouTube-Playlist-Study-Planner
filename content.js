console.log("YT Playlist Calculator loaded");

/* =========================
   TIME HELPERS
   ========================= */

function timeToSeconds(timeStr) {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function secondsToTime(seconds) {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  let res = "";
  if (days > 0) res += `${days} day${days > 1 ? "s" : ""} `;
  if (hours > 0 || days > 0) res += `${hours}h `;
  res += `${minutes}m ${secs}s`;

  return res.trim();
}

/* =========================
   AUTO SCROLL PLAYLIST
   ========================= */

async function autoScroll() {
  return new Promise(resolve => {
    let lastHeight = 0;
    const timer = setInterval(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const newHeight = document.documentElement.scrollHeight;

      if (newHeight === lastHeight) {
        clearInterval(timer);
        resolve();
      }
      lastHeight = newHeight;
    }, 800);
  });
}

/* =========================
   EXTRACT VIDEO DATA
   ========================= */

function getAllVideos() {
  const videoElements = document.querySelectorAll(
    "ytd-playlist-video-renderer"
  );

  const videos = [];

  videoElements.forEach((el, idx) => {
    const titleEl = el.querySelector("#video-title");
    const timeEl = el.querySelector(
      "span.ytd-thumbnail-overlay-time-status-renderer"
    );

    if (!titleEl || !timeEl) return;

    const title = titleEl.innerText.trim();
    const timeText = timeEl.innerText.trim();

    if (!timeText.includes(":")) return;

    videos.push({
      index: idx + 1,
      title,
      duration: timeToSeconds(timeText)
    });
  });

  return videos;
}

/* =========================
   CORE: RANGE CALCULATION
   ========================= */

async function calculatePlaylistRange(from, to) {
  await autoScroll();

  let videos = getAllVideos();

  if (from !== null && to !== null) {
    videos = videos.slice(from - 1, to);
  }

  const totalSeconds = videos.reduce((sum, v) => sum + v.duration, 0);

  return {
    totalSeconds,
    formatted: secondsToTime(totalSeconds),
    speeds: {
      "1x": secondsToTime(totalSeconds),
      "1.25x": secondsToTime(Math.floor(totalSeconds / 1.25)),
      "1.5x": secondsToTime(Math.floor(totalSeconds / 1.5)),
      "1.75x": secondsToTime(Math.floor(totalSeconds / 1.75)),
      "2x": secondsToTime(Math.floor(totalSeconds / 2))
    },
    totalVideos: videos.length
  };
}

/* =========================
   CORE: DAILY SCHEDULE
   ========================= */

async function calculateWithSchedule(from, to, dailyHours) {
  await autoScroll();

  let videos = getAllVideos();

  if (from !== null && to !== null) {
    videos = videos.slice(from - 1, to);
  }

  const dailyLimit = dailyHours * 3600;
  const schedule = [];

  let currentDay = [];
  let currentTime = 0;

  videos.forEach(video => {
    if (currentTime + video.duration > dailyLimit && currentDay.length > 0) {
      schedule.push(currentDay);
      currentDay = [];
      currentTime = 0;
    }

    currentDay.push(video);
    currentTime += video.duration;
  });

  if (currentDay.length > 0) {
    schedule.push(currentDay);
  }

  return {
    schedule
  };
}

/* =========================
   MESSAGE LISTENER
   ========================= */

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "CALCULATE_WITH_RANGE") {
    calculatePlaylistRange(req.from, req.to).then(res => sendResponse(res));
    return true;
  }

  if (req.type === "CALCULATE_WITH_SCHEDULE") {
    calculateWithSchedule(req.from, req.to, req.dailyHours)
      .then(res => sendResponse(res));
    return true;
  }
});
