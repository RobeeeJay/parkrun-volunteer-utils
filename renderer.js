const fetchButton = document.getElementById("fetch");
const fetchUrl = document.getElementById("url");
const statusText = document.getElementById("status");
const milestonesTextarea = document.getElementById("milestones");
const printable = document.getElementById("printable");
const copyButton = document.getElementById("copy");
const printButton = document.getElementById("print");
let successfulRun = false;
let running = false;

fetchButton.addEventListener(
  "click",
  () => {
    if (running) return;

    if (
      successfulRun &&
      !confirm(
        "You already have a list of milestones,\nare you sure you wish to fetch a new set?"
      )
    )
      return;

    const resultsUrl = fetchUrl.value;
    fetchButton.classList.remove("btn-primary");
    fetchButton.classList.remove("btn-danger");
    fetchButton.classList.remove("btn-success");
    fetchButton.classList.add("btn-warning");
    statusText.innerHTML = "Getting the latest results...";

    running = true;
    window.electronAPI.fetchMilestones(resultsUrl);
  },
  true
);

copyButton.addEventListener(
  "click",
  () => {
    if (!successfulRun) return alert("You must fetch milestones to copy them!");
    navigator.clipboard.writeText(milestonesTextarea.value);
    alert("Copied the milestones to your clipboard!");
  },
  true
);

printButton.addEventListener(
  "click",
  () => {
    if (!successfulRun)
      return alert("You must fetch milestones to print them!");
    window.print();
  },
  true
);

window.electronAPI.onUpdateResultsUrl((event, value) => {
  fetchUrl.value = value;
});

window.electronAPI.onFetchError((event, value) => {
  statusText.innerHTML = value;
  fetchButton.classList.remove("btn-warning");
  fetchButton.classList.add("btn-danger");
  running = false;
});

window.electronAPI.onMilestones((event, value) => {
  statusText.innerHTML = "Finished getting milestones";
  milestonesTextarea.value = value;
  printable.innerHTML = value.replace(/\n/g, "<br/>");
  fetchButton.classList.remove("btn-warning");
  fetchButton.classList.add("btn-success");
  running = false;
  successfulRun = true;
});
