import { showGlobalMessage, showGlobalConfirm } from './globals-utils.js';
import { getRemarksMarkers } from './canvas.js';

export const checkWarnings = () => {
  const dateInput = document.getElementById("date");
  let d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  if (dateInput.value && dateInput.value !== todayStr) {
    dateInput.classList.add("warning-field");
  } else {
    dateInput.classList.remove("warning-field");
  }

  const miles = document.getElementById("totalMiles");
  if (!miles.value || parseFloat(miles.value) === 0)
    miles.classList.add("warning-field");
  else miles.classList.remove("warning-field");

  [
    "empNum",
    "dutyNum",
    "vehicleNum",
    "fromCity",
    "toCity",
    "homeTerminal",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el.value.trim()) el.classList.add("warning-field");
    else el.classList.remove("warning-field");
  });
};

window.checkPrintExceptionState = () => {
  const printBtn = document.getElementById("btn-toolbar-print-exception");
  if (!printBtn) return;
  
  const requiredFields = Array.from(document.querySelectorAll("input[required], select[required]"));
  const fieldsValid = requiredFields.every((field) => field.value.trim() !== "" && field.checkValidity());
  
  const chkPassengers = document.getElementById("chkPassengers").checked;
  const chkStandby = document.getElementById("chkStandby").checked;
  const chkOther = document.getElementById("chkOther").checked;
  const otherText = document.getElementById("otherText").value.trim();
  const hasValidRemarks = chkPassengers || chkStandby || (chkOther && otherText !== "");

  const hasCityMarkers = getRemarksMarkers().length > 0;
  
  const totalInput = parseFloat(document.getElementById("hrsTotal").value) || 0;
  const hoursValid = Math.abs(totalInput - 24.0) < 0.001;

  let allCompleted = fieldsValid && hasValidRemarks && hasCityMarkers && hoursValid && !window.hasInvalidTransitions;

  printBtn.disabled = allCompleted; 
};

export const calculateTotal = () => {
  const off = parseFloat(document.getElementById("hrsOffDuty").value) || 0;
  const drive = parseFloat(document.getElementById("hrsDriving").value) || 0;
  const on = parseFloat(document.getElementById("hrsOnDuty").value) || 0;
  const total = off + drive + on;
  const totalInput = document.getElementById("hrsTotal");
  totalInput.value = total.toFixed(2);
  totalInput.style.color = Math.abs(total - 24.0) < 0.001 ? "green" : "red";
};

export const printException = () => {
  const instructions = `
    <strong>Printing exception copy.</strong><br><br>
    Missing fields will need to be completed by hand. Original filed each day at home terminal. Duplicate retained.
    <br><br>Do you want to proceed?
  `;
  
  showGlobalConfirm(instructions, (accepted) => {
    if (accepted) {
      document.body.classList.add("is-exception-print");
      
      const cleanup = () => {
        document.body.classList.remove("is-exception-print");
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      
      window.print();
    }
  });
};

export const validateAndPrint = () => {
  const requiredFields = document.querySelectorAll(
    "input[required], select[required]"
  );
  let allValid = true;
  requiredFields.forEach((field) => {
    if (!field.value.trim() || !field.checkValidity()) {
      allValid = false;
      field.style.borderColor = "red";
    } else {
      field.style.borderColor = "#ccc";
    }
  });

  const chkPassengers = document.getElementById("chkPassengers").checked;
  const chkStandby = document.getElementById("chkStandby").checked;
  const chkOther = document.getElementById("chkOther").checked;
  const otherText = document.getElementById("otherText").value.trim();

  let hasValidRemarks = chkPassengers || chkStandby || (chkOther && otherText !== "");
  if (!hasValidRemarks) {
    allValid = false;
    document.getElementById("remarksContainer").style.borderColor = "red";
    document.getElementById("remarksContainer").classList.add("warning-field");
  }

  const hasCityMarkers = getRemarksMarkers().length > 0;
  const canvasWrapper = document.getElementById("canvasWrapper");

  if (!hasCityMarkers) {
    allValid = false;
    if(canvasWrapper) {
      canvasWrapper.classList.add("warning-field");
      canvasWrapper.style.borderColor = "red";
      canvasWrapper.style.backgroundColor = "#fff3cd";
    }
  } else {
    if(canvasWrapper) {
      canvasWrapper.classList.remove("warning-field");
      canvasWrapper.style.borderColor = "#333";
      canvasWrapper.style.backgroundColor = "#fff";
    }
  }

  const totalInput = parseFloat(document.getElementById("hrsTotal").value) || 0;
  const hoursValid = Math.abs(totalInput - 24.0) < 0.001;

  if (window.hasInvalidTransitions) {
    showGlobalMessage("Error: Invalid duty transition found on grid. You must log ON DUTY time between DRIVING and OFF DUTY for pre/post-trip inspections.");
    return;
  }

  if (!allValid) {
    showGlobalMessage(
      'Please ensure all required fields are filled out, at least one Remarks option is selected, and at least one City/State marker is added to the grid. To bypass this warning and print an incomplete log, use the "Print Exception" button.'
    );
    return;
  }
  if (!hoursValid) {
    showGlobalMessage(
      "Error: Total hours must equal exactly 24.00 before printing."
    );
    return;
  }

  window.print();
};

export function setupUIValidation() {
  document.getElementById("date").addEventListener("change", checkWarnings);

  document.querySelectorAll(".hour-input").forEach((input) => {
    input.addEventListener("input", calculateTotal);
  });

  document.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", function () {
      if (this.checkValidity()) this.style.borderColor = "#ccc";
      if (this.value.trim() !== "" && this.id !== "date") {
        this.classList.remove("warning-field");
      }
      if (window.checkPrintExceptionState) window.checkPrintExceptionState();
    });
    input.addEventListener("change", function() {
      if (window.checkPrintExceptionState) window.checkPrintExceptionState();
    });
  });

  document.getElementById("otherText").addEventListener("input", function () {
    if (document.getElementById("chkOther").checked && this.value.trim() !== "") {
      document.getElementById("remarksContainer").style.borderColor = "#ccc";
      document.getElementById("remarksContainer").classList.remove("warning-field");
    }
  });

  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      document.getElementById("remarksContainer").style.borderColor = "#ccc";
      document.getElementById("remarksContainer").classList.remove("warning-field");
      if (window.checkPrintExceptionState) window.checkPrintExceptionState();
    });
  });
  
  if (window.checkPrintExceptionState) window.checkPrintExceptionState();
}
