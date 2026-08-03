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

  function initialiseTextControl(control) {
    var id = control.getAttribute("data-practice-storage");
    if (!id) return;
    var stored = readStored(id);
    if (stored !== null) control.value = stored;
    control.addEventListener("input", function () {
      writeStored(id, control.value);
    });
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

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#172033";

    var stored = readStored(id);
    if (stored) {
      var image = new Image();
      image.addEventListener("load", function () {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      });
      image.src = stored;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      drawing = true;
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
    });

    function finishDrawing(event) {
      if (!drawing) return;
      drawing = false;
      if (event && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      writeStored(id, canvas.toDataURL("image/png"));
    }

    canvas.addEventListener("pointerup", finishDrawing);
    canvas.addEventListener("pointercancel", finishDrawing);

    var clearButton = document.querySelector('[data-clear-canvas="' + canvas.id + '"]');
    if (clearButton) {
      clearButton.addEventListener("click", function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
        removeStored(id);
        canvas.focus();
      });
    }
  }

  function initialise() {
    document
      .querySelectorAll('input[data-practice-storage], textarea[data-practice-storage]')
      .forEach(initialiseTextControl);
    document.querySelectorAll("canvas.drawing-canvas").forEach(initialiseCanvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
