import { drawGridAndLine } from './canvas.js';

export function setupPrintValidation() {
  window.addEventListener("beforeprint", () => {
    const dateInput = document.getElementById("date");
    if (!dateInput.value) {
      dateInput.type = "text";
      dateInput.value = "";
    }

    const requiredFields = document.querySelectorAll(
      "input[required], select[required]"
    );
    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        let label = document.querySelector(`label[for="${field.id}"]`);
        if (label) label.classList.add("print-warning-highlight");
      }
    });

    const chkPassengers = document.getElementById("chkPassengers").checked;
    const chkStandby = document.getElementById("chkStandby").checked;
    const chkOther = document.getElementById("chkOther").checked;
    const otherText = document.getElementById("otherText").value.trim();

    let hasValidRemarks =
      chkPassengers || chkStandby || (chkOther && otherText !== "");
    if (!hasValidRemarks) {
      let remarksLabel = document.querySelector("#remarksContainer label.title");
      if (remarksLabel) remarksLabel.classList.add("print-warning-highlight");
    }

    const signatureLabel = document.getElementById("signatureLabel");
    if (signatureLabel) signatureLabel.classList.add("print-warning-highlight");

    const hrsTotalEl = document.getElementById("hrsTotal");
    if (hrsTotalEl && Math.abs(parseFloat(hrsTotalEl.value) - 24.0) >= 0.001) {
      hrsTotalEl.classList.add("print-warning-highlight");
      let hrLabel = document.querySelector('label[for="hrsTotal"]');
      if (hrLabel) hrLabel.classList.add("print-warning-highlight");
      
      hrsTotalEl.dataset.originalValue = hrsTotalEl.value;
      hrsTotalEl.value = "";
    }

    // Grid Clone and Redraw Logic
    drawGridAndLine(true);

    let printClone = document.getElementById("print-clone-container");
    if (printClone) printClone.remove();

    printClone = document.createElement("div");
    printClone.id = "print-clone-container";
    printClone.style.pageBreakBefore = "always";

    const originalContainer = document.querySelector(".container");
    if (originalContainer) {
      const clonedHtml = originalContainer.cloneNode(true);
      printClone.appendChild(clonedHtml);

      const originalCanvas = document.getElementById("logGrid");
      const clonedCanvas = printClone.querySelector("#logGrid");
      if (originalCanvas && clonedCanvas) {
        drawGridAndLine(true, clonedCanvas);
      }

      const orgInputs = originalContainer.querySelectorAll(
        "input, select, textarea"
      );
      const newInputs = printClone.querySelectorAll("input, select, textarea");
      orgInputs.forEach((input, index) => {
        if (newInputs[index]) {
          if (input.type === "checkbox" || input.type === "radio") {
            newInputs[index].checked = input.checked;
          } else {
            newInputs[index].value = input.value;
          }
        }
      });
      document.body.appendChild(printClone);
    }
  });

  window.addEventListener("afterprint", () => {
    drawGridAndLine(false);
    const printClone = document.getElementById("print-clone-container");
    if (printClone) printClone.remove();

    const dateInput = document.getElementById("date");
    let d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (dateInput.type === "text") {
      dateInput.type = "date";
    }
    dateInput.value = todayStr;

    const requiredFields = document.querySelectorAll(
      "input[required], select[required]"
    );
    requiredFields.forEach((field) => {
      let label = document.querySelector(`label[for="${field.id}"]`);
      if (label) label.classList.remove("print-warning-highlight");
    });

    let remarksLabel = document.querySelector("#remarksContainer label.title");
    if (remarksLabel) remarksLabel.classList.remove("print-warning-highlight");

    const signatureLabel = document.getElementById("signatureLabel");
    if (signatureLabel) signatureLabel.classList.remove("print-warning-highlight");

    const hrsTotalEl = document.getElementById("hrsTotal");
    if (hrsTotalEl) {
      hrsTotalEl.classList.remove("print-warning-highlight");
      if (hrsTotalEl.dataset.originalValue !== undefined) {
        hrsTotalEl.value = hrsTotalEl.dataset.originalValue;
        delete hrsTotalEl.dataset.originalValue;
      }
    }
    let hrLabel = document.querySelector('label[for="hrsTotal"]');
    if (hrLabel) hrLabel.classList.remove("print-warning-highlight");
  });
}
