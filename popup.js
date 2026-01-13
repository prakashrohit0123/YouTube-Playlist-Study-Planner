let cachedResult = null;
let cachedTotalSeconds = 0;

const loader = document.getElementById("loader");
const statusText = document.getElementById("statusText");
const bigTime = document.getElementById("bigTime");
const speedLabel = document.getElementById("speedLabel");
const speedSelect = document.getElementById("speedSelect");

/* =========================
   BIG TIME UPDATE
   ========================= */

function updateBigTime() {
  if (!cachedResult) return;

  const speed = speedSelect.value;
  bigTime.innerText = cachedResult.speeds[speed];
  speedLabel.innerText = `Playback speed: ${speed}`;
}

/* =========================
   CALCULATE PLAYLIST
   ========================= */

document.getElementById("calcBtn").addEventListener("click", () => {
  const fromVal = document.getElementById("fromVideo").value;
  const toVal = document.getElementById("toVideo").value;

  let from = null, to = null;

  if (fromVal && toVal) {
    from = parseInt(fromVal);
    to = parseInt(toVal);
    if (from <= 0 || to <= 0 || from > to) {
      statusText.innerText = "⚠️ Invalid video range";
      return;
    }
  }

  loader.classList.add("loading");
  statusText.innerText = "Calculating...";
  bigTime.innerText = "—";
  speedLabel.innerText = "";
  document.getElementById("days").innerHTML = "";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "CALCULATE_WITH_RANGE", from, to },
      res => {
        loader.classList.remove("loading");

        if (chrome.runtime.lastError || !res) {
          statusText.innerText = "❌ Open a YouTube playlist";
          return;
        }

        cachedResult = res;
        cachedTotalSeconds = res.totalSeconds;

        statusText.innerText = `✅ Calculated (${res.totalVideos} videos)`;
        updateBigTime();
      }
    );
  });
});

/* =========================
   SPEED CHANGE
   ========================= */

speedSelect.addEventListener("change", updateBigTime);

/* =========================
   DAILY WATCH SCHEDULE
   ========================= */

document.getElementById("dayCalcBtn").addEventListener("click", () => {
  const hoursInput = document.getElementById("dailyHours");
  const daysEl = document.getElementById("days");

  const fromVal = document.getElementById("fromVideo").value;
  const toVal = document.getElementById("toVideo").value;

  if (!hoursInput.value || parseFloat(hoursInput.value) <= 0) {
    daysEl.innerText = "⚠️ Enter valid daily hours";
    return;
  }

  const dailyHours = parseFloat(hoursInput.value);

  let from = null, to = null;
  if (fromVal && toVal) {
    from = parseInt(fromVal);
    to = parseInt(toVal);
  }

  daysEl.innerText = "⏳ Creating daily schedule...";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {
        type: "CALCULATE_WITH_SCHEDULE",
        from,
        to,
        dailyHours
      },
      res => {
        if (chrome.runtime.lastError || !res) {
          daysEl.innerText = "❌ Unable to generate schedule";
          return;
        }

        renderSchedule(res.schedule, daysEl);
      }
    );
  });
});

/* =========================
   RENDER DAILY SCHEDULE
   ========================= */

function renderSchedule(schedule, container) {
  container.innerHTML = "";

  schedule.forEach((dayVideos, index) => {
    const totalSeconds = dayVideos.reduce((s, v) => s + v.duration, 0);
    const hours = (totalSeconds / 3600).toFixed(2);

    const card = document.createElement("div");
    card.className = "day-card";

    const header = document.createElement("div");
    header.className = "day-header";

    const title = document.createElement("span");
    title.innerText = `Day ${index + 1} | ${hours} hrs | ${dayVideos.length} videos`;

    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.innerText = "▶";

    header.appendChild(title);
    header.appendChild(arrow);

    const body = document.createElement("div");
    body.className = "day-body";

    dayVideos.forEach(video => {
      const videoCard = document.createElement("div");
      videoCard.className = "video-card";

      const indexSpan = document.createElement("span");
      indexSpan.className = "video-index";
      indexSpan.innerText = `#${video.index}`;

      const titleSpan = document.createElement("span");
      titleSpan.innerText = ` – ${video.title}`;

      videoCard.appendChild(indexSpan);
      videoCard.appendChild(titleSpan);
      body.appendChild(videoCard);
    });

    header.addEventListener("click", () => {
      const open = body.style.display === "block";
      body.style.display = open ? "none" : "block";
      arrow.innerText = open ? "▶" : "▼";
    });

    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });
}
