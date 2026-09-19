/*
  Bob Maxey Staff Operations workspace
  This layer deliberately uses localStorage so the static GitHub Pages build has
  a usable staging console. It does not pretend that browser-local edits are a
  secured, shared backend; a server connector is required for scheduled source sync.
*/
(() => {
  if (typeof people === "undefined" || typeof render2 === "undefined") return;

  const STORE_KEY = "bob-maxey-directory-admin-v1";
  const SETTINGS_KEY = "bob-maxey-directory-settings-v1";
  const seedPeople = JSON.parse(JSON.stringify(people));
  const locations = ["Howell", "Fowlerville", "Ford Detroit", "Lincoln"];
  const departments = ["Sales", "Finance", "Service", "Parts", "Collision", "Administration", "Marketing", "Customer Care"];
  const sourceConfig = {
    Howell: "https://www.bobmaxeyfordhowell.com/staff.aspx",
    Fowlerville: "https://www.bobmaxeyfordinfowlerville.com/staff.aspx",
    "Ford Detroit": "https://www.bobmaxeyford.com/staff.aspx",
    Lincoln: "https://www.bobmaxeylincoln.com/staff.aspx"
  };
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const initials = name => String(name || "").split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const keyFor = person => `${person.location}|${person.name}`;
  const nowLabel = () => new Intl.DateTimeFormat("en-US", {dateStyle:"medium", timeStyle:"short"}).format(new Date());
  const icon = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${path}"></path></svg>`;
  const usersIcon = icon("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75");
  const syncIcon = icon("M21 12a9 9 0 0 1-15.5 6.2L3 16m18-4a9 9 0 0 0-15.5-6.2L3 8m0 0V3m0 5h5m13 8v5m0-5h-5");
  const downloadIcon = icon("M12 3v12m0 0 4-4m-4 4-4-4M4 21h16");
  const warningIcon = icon("M10.3 2.9 1.9 17a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01");

  function normalize(person) {
    return {
      location: person.location || "Howell",
      department: person.department || "Administration",
      name: person.name || "Unnamed employee",
      title: person.title || "Team member",
      phone: person.phone || "",
      email: person.email || "",
      extension: person.extension || "",
      salesAssignment: person.salesAssignment || "",
      image: person.image || "",
      source: person.source || "Staff page",
      sourceUrl: person.sourceUrl || sourceConfig[person.location] || "",
      syncStatus: person.syncStatus || "Current",
      updatedAt: person.updatedAt || "Initial directory load"
    };
  }
  function applySavedData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) people.splice(0, people.length, ...saved.map(normalize));
      else people.splice(0, people.length, ...people.map(normalize));
    } catch (_) { people.splice(0, people.length, ...people.map(normalize)); }
  }
  function saveData() {
    localStorage.setItem(STORE_KEY, JSON.stringify(people));
    if (typeof render2 === "function") render2();
    renderAdmin();
  }
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {}; } catch (_) { return {}; }
  }
  function saveSettings(settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  applySavedData();

  const app = document.createElement("div");
  app.innerHTML = `
    <div class="admin-modal" id="adminModal" hidden>
      <section class="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="adminTitle">
        <aside class="admin-rail">
          <div class="admin-rail-head"><strong>Staff operations</strong><span>Directory administration and source review</span></div>
          <nav class="admin-nav" aria-label="Admin sections">
            <button class="admin-tab active" type="button" data-admin-view="people">People</button>
            <button class="admin-tab" type="button" data-admin-view="sync">Sync center</button>
            <button class="admin-tab" type="button" data-admin-view="settings">Settings</button>
          </nav>
          <div class="admin-rail-foot">Changes in this static build stay in this browser until you export, publish, or connect a secured backend.</div>
        </aside>
        <main class="admin-main">
          <header class="admin-head"><div><h2 id="adminTitle">Staff operations</h2><p id="adminSubtitle">Review, edit, and stage staff records across the Bob Maxey group.</p></div><button class="admin-close" id="adminClose" type="button" aria-label="Close admin">×</button></header>
          <div class="admin-banner">${warningIcon}<div><strong>Browser-local admin workspace</strong>Changes are saved only on this device. GitHub Pages cannot protect an admin area, run a schedule, or read a logged-in CallRevu account. Use this workspace to manage data and hand it to a secured connector when one is configured.</div></div>
          <section class="admin-view" id="adminPeopleView"></section>
          <section class="admin-view" id="adminSyncView" hidden></section>
          <section class="admin-view" id="adminSettingsView" hidden></section>
        </main>
      </section>
    </div>
    <div class="form-modal" id="employeeFormModal" hidden>
      <section class="form-dialog" role="dialog" aria-modal="true" aria-labelledby="employeeFormTitle">
        <header class="form-head"><h3 id="employeeFormTitle">Add team member</h3><button class="admin-close" id="employeeFormClose" type="button" aria-label="Close employee form">×</button></header>
        <form id="employeeForm" class="admin-form">
          <input type="hidden" name="originalKey"><label>Full name<input name="name" required autocomplete="name"></label><label>Role / title<input name="title" required></label>
          <label>Location<select name="location">${locations.map(location => `<option>${esc(location)}</option>`).join("")}</select></label><label>Department<select name="department">${departments.map(department => `<option>${esc(department)}</option>`).join("")}</select></label>
          <label>Phone number<input name="phone" inputmode="tel"></label><label>Extension<input name="extension" inputmode="numeric"></label>
          <label>Email<input name="email" type="email"></label><label>Sales assignment<select name="salesAssignment"><option value="">Not applicable</option><option>New Sales</option><option>Used Sales</option><option>Sales</option></select></label>
          <label class="full">Photo URL <input name="image" type="url" placeholder="https://..."></label>
          <label>Record source<select name="source"><option>Manual</option><option>Staff page</option><option>CallRevu directory</option><option>CSV import</option></select></label><label>Source link <input name="sourceUrl" type="url" placeholder="https://..."></label>
          <label class="full">Internal note <textarea name="note" placeholder="Optional: review note or role clarification"></textarea></label>
        </form>
        <footer class="form-foot"><button class="admin-button" id="employeeFormCancel" type="button">Cancel</button><button class="admin-button primary" id="employeeFormSave" type="submit" form="employeeForm">Save employee</button></footer>
      </section>
    </div>
    <div class="toast" id="adminToast" hidden></div>
  `;
  document.body.append(...app.children);

  const adminModal = document.querySelector("#adminModal");
  const adminPeopleView = document.querySelector("#adminPeopleView");
  const adminSyncView = document.querySelector("#adminSyncView");
  const adminSettingsView = document.querySelector("#adminSettingsView");
  const employeeFormModal = document.querySelector("#employeeFormModal");
  const employeeForm = document.querySelector("#employeeForm");
  const toast = document.querySelector("#adminToast");
  let activeView = "people";
  let adminSearch = "";
  let adminLocationFilter = "";
  let adminDepartmentFilter = "";
  let toastTimer;
  function notify(message) { toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3600); }
  function avatar(person) { return person.image ? `<img class="admin-avatar" src="${esc(person.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'admin-avatar',textContent:'${esc(initials(person.name))}'}))">` : `<span class="admin-avatar">${esc(initials(person.name))}</span>`; }
  function renderPeopleView() {
    const shown = people.filter(person => Object.values(person).join(" ").toLowerCase().includes(adminSearch.toLowerCase()) && (!adminLocationFilter || person.location === adminLocationFilter) && (!adminDepartmentFilter || person.department === adminDepartmentFilter)).sort((a,b) => a.location.localeCompare(b.location) || a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
    const manual = people.filter(person => person.source === "Manual").length;
    adminPeopleView.innerHTML = `
      <div class="metric-strip"><div class="metric"><strong>${people.length}</strong><span>Total active records</span></div><div class="metric"><strong>${manual}</strong><span>Manual or local changes</span></div><div class="metric"><strong>${people.filter(person => person.extension).length}</strong><span>Records with extension</span></div></div>
      <div class="admin-actions"><button class="admin-button primary" type="button" data-action="add">${usersIcon} Add team member</button><label class="admin-button" for="csvImport">${downloadIcon} Import CSV<input id="csvImport" type="file" accept=".csv,text/csv" hidden></label><button class="admin-button" type="button" data-action="export">${downloadIcon} Export data</button><button class="admin-button" type="button" data-action="restore">Restore seed directory</button></div>
      <div class="admin-toolbar"><input id="adminSearch" type="search" value="${esc(adminSearch)}" placeholder="Search name, role, store, email or extension"><select id="adminLocationFilter"><option value="">All locations</option>${locations.map(location => `<option>${esc(location)}</option>`).join("")}</select><select id="adminDepartmentFilter"><option value="">All departments</option>${departments.map(department => `<option>${esc(department)}</option>`).join("")}</select></div>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Team member</th><th>Role</th><th>Location</th><th>Department</th><th>Phone / Extension</th><th>Source</th><th></th></tr></thead><tbody>${shown.length ? shown.map(person => `<tr><td><div class="admin-person">${avatar(person)}<div><b>${esc(person.name)}</b><span>${esc(person.email || "No email")}</span></div></div></td><td>${esc(person.title)}</td><td>${esc(person.location)}</td><td>${esc(person.department)}</td><td>${esc(person.phone || "—")}${person.extension ? `<br><small>Ext. ${esc(person.extension)}</small>` : ""}</td><td><span class="status-dot ${person.source === "Manual" ? "manual" : ""}">${esc(person.source || "Staff page")}</span></td><td><button class="edit-row" type="button" data-action="edit" data-key="${esc(keyFor(person))}">Edit</button></td></tr>`).join("") : `<tr><td colspan="7" class="admin-empty">No staff records match the current filters.</td></tr>`}</tbody></table></div>`;
    const locationFilter = adminPeopleView.querySelector("#adminLocationFilter");
    const departmentFilter = adminPeopleView.querySelector("#adminDepartmentFilter");
    locationFilter.value = adminLocationFilter;
    departmentFilter.value = adminDepartmentFilter;
  }
  function renderSyncView() {
    const settings = getSettings();
    const lastSync = settings.lastSync || "Not run in this browser";
    adminSyncView.innerHTML = `
      <div class="metric-strip"><div class="metric"><strong>4</strong><span>Public staff-page sources</span></div><div class="metric"><strong>${people.filter(person => person.extension).length}</strong><span>Extension matches staged</span></div><div class="metric"><strong>${esc(lastSync)}</strong><span>Last local sync review</span></div></div>
      <div class="admin-actions"><button class="admin-button primary" type="button" data-action="sync-review">${syncIcon} Mark sources reviewed</button><label class="admin-button" for="extensionCsvImport">${downloadIcon} Import extension CSV<input id="extensionCsvImport" type="file" accept=".csv,text/csv" hidden></label></div>
      <div class="sync-list">${locations.map(location => `<article class="sync-card"><div class="sync-mark">${location === "Lincoln" ? "L" : "F"}</div><div><b>${esc(location)} staff page</b><p>${esc(sourceConfig[location])}</p></div><div class="sync-state ${settings.lastSync ? "ready" : ""}">${settings.lastSync ? "Ready for connector review" : "Awaiting first review"}</div></article>`).join("")}
        <article class="sync-card"><div class="sync-mark">CR</div><div><b>Phone directory / extension import</b><p>Use the CallRevu contacts CSV export to match people by name and location, then stage extensions for review.</p></div><div class="sync-state">CSV enabled</div></article></div>
      <div class="sync-config"><label>Website sync endpoint <input id="syncEndpoint" value="${esc(settings.endpoint || "")}" placeholder="https://staff-api.yourdomain.com/sync"><small>A secured backend endpoint is required for scheduled public-page refreshes.</small></label><label>Schedule <select id="syncSchedule"><option value="manual">Manual review only</option><option value="daily">Daily (requires backend)</option><option value="weekly">Weekly (requires backend)</option></select><small>GitHub Pages cannot run background jobs or hold CallRevu credentials.</small></label></div>`;
    adminSyncView.querySelector("#syncSchedule").value = settings.schedule || "manual";
  }
  function renderSettingsView() {
    const settings = getSettings();
    adminSettingsView.innerHTML = `<div class="settings-grid"><article class="setting-card"><h3>Public directory presentation</h3><p>Choose whether browser-local changes should immediately update the directory screen on this device.</p><label><input id="livePreview" type="checkbox" ${settings.livePreview !== false ? "checked" : ""}> Keep directory preview in sync with edited records</label></article><article class="setting-card"><h3>Change control</h3><p>Keep a local timestamp on all changes and surface the record origin in the admin table.</p><label><input id="sourceLabels" type="checkbox" ${settings.sourceLabels !== false ? "checked" : ""}> Show source status in administration</label></article><article class="setting-card"><h3>Data protection</h3><p>This static directory has no real authentication. Do not store employee notes, credentials, or private HR data here.</p><button class="admin-button danger" type="button" data-action="clear-local">Clear browser-local edits</button></article><article class="setting-card"><h3>Production connector</h3><p>For real shared administration, scheduled refreshes, and CallRevu matching, connect a secured API with role-based sign-in and server-side credentials.</p><button class="admin-button" type="button" data-action="export">Export current data for backend</button></article></div>`;
  }
  function renderAdmin() {
    if (!adminModal || adminModal.hidden) return;
    adminPeopleView.hidden = activeView !== "people";
    adminSyncView.hidden = activeView !== "sync";
    adminSettingsView.hidden = activeView !== "settings";
    document.querySelectorAll(".admin-tab").forEach(button => button.classList.toggle("active", button.dataset.adminView === activeView));
    if (activeView === "people") renderPeopleView();
    if (activeView === "sync") renderSyncView();
    if (activeView === "settings") renderSettingsView();
  }
  function openAdmin(view = "people") { activeView = view; adminModal.hidden = false; renderAdmin(); }
  function closeAdmin() { adminModal.hidden = true; }
  function openEmployeeForm(person) {
    const formTitle = document.querySelector("#employeeFormTitle");
    employeeForm.reset();
    employeeForm.originalKey.value = person ? keyFor(person) : "";
    formTitle.textContent = person ? `Edit ${person.name}` : "Add team member";
    if (person) Object.entries(person).forEach(([field, value]) => { if (employeeForm.elements[field]) employeeForm.elements[field].value = value || ""; });
    else { employeeForm.location.value = activeLocation2 || "Howell"; employeeForm.department.value = activeDepartment2 !== "All" ? activeDepartment2 : "Sales"; employeeForm.source.value = "Manual"; }
    employeeFormModal.hidden = false;
    employeeForm.name.focus();
  }
  function closeEmployeeForm() { employeeFormModal.hidden = true; }
  function updatePersonFromForm(event) {
    event.preventDefault();
    const form = new FormData(employeeForm);
    const record = normalize(Object.fromEntries(form.entries()));
    record.updatedAt = nowLabel();
    const original = form.get("originalKey");
    const index = people.findIndex(person => keyFor(person) === original);
    if (index >= 0) people.splice(index, 1, record); else people.push(record);
    saveData(); closeEmployeeForm(); notify(`${record.name} saved to this browser.`);
  }
  function downloadData() {
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),people}, null, 2)], {type:"application/json"});
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "bob-maxey-staff-directory-data.json"; link.click(); URL.revokeObjectURL(link.href); notify("Directory data exported.");
  }
  function csvRows(text) {
    const rows = []; let row = []; let cell = ""; let quote = false;
    for (let i = 0; i < text.length; i += 1) { const char = text[i], next = text[i + 1]; if (char === '"' && quote && next === '"') { cell += '"'; i += 1; } else if (char === '"') quote = !quote; else if (char === ',' && !quote) { row.push(cell.trim()); cell = ""; } else if ((char === '\n' || char === '\r') && !quote) { if (char === '\r' && next === '\n') i += 1; row.push(cell.trim()); if (row.some(value => value)) rows.push(row); row = []; cell = ""; } else cell += char; }
    if (cell || row.length) { row.push(cell.trim()); rows.push(row); } return rows;
  }
  function mapHeader(headers, names) { const match = headers.findIndex(header => names.includes(header.replace(/[^a-z]/gi, "").toLowerCase())); return match >= 0 ? match : null; }
  function importStaffCsv(file, extensionOnly = false) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = csvRows(String(reader.result || "")); if (rows.length < 2) { notify("That CSV did not include usable rows."); return; }
      const headers = rows[0]; const get = (row, names) => { const index = mapHeader(headers, names); return index === null ? "" : row[index] || ""; };
      let changed = 0, added = 0, unmatched = 0;
      rows.slice(1).forEach(row => {
        const name = get(row,["name","fullname","contactname","employee","employeename"]); const location = get(row,["location","site","store","dealership"]); const extension = get(row,["extension","ext","number","phoneextension"]);
        if (!name) return;
        const candidate = people.find(person => person.name.toLowerCase() === name.toLowerCase() && (!location || person.location.toLowerCase().includes(location.toLowerCase())));
        if (extensionOnly) { if (!candidate) { unmatched += 1; return; } candidate.extension = extension; candidate.source = "CallRevu directory"; candidate.updatedAt = nowLabel(); changed += 1; return; }
        const data = normalize({location:location || candidate?.location || "Howell",department:get(row,["department","team"]) || candidate?.department || "Administration",name,title:get(row,["title","role","position"]) || candidate?.title || "Team member",phone:get(row,["phone","phonenumber","directphone"]) || candidate?.phone || "",email:get(row,["email","emailaddress"]) || candidate?.email || "",extension:extension || candidate?.extension || "",salesAssignment:get(row,["salesassignment","salestrack","vehicletype"]) || candidate?.salesAssignment || "",image:get(row,["photo","image","photourl"]) || candidate?.image || "",source:"CSV import",updatedAt:nowLabel()});
        if (candidate) { Object.assign(candidate, data); changed += 1; } else { people.push(data); added += 1; }
      });
      saveData(); notify(extensionOnly ? `Updated ${changed} extension records${unmatched ? `; ${unmatched} unmatched` : ""}.` : `Imported ${changed} updates and ${added} new staff records.`);
    }; reader.readAsText(file);
  }
  function runReview() { const settings = getSettings(); settings.lastSync = nowLabel(); saveSettings(settings); renderAdmin(); notify("Source review timestamp saved. Configure a secured connector for a real automated refresh."); }
  function changeView(view) { activeView = view; renderAdmin(); }
  function handleAdminAction(action, key) {
    if (action === "add") openEmployeeForm();
    if (action === "edit") openEmployeeForm(people.find(person => keyFor(person) === key));
    if (action === "export") downloadData();
    if (action === "restore") { if (window.confirm("Restore the original seeded directory and discard browser-local edits?")) { people.splice(0, people.length, ...JSON.parse(JSON.stringify(seedPeople)).map(normalize)); localStorage.removeItem(STORE_KEY); if (typeof render2 === "function") render2(); renderAdmin(); notify("Original directory restored."); } }
    if (action === "sync-review") runReview();
    if (action === "clear-local") { if (window.confirm("Clear all browser-local staff changes?")) { localStorage.removeItem(STORE_KEY); people.splice(0, people.length, ...JSON.parse(JSON.stringify(seedPeople)).map(normalize)); if (typeof render2 === "function") render2(); renderAdmin(); notify("Browser-local changes cleared."); } }
  }

  const directoryUtility = document.querySelector(".directory-utility");
  if (directoryUtility) directoryUtility.insertAdjacentHTML("beforeend", `<button class="admin-launch" id="adminLaunch" type="button">${usersIcon} Admin</button>`);
  document.querySelector("#adminLaunch")?.addEventListener("click", () => openAdmin());
  document.querySelector("#adminClose").addEventListener("click", closeAdmin);
  adminModal.addEventListener("click", event => { if (event.target === adminModal) closeAdmin(); });
  document.querySelector(".admin-nav").addEventListener("click", event => { const button = event.target.closest("[data-admin-view]"); if (button) changeView(button.dataset.adminView); });
  document.querySelector("#employeeFormClose").addEventListener("click", closeEmployeeForm);
  document.querySelector("#employeeFormCancel").addEventListener("click", closeEmployeeForm);
  employeeFormModal.addEventListener("click", event => { if (event.target === employeeFormModal) closeEmployeeForm(); });
  employeeForm.addEventListener("submit", updatePersonFromForm);
  adminPeopleView.addEventListener("input", event => { if (event.target.id === "adminSearch") { adminSearch = event.target.value; renderPeopleView(); } });
  adminPeopleView.addEventListener("change", event => {
    if (event.target.id === "csvImport") importStaffCsv(event.target.files[0]);
    if (event.target.id === "adminLocationFilter" || event.target.id === "adminDepartmentFilter") { adminLocationFilter = adminPeopleView.querySelector("#adminLocationFilter").value; adminDepartmentFilter = adminPeopleView.querySelector("#adminDepartmentFilter").value; renderPeopleView(); }
  });
  adminPeopleView.addEventListener("click", event => { const button = event.target.closest("[data-action]"); if (button) handleAdminAction(button.dataset.action, button.dataset.key); });
  adminSyncView.addEventListener("change", event => {
    if (event.target.id === "extensionCsvImport") importStaffCsv(event.target.files[0], true);
    if (event.target.id === "syncEndpoint" || event.target.id === "syncSchedule") { const settings = getSettings(); settings.endpoint = adminSyncView.querySelector("#syncEndpoint").value; settings.schedule = adminSyncView.querySelector("#syncSchedule").value; saveSettings(settings); notify("Connector settings saved locally."); }
  });
  adminSyncView.addEventListener("click", event => { const button = event.target.closest("[data-action]"); if (button) handleAdminAction(button.dataset.action); });
  adminSettingsView.addEventListener("change", event => { const settings = getSettings(); if (event.target.id === "livePreview") settings.livePreview = event.target.checked; if (event.target.id === "sourceLabels") settings.sourceLabels = event.target.checked; saveSettings(settings); notify("Directory setting saved locally."); });
  adminSettingsView.addEventListener("click", event => { const button = event.target.closest("[data-action]"); if (button) handleAdminAction(button.dataset.action); });
  if (typeof render2 === "function") render2();
})();
