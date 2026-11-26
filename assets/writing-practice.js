// Reframe only repeated source strips on phones. Keep the original image in
// the document for its narration, and for tablet, desktop, print and fallback.
(function () {
  "use strict";

  var ns = "http://www.w3.org/2000/svg";
  var phones = window.matchMedia("screen and (max-width: 599px)");
  // Source-pixel breaks at gaps or joins in the 828px-wide printed patterns.
  // Positive: continue the repeated letters below. Negative: the second half
  // repeats an illustration/stroke motif and is not needed.
  var patternBreaks = {
    15: 413, 16: 422, 17: 418, 18: 413, 19: 412, 21: -417, 22: -407,
    23: 415, 24: 432, 25: 410, 27: -441, 28: 411, 29: -460, 34: -407,
    35: 414, 36: 417, 38: 414, 39: -415, 40: -415, 42: 404, 43: -414,
    47: 416, 48: 407, 49: -416, 50: -419, 59: 416, 62: -407, 67: -421,
    70: -415, 72: 428, 75: -407, 76: -419, 77: 427, 80: -419
  };

  function sampleBreak(img) {
    var name = img.getAttribute("src").split("/").pop();
    if (img.closest(".handwriting-copy-reference")) {
      var model = img.dataset.sourceModel;
      // Allow for wide lowercase glyphs and keep each capital/lowercase pair
      // together. The Aa strip fits six pairs; the other paired strips fit five.
      if (model === "m" || model === "w") return 455;
      if (model.length > 1 && model !== "Aa") return 464;
      return 414;
    }
    var ruled = /^pattern_reference_pg(\d+)\.png$/.exec(name);
    if (ruled) return patternBreaks[Number(ruled[1])];
    // End these strips between the separate strokes, not partway through one.
    var strokeEnds = {
      "pg011_pattern_horizontal.png": 344, "pg011_pattern_vertical.png": 310,
      "pg012_pattern_down_strokes.png": 381, "pg012_pattern_up_strokes.png": 402
    };
    return -(strokeEnds[name] || Math.round(img.naturalWidth / 2));
  }

  function svgElement(tag, attributes) {
    var el = document.createElementNS(ns, tag);
    Object.keys(attributes).forEach(function (key) { el.setAttribute(key, attributes[key]); });
    return el;
  }

  function renderSample(img) {
    if (!phones.matches || !img.naturalWidth || img.closest(".phone-sample")) return;
    var cut = sampleBreak(img);
    if (!cut) return;
    var continued = cut > 0;
    cut = Math.abs(cut);
    var w = img.naturalWidth, h = img.naturalHeight;
    if (cut >= w) return;
    var rowWidth = continued ? Math.max(cut, w - cut) : cut;
    var graphic = svgElement("svg", {
      "class": "phone-sample-view", "aria-hidden": "true", focusable: "false",
      viewBox: "0 0 " + rowWidth + " " + (continued ? 2 * h - 1 : h)
    });

    // Each window uses the same scale. Where the two halves differ in width,
    // continue the original blank ruled margin instead of stretching letters.
    function windowAt(x, y, width, sourceX, sourceWidth) {
      var panel = svgElement("svg", {
        x: x, y: y, width: width, height: h, overflow: "hidden",
        viewBox: [sourceX, 0, sourceWidth, h].join(" "), preserveAspectRatio: "none"
      });
      panel.appendChild(svgElement("image", { href: img.getAttribute("src"), width: w, height: h }));
      graphic.appendChild(panel);
    }
    function row(y, start, width) {
      windowAt(0, y, width, start, width);
      if (width < rowWidth) windowAt(width, y, rowWidth - width, 2, 1);
    }
    row(0, 0, cut);
    if (continued) row(h - 1, cut, w - cut);
    var wrapper = document.createElement("span");
    wrapper.className = "phone-sample";
    img.before(wrapper);
    wrapper.append(img, graphic);
  }

  function prepare() {
    if (!phones.matches) return;
    document.querySelectorAll(
      ".handwriting-copy-reference img, .handwriting-pattern-reference img, " +
      ".pattern-card > figure img[src*='_pattern_'], .pattern-card > figure img[src*='pg014_trace_'], " +
      ".pattern-card > .pattern-model-image"
    ).forEach(function (img) {
      if (img.complete) renderSample(img);
      else img.addEventListener("load", function () { renderSample(img); }, { once: true });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepare, { once: true });
  else prepare();
  phones.addEventListener("change", prepare);
})();

(function () {
  "use strict";

  function storageKey(id) {
    return "adt-writing-standard-1:" + location.pathname + ":" + id;
  }

  function readStored(id) {
    try {
      return window.localStorage.getItem(storageKey(id));
    } catch (_error) {
      return null;
    }
  }

  function writeStored(id, value) {
    try {
      window.localStorage.setItem(storageKey(id), value);
    } catch (_error) {
      // Practice controls remain usable when storage is unavailable or full.
    }
  }

  function removeStored(id) {
    try {
      window.localStorage.removeItem(storageKey(id));
    } catch (_error) {
      // Clearing the visible canvas is still useful without persistent storage.
    }
  }

  function updateCanvasResponse(canvas, hasDrawing) {
    var response = document.querySelector(
      '[data-canvas-response="' + canvas.id + '"]'
    );
    if (!response) return;
    var complete = hasDrawing;
    var nextValue = complete ? "Response completed" : "";
    if (response.value !== nextValue) {
      response.value = nextValue;
      response.dispatchEvent(new Event("input", { bubbles: true }));
      response.dispatchEvent(new Event("change", { bubbles: true }));
    }
    response.classList.toggle("is-complete", complete);
  }

  function canvasPoint(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  var phoneWriting = window.matchMedia("(max-width: 599px)");

  // Other dotted rows have a clear gutter at exactly 50%. These are the
  // measured breaks in the source PNGs where that would cut a printed stroke.
  var traceFoldPercent = {
    a_02: 50.1, d_02: 49.4, f_02: 52.6, g_02: 48.9, j_01: 48.6,
    k_01: 49.4, k_02: 50.4, n_01: 48.5, n_02: 50.8, o_02: 48.6,
    p_02: 51.5, r_02: 47.9, s_02: 51.5, v_02: 50.6, z_02: 49.6,
    A_02: 49.6, D_02: 47.8, E_02: 51.5, L_02: 47.1, M_02: 42.9,
    Q_02: 48.5, T_02: 51.1, U_01: 51.5, V_02: 50.6, W_02: 50.4,
    X_02: 53.8,
  };

  function initialiseCanvas(canvas) {
    var context = canvas.getContext("2d");
    var id = canvas.getAttribute("data-practice-storage") || canvas.id;
    var pointer = null;
    var clip = null;
    var continuation = null;
    var fold = 0.5;
    var strokeMade = false;
    var cleared = false;
    var savedNewStroke = false;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#172033";

    var stored = readStored(id);
    canvas.dataset.hasDrawing = stored ? "true" : "false";
    if (stored) {
      var image = new Image();
      image.addEventListener("load", function () {
        if (cleared) return;
        context.save();
        context.globalCompositeOperation = "destination-over";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        context.restore();
        refreshContinuation();
        if (savedNewStroke) writeStored(id, canvas.toDataURL("image/png"));
      });
      image.src = stored;
    }
    updateCanvasResponse(canvas, Boolean(stored));

    function refreshContinuation() {
      if (continuation && phoneWriting.matches) {
        continuation.getContext("2d").drawImage(canvas, 0, 0);
      }
    }

    function bindSurface(surface) {
      surface.addEventListener("pointerdown", function (event) {
        if (pointer !== null) return;
        event.preventDefault();
        pointer = event.pointerId;
        strokeMade = false;
        surface.setPointerCapture(pointer);
        var point = canvasPoint(surface, event);
        // Pointer capture can take the pen beyond a visible row. Don't let
        // ink from that gesture leak over the fold into the other row.
        if (continuation && phoneWriting.matches) {
          var boundary = canvas.width * fold;
          clip = new Path2D();
          if (surface === canvas) clip.rect(0, 0, boundary, canvas.height);
          else clip.rect(boundary, 0, canvas.width - boundary, canvas.height);
        }
        context.beginPath();
        context.moveTo(point.x, point.y);
      });

      surface.addEventListener("pointermove", function (event) {
        if (event.pointerId !== pointer) return;
        event.preventDefault();
        var point = canvasPoint(surface, event);
        context.lineTo(point.x, point.y);
        context.save();
        if (clip) context.clip(clip);
        context.stroke();
        context.restore();
        refreshContinuation();
        strokeMade = true;
      });

      function finishDrawing(event) {
        if (event.pointerId !== pointer) return;
        pointer = null;
        clip = null;
        if (surface.hasPointerCapture(event.pointerId)) {
          surface.releasePointerCapture(event.pointerId);
        }
        if (strokeMade) {
          savedNewStroke = true;
          canvas.dataset.hasDrawing = "true";
          writeStored(id, canvas.toDataURL("image/png"));
          updateCanvasResponse(canvas, true);
        }
      }

      surface.addEventListener("pointerup", finishDrawing);
      surface.addEventListener("pointercancel", finishDrawing);
      surface.addEventListener("lostpointercapture", finishDrawing);
    }

    bindSurface(canvas);

    function showContinuation() {
      if (!phoneWriting.matches) return;
      if (!continuation) {
        // Two windows onto the same original bitmap. Ink, Clear, completion
        // and saved responses remain one answer, including on wider screens.
        var first = canvas.parentElement;
        var second = first.cloneNode(false);
        var model = first.querySelector(".trace-row-model-image");
        if (model) {
          var match = /trace_(?:lower|upper)_([a-z]_\d+)\.png$/i.exec(model.src);
          if (match && traceFoldPercent[match[1]]) fold = traceFoldPercent[match[1]] / 100;
          second.appendChild(model.cloneNode(false));
        }
        continuation = document.createElement("canvas");
        continuation.className = canvas.className;
        continuation.width = canvas.width;
        continuation.height = canvas.height;
        continuation.tabIndex = canvas.tabIndex;
        continuation.setAttribute("role", "img");
        continuation.setAttribute("aria-labelledby", canvas.getAttribute("aria-labelledby"));
        continuation.setAttribute("aria-description", "Continuation of the writing line.");
        continuation.getContext("2d").globalCompositeOperation = "copy";
        second.appendChild(continuation);
        first.classList.add("phone-writing-first");
        second.classList.add("phone-writing-rest");
        first.style.setProperty("--writing-strip-width", (100 / fold) + "%");
        second.style.setProperty("--writing-strip-width", (100 / (1 - fold)) + "%");
        first.after(second);
        bindSurface(continuation);
      }
      refreshContinuation();
    }

    var task = document.querySelector('[data-canvas-drawing="' + canvas.id + '"]');
    if (canvas.classList.contains("handwriting-canvas") && task &&
        /^letter-(copy|tracing|pattern)$/.test(task.dataset.accessibleTaskType)) {
      showContinuation();
      phoneWriting.addEventListener("change", showContinuation);
    }

    var clearButton = document.querySelector('[data-clear-canvas="' + canvas.id + '"]');
    if (clearButton) {
      clearButton.addEventListener("click", function () {
        cleared = true;
        context.clearRect(0, 0, canvas.width, canvas.height);
        refreshContinuation();
        canvas.dataset.hasDrawing = "false";
        removeStored(id);
        updateCanvasResponse(canvas, false);
        canvas.focus();
      });
    }

  }

  function initialise() {
    document.querySelectorAll("canvas.drawing-canvas").forEach(initialiseCanvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
