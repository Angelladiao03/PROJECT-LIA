// Sidebar toggle function
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("closed");
}

// ================= REPORT FORM LOGIC ================= //

// Toggle Full Name & Grade/Section fields depending on Anonymity radio selection
function toggleAnonymityFields() {
  const isAnonymous =
    document.querySelector('input[name="anonymity"]:checked').value ===
    "anonymous";
  const personalFields = document.getElementById("personalInfoFields");
  const nameInput = document.getElementById("fullName");
  const gradeInput = document.getElementById("gradeSection");

  if (isAnonymous) {
    personalFields.classList.add("hidden");
    nameInput.removeAttribute("required");
    gradeInput.removeAttribute("required");
    nameInput.value = "";
    gradeInput.value = "";
  } else {
    personalFields.classList.remove("hidden");
    nameInput.setAttribute("required", "true");
    gradeInput.setAttribute("required", "true");
  }
}

// Toggle "Specify Others" input if user chooses "Others" in Category
function toggleOthersField() {
  const categorySelect = document.getElementById("category");
  const othersContainer = document.getElementById("othersContainer");
  const otherCategoryInput = document.getElementById("otherCategory");

  if (categorySelect.value === "Others") {
    othersContainer.classList.remove("hidden");
    otherCategoryInput.setAttribute("required", "true");
  } else {
    othersContainer.classList.add("hidden");
    otherCategoryInput.removeAttribute("required");
    otherCategoryInput.value = "";
  }
}

// Clear custom dynamic fields when clicking the Reset button
function resetCustomFields() {
  setTimeout(() => {
    toggleAnonymityFields();
    toggleOthersField();
  }, 10);
}

// Sends the report to ReportServlet and waits for confirmation before
// showing the result popup.
async function handleReportSubmit(e) {
  e.preventDefault();

  const isAnonymous =
    document.querySelector('input[name="anonymity"]:checked').value ===
    "anonymous";
  const category = document.getElementById("category").value;
  const specifiedCategory = document.getElementById("otherCategory").value;
  const location = document.getElementById("location").value;
  const description = document.getElementById("description").value.trim();

  const finalCategory =
    category === "Others" ? `Others (${specifiedCategory})` : category;

  window.showPageLoading?.("Sending report...");

  const params = new URLSearchParams({
    isAnonymous: isAnonymous ? "true" : "false",
    location,
    category: finalCategory,
    description,
  });

  try {
    const res = await fetch("../../../ReportServlet", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json();

    window.hidePageLoading?.();

    if (!data.success) {
      // not logged in, missing fields, etc - show the error and stop
      showPagePopup(data.message, "Could Not Submit Report", () => {});
      return;
    }

    showPagePopup(
      "Your report has been received by the Guidance Office. Please wait for status updates.",
      isAnonymous ? "Anonymous Report Submitted" : "Report Submitted",
      () => {
        document.getElementById("reportForm").reset();
        resetCustomFields();
      },
    );
  } catch (error) {
    window.hidePageLoading?.();
    showPagePopup(
      "Could not reach the server. Please try again.",
      "Connection Error",
      () => {},
    );
  }
}
