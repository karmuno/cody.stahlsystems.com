/* Progressive enhancement over a native <audio preload="none">.
   With JS off, the <noscript> copy renders native controls instead — the page
   is complete without this file. See docs/TECH-SPEC.md §9.

   Seeking has to work before anything is loaded. preload="none" means the
   browser does not know the duration yet, so the scrubber is driven by the
   duration printed from frontmatter until real metadata arrives, and a seek
   made before load is held and applied on loadedmetadata. */

(function () {
  "use strict";

  function fmt(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function parseClock(text) {
    var m = /(\d+):(\d{2})/.exec(text || "");
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
  }

  document.querySelectorAll(".player").forEach(function (wrap) {
    var audio = wrap.querySelector("audio");
    var note = wrap.querySelector(".player-note");
    if (!audio || !note) return;

    var title = wrap.getAttribute("data-title") || "recording";
    var declared = parseClock(note.textContent);
    var pendingSeek = null;
    var dragging = false;

    function duration() {
      return isFinite(audio.duration) && audio.duration > 0 ? audio.duration : declared;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "play";
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Play";
    button.setAttribute("aria-label", "Play " + title + " demo recording");

    var bar = document.createElement("div");
    bar.className = "bar";
    bar.setAttribute("role", "slider");
    bar.setAttribute("tabindex", "0");
    bar.setAttribute("aria-label", "Seek within " + title + " demo recording");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", String(declared || 100));
    bar.setAttribute("aria-valuenow", "0");
    bar.setAttribute("aria-valuetext", "0:00 of " + fmt(declared));
    var fill = document.createElement("span");
    bar.appendChild(fill);

    var time = document.createElement("span");
    time.className = "time";
    time.textContent = "0:00 / " + fmt(declared);

    /* The elapsed/total readout and the "Demo recording" label are one unit:
       grouping them keeps them on a shared baseline and stops the label from
       wrapping away from the clock on narrow screens. */
    var meta = document.createElement("span");
    meta.className = "player-meta";
    meta.appendChild(time);
    note.textContent = "Demo recording";

    wrap.insertBefore(button, note);
    wrap.insertBefore(bar, note);
    wrap.insertBefore(meta, note);
    meta.appendChild(note);

    function paint(seconds) {
      var d = duration() || 1;
      var pct = Math.max(0, Math.min(1, seconds / d)) * 100;
      fill.style.width = pct + "%";
      time.textContent = fmt(seconds) + " / " + fmt(duration());
      bar.setAttribute("aria-valuemax", String(Math.round(duration())));
      bar.setAttribute("aria-valuenow", String(Math.round(seconds)));
      bar.setAttribute("aria-valuetext", fmt(seconds) + " of " + fmt(duration()));
    }

    function setPlaying(playing) {
      button.textContent = playing ? "Pause" : "Play";
      button.setAttribute("aria-pressed", playing ? "true" : "false");
      button.setAttribute(
        "aria-label",
        (playing ? "Pause " : "Play ") + title + " demo recording"
      );
    }

    /* Seek to an absolute time. If metadata has not loaded there is nothing to
       seek within yet, so hold the target, ask for metadata only (not the whole
       file, and without starting playback), and apply it on arrival. */
    function seek(seconds) {
      var d = duration();
      seconds = Math.max(0, Math.min(d, seconds));
      paint(seconds);
      if (isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = seconds;
      } else {
        pendingSeek = seconds;
        if (audio.preload === "none") {
          audio.preload = "metadata";
          audio.load();
        }
      }
    }

    audio.addEventListener("loadedmetadata", function () {
      if (pendingSeek !== null) {
        audio.currentTime = pendingSeek;
        pendingSeek = null;
      }
      paint(audio.currentTime);
    });

    button.addEventListener("click", function () {
      if (audio.paused) { audio.play(); } else { audio.pause(); }
    });

    audio.addEventListener("play", function () { setPlaying(true); });
    audio.addEventListener("pause", function () { setPlaying(false); });
    audio.addEventListener("ended", function () { setPlaying(false); paint(0); });
    audio.addEventListener("timeupdate", function () {
      if (!dragging) paint(audio.currentTime);
    });

    function timeFromEvent(e) {
      var box = bar.getBoundingClientRect();
      return ((e.clientX - box.left) / box.width) * duration();
    }

    /* Pointer events give click, drag and touch in one path. */
    bar.addEventListener("pointerdown", function (e) {
      dragging = true;
      // Capture keeps the drag alive when the pointer leaves the 24px box, but
      // it throws if the pointer is not active. Never let that abort the seek.
      try { bar.setPointerCapture(e.pointerId); } catch (err) { /* drag without capture */ }
      paint(Math.max(0, Math.min(duration(), timeFromEvent(e))));
      e.preventDefault();
    });

    bar.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      paint(Math.max(0, Math.min(duration(), timeFromEvent(e))));
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { bar.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      seek(timeFromEvent(e));
    }
    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", function () { dragging = false; });

    bar.addEventListener("keydown", function (e) {
      var d = duration();
      var at = isFinite(audio.currentTime) ? audio.currentTime : 0;
      var handled = true;
      switch (e.key) {
        case "ArrowRight": seek(at + 5); break;
        case "ArrowLeft":  seek(at - 5); break;
        case "PageUp":     seek(at + 30); break;
        case "PageDown":   seek(at - 30); break;
        case "Home":       seek(0); break;
        case "End":        seek(d - 1); break;
        case " ":
        case "Enter":
          if (audio.paused) { audio.play(); } else { audio.pause(); }
          break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });
  });
})();
