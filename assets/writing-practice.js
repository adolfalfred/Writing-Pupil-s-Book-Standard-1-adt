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

  function controlValue(control) {
    return control.isContentEditable ? control.textContent || "" : control.value;
  }

  function setControlValue(control, value) {
    if (control.isContentEditable) {
      control.textContent = value;
    } else {
      control.value = value;
    }
  }

  function initialiseTextControl(control) {
    var id = control.getAttribute("data-practice-storage");
    if (!id) return;
    var stored = readStored(id);
    if (stored !== null) setControlValue(control, stored);
    control.addEventListener("input", function () {
      writeStored(id, controlValue(control));
    });
  }

  function alternativeValue(canvas) {
    var alternative = document.querySelector(
      '[data-canvas-alternative="' + canvas.id + '"]'
    );
    return alternative ? controlValue(alternative).trim() : "";
  }

  function updateCanvasResponse(canvas, hasDrawing) {
    var response = document.querySelector(
      '[data-canvas-response="' + canvas.id + '"]'
    );
    if (!response) return;
    var complete = hasDrawing || alternativeValue(canvas) !== "";
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

  function initialiseCanvas(canvas) {
    var context = canvas.getContext("2d");
    var id = canvas.getAttribute("data-practice-storage") || canvas.id;
    var drawing = false;
    var strokeMade = false;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#172033";

    var stored = readStored(id);
    canvas.dataset.hasDrawing = stored ? "true" : "false";
    if (stored) {
      var image = new Image();
      image.addEventListener("load", function () {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      });
      image.src = stored;
    }
    updateCanvasResponse(canvas, Boolean(stored));

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      drawing = true;
      strokeMade = false;
      canvas.setPointerCapture(event.pointerId);
      var point = canvasPoint(canvas, event);
      context.beginPath();
      context.moveTo(point.x, point.y);
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!drawing) return;
      event.preventDefault();
      var point = canvasPoint(canvas, event);
      context.lineTo(point.x, point.y);
      context.stroke();
      strokeMade = true;
    });

    function finishDrawing(event) {
      if (!drawing) return;
      drawing = false;
      if (event && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (strokeMade) {
        canvas.dataset.hasDrawing = "true";
        writeStored(id, canvas.toDataURL("image/png"));
        updateCanvasResponse(canvas, true);
      }
    }

    canvas.addEventListener("pointerup", finishDrawing);
    canvas.addEventListener("pointercancel", finishDrawing);

    var clearButton = document.querySelector('[data-clear-canvas="' + canvas.id + '"]');
    if (clearButton) {
      clearButton.addEventListener("click", function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.dataset.hasDrawing = "false";
        removeStored(id);
        updateCanvasResponse(canvas, false);
        canvas.focus();
      });
    }

    var alternative = document.querySelector(
      '[data-canvas-alternative="' + canvas.id + '"]'
    );
    if (alternative) {
      alternative.addEventListener("input", function () {
        updateCanvasResponse(canvas, canvas.dataset.hasDrawing === "true");
      });
    }
  }

  function initialiseHandwritingModel(model) {
    /*
     * Keep the curriculum-correct vertical size at every breakpoint. SVG
     * adjusts only the gaps between repeated examples so all models remain
     * visible on narrow screens without flattening the letter shapes.
     */
    model.setAttribute("textLength", "94%");
    model.setAttribute("lengthAdjust", "spacing");
  }

  function initialise() {
    document
      .querySelectorAll(".handwriting-model-svg text")
      .forEach(initialiseHandwritingModel);
    document
      .querySelectorAll(
        'input[data-practice-storage], textarea[data-practice-storage], [contenteditable="true"][data-practice-storage]'
      )
      .forEach(initialiseTextControl);
    document.querySelectorAll("canvas.drawing-canvas").forEach(initialiseCanvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
