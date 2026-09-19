/* Bob Maxey Staff Operations — browser-local administration layer. */
(() => {
  if (typeof people === "undefined" || typeof render2 === "undefined") return;
  document.body.classList.add("dashboard-mode");

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
  const fordLogo = "https://www.bobmaxeyfordhowell.com/assets/logos/transparent/Ford.png";
  const lincolnLogo = "https://www.bobmaxeylincoln.com/static/industry-automotive/logos/supp/lincoln/transparent/lincoln.png";
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const initials = name => String(name || "").split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const keyFor = person => `${person.location}|${person.name}`;
  const nowLabel = () => new Intl.DateTimeFormat("en-US", {dateStyle:"medium", timeStyle:"short"}).format(new Date());
  const icon = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>`;
  const icons = {
    users: icon("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"),
    search: icon("m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14"),
    sync: icon("M21 12a9 9 0 0 1-15.5 6.2L3 16m18-4a9 9 0 0 0-15.5-6.2L3 8m0 0V3m0 5h5m13 8v5m0-5h-5"),
    upload: icon("M12 16V4m0 0-4 4m4-4 4 4M4 20h16"),
    phone: icon("M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"),
    bell: icon("M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"),
    person: icon("M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10"),
    mail: icon("M4 4h16v16H4zM4 6l8 7 8-7"),
    hash: icon("M10 3 8 21M16 3l-2 18M4 9h16M3 15h16"),
    building: icon("M3 21h18M5 21V6l7-3v18M19 21V10l-7-2M8 9h1m-1 4h1m-1 4h1m6-5h1m-1 4h1"),
    role: icon("M3 7h18v13H3zM8 7V4h8v3M3 12h18"),
    document: icon("M6 2h9l3 3v17H6zM14 2v5h5M9 12h6m-6 4h6"),
    clock: icon("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2"),
    info: icon("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 10v6m0-10h.01"),
    edit: icon("M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"),
    warning: icon("M10.3 2.9 1.9 17a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01")
  };

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
      updatedAt: person.updatedAt || "Initial directory load",
      note: person.note || ""
    };
  }
  function applySavedData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      people.splice(0, people.length, ...(Array.isArray(saved) && saved.length ? saved : people).map(normalize));
    } catch (_) { people.splice(0, people.length, ...people.map(normalize)); }
  }
  function saveData() {
    localStorage.setItem(STORE_KEY, JSON.stringify(people));
    render2();
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
      <section class="admin-dialog" role="dialog" aria-modal="true" aria-label="Bob Maxey Staff Directory administration">
        <aside class="admin-rail">
          <div class="admin-brand"><strong>Bob Maxey</strong><span>DEALERSHIPS</span></div>
          <div class="admin-locations-label">Locations</div>
          <nav class="admin-location-nav" aria-label="Dealership locations">
            ${locations.map(location => `<button class="admin-location" type="button" data-location="${esc(location)}"><img src="${location === "Lincoln" ? lincolnLogo : fordLogo}" alt=""><span>${esc(location)}</span></button>`).join("")}
          </nav>
          <div class="admin-rail-foot">People. Service.<br>Stronger Together.</div>
        </aside>
        <div class="admin-workspace">
          <header class="admin-topbar">
            <div class="admin-app-title"><strong>Staff Directory</strong><span>Manage your team across all Bob Maxey Dealerships</span></div>
            <label class="admin-global-search">${icons.search}<input id="adminGlobalSearch" type="search" placeholder="Search employees, departments, or keywords..."></label>
            <div class="admin-user"><button class="admin-bell" type="button" aria-label="Notifications">${icons.bell}</button><span class="admin-user-avatar">AD</span><span class="admin-user-copy"><strong>Admin User</strong><span>Administrator</span></span><button class="admin-close" id="adminClose" type="button" aria-label="Close administration">×</button></div>
          </header>
          <nav class="admin-tabs" aria-label="Directory administration">
            <button class="admin-tab" type="button" data-admin-view="directory">Directory</button>
            <button class="admin-tab active" type="button" data-admin-view="people">Admin</button>
            <button class="admin-tab" type="button" data-admin-view="sync">Sync activity</button>
            <button class="admin-tab" type="button" data-admin-view="settings">Settings</button>
            <span class="admin-tabs-note">Built for a Stronger Tomorrow.</span>
          </nav>
          <section class="admin-view" id="adminPeopleView"></section>
          <section class="admin-view" id="adminSyncView" hidden></section>
          <section class="admin-view" id="adminSettingsView" hidden></section>
        </div>
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
          <label class="full">Photo URL<input name="image" type="url" placeholder="https://..."></label>
          <label>Record source<select name="source"><option>Manual</option><option>Staff page</option><option>CallRevu directory</option><option>CSV import</option></select></label><label>Source link<input name="sourceUrl" type="url" placeholder="https://..."></label>
          <label class="full">Internal note<textarea name="note" placeholder="Optional review note or role clarification"></textarea></label>
        </form>
        <footer class="form-foot"><button class="admin-button danger" id="employeeDelete" type="button" hidden>Remove employee</button><span style="flex:1"></span><button class="admin-button" id="employeeFormCancel" type="button">Cancel</button><button class="admin-button primary" type="submit" form="employeeForm">Save employee</button></footer>
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
  const employeeDelete = document.querySelector("#employeeDelete");
  const globalSearch = document.querySelector("#adminGlobalSearch");
  const toast = document.querySelector("#adminToast");
  let activeView = "directory";
  let adminSearch = "";
  let adminLocationFilter = "";
  let adminDepartmentFilter = "";
  let adminSourceFilter = "";
  let selectedKey = "";
  let page = 1;
  let pageSize = 10;
  let toastTimer;

  function notify(message) { toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3600); }
  function avatar(person, className = "admin-avatar") { return person.image ? `<img class="${className}" src="${esc(person.image)}" alt="${esc(person.name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${className}',textContent:'${esc(initials(person.name))}'}))">` : `<span class="${className}">${esc(initials(person.name))}</span>`; }
  function filteredPeople() {
    const departmentRank = value => { const index = departments.indexOf(value); return index < 0 ? 99 : index; };
    const leadershipRank = person => /general manager|director|owner|president|vice president|\bvp\b/i.test(person.title) ? 0 : /manager|supervisor|foreman/i.test(person.title) ? 1 : 2;
    return people.filter(person => Object.values(person).join(" ").toLowerCase().includes(adminSearch.toLowerCase()) && (!adminLocationFilter || person.location === adminLocationFilter) && (!adminDepartmentFilter || person.department === adminDepartmentFilter) && (!adminSourceFilter || (adminSourceFilter === "manual" ? person.source === "Manual" : person.source !== "Manual"))).sort((a,b) => locations.indexOf(a.location) - locations.indexOf(b.location) || departmentRank(a.department) - departmentRank(b.department) || leadershipRank(a) - leadershipRank(b) || a.name.localeCompare(b.name));
  }
  function currentPerson(list = people) { return list.find(person => keyFor(person) === selectedKey) || list[0] || null; }
  function detailRow(iconMarkup, label, value, href = "") { return `<div class="admin-detail-row">${iconMarkup}<b>${esc(label)}</b>${href && value ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(value)}</a>` : `<span>${esc(value || "—")}</span>`}</div>`; }
  function inspector(person) {
    if (!person) return `<div class="admin-inspector-empty">Select an employee to review the full record.</div>`;
    return `<div class="admin-inspector-top">${avatar(person,"admin-inspector-photo")}<div class="admin-inspector-name"><h3>${esc(person.name)}</h3><p>${esc(person.title)}</p><span class="admin-inspector-status">${person.source === "Manual" ? "Manual record" : "Source of truth"}</span></div></div>
      <div class="admin-inspector-tabs"><span class="active">Details</span><span>Locations &amp; links</span><span>Sync history</span></div>
      <div class="admin-detail-list">
        ${detailRow(icons.person,"Name",person.name)}${detailRow(icons.mail,"Email",person.email,person.email ? `mailto:${person.email}` : "")}${detailRow(icons.phone,"Phone",person.phone,person.phone ? `tel:${person.phone}` : "")}${detailRow(icons.hash,"Extension",person.extension)}${detailRow(icons.building,"Location",person.location)}${detailRow(icons.users,"Department",person.department)}${detailRow(icons.role,"Role",person.title)}${detailRow(icons.document,"Source of truth",person.sourceUrl ? `${person.source} (${person.location})` : person.source,person.sourceUrl)}${detailRow(icons.clock,"Last sync",person.updatedAt)}${detailRow(icons.info,"Status",person.syncStatus)}
      </div>
      <div class="admin-inspector-actions"><button class="admin-button primary" type="button" data-action="edit" data-key="${esc(keyFor(person))}">${icons.edit} Edit employee</button><button class="admin-button" type="button" data-action="public-profile" data-key="${esc(keyFor(person))}">View public profile</button></div>`;
  }
  function pagination(total, totalPages) {
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = Math.min(page * pageSize, total);
    const visiblePages = Array.from({length:Math.min(5,totalPages)}, (_,index) => Math.min(Math.max(1,page - 2),Math.max(1,totalPages - 4)) + index).filter(number => number <= totalPages);
    return `<div class="admin-pagination"><span>${start}–${end} of ${total} employees</span><div class="admin-page-size"><span>Rows per page</span><select id="adminPageSize"><option>10</option><option>20</option><option>50</option></select></div><div class="admin-pagination-controls"><button class="admin-page-button" type="button" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹</button>${visiblePages.map(number => `<button class="admin-page-button ${number === page ? "active" : ""}" type="button" data-page="${number}">${number}</button>`).join("")}<button class="admin-page-button" type="button" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>›</button></div></div>`;
  }
  function renderPeopleView() {
    const shown = filteredPeople();
    const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
    if (page > totalPages) page = totalPages;
    const pageRows = shown.slice((page - 1) * pageSize, page * pageSize);
    if (!shown.some(person => keyFor(person) === selectedKey)) selectedKey = shown[0] ? keyFor(shown[0]) : "";
    const selected = currentPerson(shown);
    adminPeopleView.innerHTML = `<div class="admin-people-shell">
      <div class="admin-commandbar"><div class="admin-page-title"><h2>Staff Directory</h2><p>View and manage team members across all locations.</p></div><div class="admin-actions"><button class="admin-button primary" type="button" data-action="add">${icons.users} Add team member</button><label class="admin-button" for="csvImport">${icons.upload} Import CSV<input id="csvImport" type="file" accept=".csv,text/csv" hidden></label><button class="admin-button" type="button" data-action="sync-open">${icons.sync} Sync staff pages</button><button class="admin-button" type="button" data-action="phone-sync">${icons.phone} Sync phone directory</button></div></div>
      <div class="admin-body"><div class="admin-list-panel"><div class="admin-toolbar"><input id="adminSearch" type="search" value="${esc(adminSearch)}" placeholder="Search by name, role, department..."><select id="adminLocationFilter"><option value="">All locations</option>${locations.map(location => `<option>${esc(location)}</option>`).join("")}</select><select id="adminDepartmentFilter"><option value="">All departments</option>${departments.map(department => `<option>${esc(department)}</option>`).join("")}</select><select id="adminSourceFilter"><option value="">All source statuses</option><option value="source">Source of truth</option><option value="manual">Manual / review</option></select><button class="admin-clear" type="button" data-action="clear-filters">Clear filters</button></div>
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Photo</th><th>Name ↑</th><th>Role ↕</th><th>Location ↕</th><th>Department ↕</th><th>Phone ↕</th><th>Ext ↕</th><th>Source status ↕</th><th>⋮</th></tr></thead><tbody>${pageRows.length ? pageRows.map(person => `<tr class="${keyFor(person) === selectedKey ? "selected" : ""}" data-key="${esc(keyFor(person))}"><td>${avatar(person)}</td><td class="admin-name">${esc(person.name)}</td><td title="${esc(person.title)}">${esc(person.title)}</td><td>${esc(person.location)}</td><td>${esc(person.department)}</td><td>${esc(person.phone || "—")}</td><td>${esc(person.extension || "—")}</td><td><span class="admin-status ${person.source === "Manual" ? "manual" : ""}">${person.source === "Manual" ? "Review needed" : "Source of truth"}</span></td><td><button class="admin-kebab" type="button" data-action="edit" data-key="${esc(keyFor(person))}" aria-label="Edit ${esc(person.name)}">⋮</button></td></tr>`).join("") : `<tr><td colspan="9" class="admin-empty">No staff records match the current filters.</td></tr>`}</tbody></table></div>${pagination(shown.length,totalPages)}</div><aside class="admin-inspector">${inspector(selected)}</aside></div></div>`;
    adminPeopleView.querySelector("#adminLocationFilter").value = adminLocationFilter;
    adminPeopleView.querySelector("#adminDepartmentFilter").value = adminDepartmentFilter;
    adminPeopleView.querySelector("#adminSourceFilter").value = adminSourceFilter;
    adminPeopleView.querySelector("#adminPageSize").value = String(pageSize);
  }
  function renderSyncView() {
    const settings = getSettings();
    adminSyncView.innerHTML = `<div class="admin-secondary-view"><div class="admin-secondary-head"><div><h2>Sync activity</h2><p>Review staff-page and phone-directory sources across the group.</p></div><div class="admin-actions"><button class="admin-button primary" type="button" data-action="sync-review">${icons.sync} Mark sources reviewed</button><label class="admin-button" for="extensionCsvImport">${icons.upload} Import extension CSV<input id="extensionCsvImport" type="file" accept=".csv,text/csv" hidden></label></div></div><div class="admin-banner">${icons.warning}<div><strong>Secure connector required for automatic refreshes</strong>This published site can stage imports, but a protected backend is required to schedule source pulls or use approved CallRevu credentials.</div></div><div class="metric-strip"><div class="metric"><strong>4</strong><span>Public staff-page sources</span></div><div class="metric"><strong>${people.filter(person => person.extension).length}</strong><span>Extension matches staged</span></div><div class="metric"><strong>${esc(settings.lastSync || "Not reviewed")}</strong><span>Last source review</span></div></div><div class="sync-list">${locations.map(location => `<article class="sync-card"><div class="sync-mark">${location === "Lincoln" ? "L" : "F"}</div><div><b>${esc(location)} staff page</b><p>${esc(sourceConfig[location])}</p></div><div class="sync-state">Ready for connector review</div></article>`).join("")}<article class="sync-card"><div class="sync-mark">CR</div><div><b>Phone directory / extension import</b><p>Match the CallRevu contacts CSV by employee name and location, then review extension changes.</p></div><div class="sync-state">CSV enabled</div></article></div><div class="sync-config"><label>Website sync endpoint<input id="syncEndpoint" value="${esc(settings.endpoint || "")}" placeholder="https://staff-api.yourdomain.com/sync"><small>A secured backend endpoint is required for scheduled public-page refreshes.</small></label><label>Schedule<select id="syncSchedule"><option value="manual">Manual review only</option><option value="daily">Daily (requires backend)</option><option value="weekly">Weekly (requires backend)</option></select><small>GitHub Pages cannot run background jobs or hold CallRevu credentials.</small></label></div></div>`;
    adminSyncView.querySelector("#syncSchedule").value = settings.schedule || "manual";
  }
  function renderSettingsView() {
    const settings = getSettings();
    adminSettingsView.innerHTML = `<div class="admin-secondary-view"><div class="admin-secondary-head"><div><h2>Settings</h2><p>Control local preview, change visibility, and backend handoff options.</p></div></div><div class="settings-grid"><article class="setting-card"><h3>Public directory presentation</h3><p>Choose whether saved browser-local changes should immediately update the public directory preview.</p><label><input id="livePreview" type="checkbox" ${settings.livePreview !== false ? "checked" : ""}> Keep directory preview in sync with edited records</label></article><article class="setting-card"><h3>Change control</h3><p>Surface each employee record's current origin and update timestamp in administration.</p><label><input id="sourceLabels" type="checkbox" ${settings.sourceLabels !== false ? "checked" : ""}> Show source status in administration</label></article><article class="setting-card"><h3>Data protection</h3><p>This published directory has no true sign-in. Do not store private HR notes or credentials in browser-local records.</p><button class="admin-button danger" type="button" data-action="clear-local">Clear browser-local edits</button></article><article class="setting-card"><h3>Production connector</h3><p>Export the current directory for a secured shared backend with role-based sign-in and scheduled source synchronization.</p><button class="admin-button" type="button" data-action="export">Export current data for backend</button></article></div></div>`;
  }
  function renderAdmin() {
    if (adminModal.hidden) return;
    adminPeopleView.hidden = !["directory", "people"].includes(activeView);
    adminSyncView.hidden = activeView !== "sync";
    adminSettingsView.hidden = activeView !== "settings";
    document.querySelectorAll(".admin-tab").forEach(button => button.classList.toggle("active", button.dataset.adminView === activeView));
    document.querySelectorAll(".admin-location").forEach(button => button.classList.toggle("active", button.dataset.location === adminLocationFilter));
    if (["directory", "people"].includes(activeView)) renderPeopleView();
    if (activeView === "sync") renderSyncView();
    if (activeView === "settings") renderSettingsView();
  }
  function openAdmin(view = "directory") { activeView = view; adminLocationFilter = "Howell"; selectedKey = ""; page = 1; adminModal.hidden = false; document.body.classList.add("admin-open"); renderAdmin(); }
  function closeAdmin() { activeView = "directory"; renderAdmin(); }
  function changeView(view) { activeView = view; renderAdmin(); }
  function openEmployeeForm(person) {
    employeeForm.reset();
    employeeForm.originalKey.value = person ? keyFor(person) : "";
    document.querySelector("#employeeFormTitle").textContent = person ? `Edit ${person.name}` : "Add team member";
    employeeDelete.hidden = !person;
    if (person) Object.entries(person).forEach(([field,value]) => { if (employeeForm.elements[field]) employeeForm.elements[field].value = value || ""; });
    else { employeeForm.location.value = adminLocationFilter || "Howell"; employeeForm.department.value = adminDepartmentFilter || "Sales"; employeeForm.source.value = "Manual"; }
    employeeFormModal.hidden = false;
    employeeForm.name.focus();
  }
  function closeEmployeeForm() { employeeFormModal.hidden = true; }
  function updatePersonFromForm(event) {
    event.preventDefault();
    const form = new FormData(employeeForm);
    const record = normalize(Object.fromEntries(form.entries()));
    record.updatedAt = nowLabel();
    record.syncStatus = record.source === "Manual" ? "Review needed" : "Current";
    const original = form.get("originalKey");
    const index = people.findIndex(person => keyFor(person) === original);
    if (index >= 0) people.splice(index,1,record); else people.push(record);
    selectedKey = keyFor(record);
    saveData(); closeEmployeeForm(); notify(`${record.name} saved to this browser.`);
  }
  function removeEmployee() {
    const original = employeeForm.originalKey.value;
    const person = people.find(item => keyFor(item) === original);
    if (!person || !window.confirm(`Remove ${person.name} from this browser's directory?`)) return;
    people.splice(people.indexOf(person),1); selectedKey = ""; saveData(); closeEmployeeForm(); notify(`${person.name} removed from this browser.`);
  }
  function downloadData() {
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),people},null,2)],{type:"application/json"});
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "bob-maxey-staff-directory-data.json"; link.click(); URL.revokeObjectURL(link.href); notify("Directory data exported.");
  }
  function csvRows(text) {
    const rows=[]; let row=[],cell="",quote=false;
    for (let index=0;index<text.length;index+=1) { const char=text[index],next=text[index+1]; if(char==='"'&&quote&&next==='"'){cell+='"';index+=1}else if(char==='"')quote=!quote;else if(char===','&&!quote){row.push(cell.trim());cell=""}else if((char==='\n'||char==='\r')&&!quote){if(char==='\r'&&next==='\n')index+=1;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=""}else cell+=char; }
    if(cell||row.length){row.push(cell.trim());rows.push(row)} return rows;
  }
  function mapHeader(headers,names){const match=headers.findIndex(header=>names.includes(header.replace(/[^a-z]/gi,"").toLowerCase()));return match>=0?match:null}
  function importStaffCsv(file, extensionOnly=false) {
    if(!file)return; const reader=new FileReader(); reader.onload=()=>{const rows=csvRows(String(reader.result||""));if(rows.length<2){notify("That CSV did not include usable rows.");return}const headers=rows[0],get=(row,names)=>{const index=mapHeader(headers,names);return index===null?"":row[index]||""};let changed=0,added=0,unmatched=0;rows.slice(1).forEach(row=>{const name=get(row,["name","fullname","contactname","employee","employeename"]),location=get(row,["location","site","store","dealership"]),extension=get(row,["extension","ext","number","phoneextension"]);if(!name)return;const candidate=people.find(person=>person.name.toLowerCase()===name.toLowerCase()&&(!location||person.location.toLowerCase().includes(location.toLowerCase())));if(extensionOnly){if(!candidate){unmatched+=1;return}candidate.extension=extension;candidate.source="CallRevu directory";candidate.updatedAt=nowLabel();changed+=1;return}const data=normalize({location:location||candidate?.location||"Howell",department:get(row,["department","team"])||candidate?.department||"Administration",name,title:get(row,["title","role","position"])||candidate?.title||"Team member",phone:get(row,["phone","phonenumber","directphone"])||candidate?.phone||"",email:get(row,["email","emailaddress"])||candidate?.email||"",extension:extension||candidate?.extension||"",salesAssignment:get(row,["salesassignment","salestrack","vehicletype"])||candidate?.salesAssignment||"",image:get(row,["photo","image","photourl"])||candidate?.image||"",source:"CSV import",updatedAt:nowLabel()});if(candidate){Object.assign(candidate,data);changed+=1}else{people.push(data);added+=1}});saveData();notify(extensionOnly?`Updated ${changed} extension records${unmatched?`; ${unmatched} unmatched`:""}.`:`Imported ${changed} updates and ${added} new staff records.`)};reader.readAsText(file);
  }
  function runReview(){const settings=getSettings();settings.lastSync=nowLabel();saveSettings(settings);renderAdmin();notify("Source review timestamp saved. Configure the secured connector for automatic refreshes.")}
  function showPublicProfile(person){if(!person)return;activeView="directory";selectedKey=keyFor(person);renderAdmin();notify(`${person.name}'s directory profile is selected.`)}
  function handleAction(action,key){
    if(action==="add")openEmployeeForm();
    if(action==="edit")openEmployeeForm(people.find(person=>keyFor(person)===key));
    if(action==="export")downloadData();
    if(action==="sync-open"||action==="phone-sync")changeView("sync");
    if(action==="public-profile")showPublicProfile(people.find(person=>keyFor(person)===key));
    if(action==="clear-filters"){adminSearch="";adminLocationFilter="";adminDepartmentFilter="";adminSourceFilter="";globalSearch.value="";page=1;renderAdmin()}
    if(action==="sync-review")runReview();
    if(action==="clear-local"&&window.confirm("Clear all browser-local staff changes?")){localStorage.removeItem(STORE_KEY);people.splice(0,people.length,...JSON.parse(JSON.stringify(seedPeople)).map(normalize));selectedKey="";render2();renderAdmin();notify("Browser-local changes cleared.")}
  }

  const directoryUtility=document.querySelector(".directory-utility");
  if(directoryUtility)directoryUtility.insertAdjacentHTML("beforeend",`<button class="admin-launch" id="adminLaunch" type="button">${icons.users} Admin</button>`);
  document.querySelector("#adminLaunch")?.addEventListener("click",openAdmin);
  document.querySelector("#adminClose").addEventListener("click",()=>changeView("directory"));
  document.querySelector(".admin-tabs").addEventListener("click",event=>{const button=event.target.closest("[data-admin-view]");if(button)changeView(button.dataset.adminView)});
  document.querySelector(".admin-location-nav").addEventListener("click",event=>{const button=event.target.closest("[data-location]");if(!button)return;adminLocationFilter=adminLocationFilter===button.dataset.location?"":button.dataset.location;page=1;activeView="people";renderAdmin()});
  globalSearch.addEventListener("input",event=>{adminSearch=event.target.value;page=1;if(!["directory","people"].includes(activeView))activeView="directory";renderAdmin()});
  document.querySelector("#employeeFormClose").addEventListener("click",closeEmployeeForm);
  document.querySelector("#employeeFormCancel").addEventListener("click",closeEmployeeForm);
  employeeDelete.addEventListener("click",removeEmployee);
  employeeFormModal.addEventListener("click",event=>{if(event.target===employeeFormModal)closeEmployeeForm()});
  employeeForm.addEventListener("submit",updatePersonFromForm);
  adminPeopleView.addEventListener("input",event=>{if(event.target.id==="adminSearch"){adminSearch=event.target.value;globalSearch.value=adminSearch;page=1;renderPeopleView()}});
  adminPeopleView.addEventListener("change",event=>{
    if(event.target.id==="csvImport")importStaffCsv(event.target.files[0]);
    if(event.target.id==="adminLocationFilter"){adminLocationFilter=event.target.value;page=1;renderAdmin()}
    if(event.target.id==="adminDepartmentFilter"){adminDepartmentFilter=event.target.value;page=1;renderAdmin()}
    if(event.target.id==="adminSourceFilter"){adminSourceFilter=event.target.value;page=1;renderAdmin()}
    if(event.target.id==="adminPageSize"){pageSize=Number(event.target.value)||10;page=1;renderPeopleView()}
  });
  adminPeopleView.addEventListener("click",event=>{
    const pageButton=event.target.closest("[data-page]");if(pageButton&&!pageButton.disabled){page=Number(pageButton.dataset.page);renderPeopleView();return}
    const actionButton=event.target.closest("[data-action]");if(actionButton){event.stopPropagation();handleAction(actionButton.dataset.action,actionButton.dataset.key);return}
    const row=event.target.closest("tr[data-key]");if(row){selectedKey=row.dataset.key;renderPeopleView()}
  });
  adminSyncView.addEventListener("change",event=>{if(event.target.id==="extensionCsvImport")importStaffCsv(event.target.files[0],true);if(event.target.id==="syncEndpoint"||event.target.id==="syncSchedule"){const settings=getSettings();settings.endpoint=adminSyncView.querySelector("#syncEndpoint").value;settings.schedule=adminSyncView.querySelector("#syncSchedule").value;saveSettings(settings);notify("Connector settings saved locally.")}});
  adminSyncView.addEventListener("click",event=>{const button=event.target.closest("[data-action]");if(button)handleAction(button.dataset.action)});
  adminSettingsView.addEventListener("change",event=>{const settings=getSettings();if(event.target.id==="livePreview")settings.livePreview=event.target.checked;if(event.target.id==="sourceLabels")settings.sourceLabels=event.target.checked;saveSettings(settings);notify("Directory setting saved locally.")});
  adminSettingsView.addEventListener("click",event=>{const button=event.target.closest("[data-action]");if(button)handleAction(button.dataset.action)});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!employeeFormModal.hidden)closeEmployeeForm()});
  render2();
  setTimeout(() => openAdmin(location.hash === "#admin" ? "people" : "directory"), 0);
})();
