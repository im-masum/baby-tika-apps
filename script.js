
// Enhanced client-side app with Google Calendar OAuth sync (client-side), progress, search/filter, calendar, language and improved dark mode

        const STORAGE_KEY = 'bv_app_v4';
        const THEME_KEY = 'bv_theme_v4';
        const LANG_KEY = 'bv_lang_v4';

        // ====== IMPORTANT ======
        // Replace the placeholder below with your Google OAuth Client ID (Web application).
        const GOOGLE_CLIENT_ID = 'REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com';
        const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
        const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
        // =======================

        const defaultTemplates = {
            standard: [
                { name: 'BCG', weeks: 0 },
                { name: 'Hepatitis B (1st)', weeks: 0 },
                { name: 'OPV (0)', weeks: 0 },
                { name: 'DPT/DTaP (1st)', weeks: 6 },
                { name: 'OPV (1)', weeks: 6 },
                { name: 'Hep B (2nd)', weeks: 6 },
                { name: 'DPT/DTaP (2nd)', weeks: 10 },
                { name: 'OPV (2)', weeks: 10 },
                { name: 'DPT/DTaP (3rd)', weeks: 14 },
                { name: 'OPV (3)', weeks: 14 },
                { name: 'Measles', weeks: 39 }
            ],
            bangladesh: [
                { name: 'BCG', weeks: 0 },
                { name: 'Hepatitis B (1st)', weeks: 0 },
                { name: 'OPV (0)', weeks: 0 },
                { name: 'Penta (1)', weeks: 6 },
                { name: 'OPV (1)', weeks: 6 },
                { name: 'Penta (2)', weeks: 10 },
                { name: 'OPV (2)', weeks: 10 },
                { name: 'Penta (3)', weeks: 14 },
                { name: 'OPV (3)', weeks: 14 },
                { name: 'Measles (1st)', weeks: 39 }
            ]
        }

        let state = { babies: [], selectedBabyId: null, template: 'standard', customVaccines: [] }
        const $ = id => document.getElementById(id);

        // helpers
        function addWeeks(date, weeks) { const d = new Date(date); d.setDate(d.getDate() + weeks * 7); return d; }
        function formatDateLocal(d) { const dt = new Date(d); if (isNaN(dt)) return '-'; return dt.toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-US'); }
        function uid() { return 'b' + Math.random().toString(36).slice(2, 9) }

        // persistence
        function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        function load() { const s = localStorage.getItem(STORAGE_KEY); if (s) state = JSON.parse(s); renderAll(); }

        // language & theme
        let currentLang = localStorage.getItem(LANG_KEY) || 'bn';
        function setLang(lang) { currentLang = lang; localStorage.setItem(LANG_KEY, lang); translateUI(); }
        function translateUI() {
            if (currentLang === 'en') {
                $('appTitle').textContent = 'Baby Vaccination Reminder';
                $('appSubtitle').textContent = 'Save schedules and get reminders';
                $('sectionTitle').textContent = 'Add baby';
                $('lblName').textContent = 'Baby name';
                $('lblDob').textContent = 'Date of birth';
                $('lblGender').textContent = 'Gender';
                $('progressTitle').textContent = 'Progress';
                $('asideTitle').textContent = 'Schedule & Calendar';
                $('vaccinesTitle').textContent = 'Vaccine list';
                $('addBaby').textContent = 'Add baby';
                $('clearAll').textContent = 'Clear all';
                $('exportCsv').textContent = 'Export CSV';
                $('notifyPerm').textContent = 'Notifications';
                $('addCustomVaccine').textContent = 'Add custom';
                $('syncGoogle').textContent = 'Connect & Sync Google';
                $('exportIcal').textContent = 'Export iCal';
            } else {
                $('appTitle').textContent = 'Baby টিকা রিমাইন্ডার';
                $('appSubtitle').textContent = 'টিকা শিডিউল সংরক্ষণ করুন, রিমাইন্ডার পেয়ে যান';
                $('sectionTitle').textContent = 'শিশু যোগ করুন';
                $('lblName').textContent = 'শিশুর নাম';
                $('lblDob').textContent = 'জন্ম তারিখ';
                $('lblGender').textContent = 'লিঙ্গ';
                $('progressTitle').textContent = 'Progress';
                $('asideTitle').textContent = 'শিডিউল ও ক্যালেন্ডার';
                $('vaccinesTitle').textContent = 'টিকা তালিকা';
                $('addBaby').textContent = 'শিশু যোগ করুন';
                $('clearAll').textContent = 'সব মুছুন';
                $('exportCsv').textContent = 'CSV';
                $('notifyPerm').textContent = 'নোটিফিকেশন';
                $('addCustomVaccine').textContent = 'যোগ করুন';
                $('syncGoogle').textContent = 'Connect & Sync Google';
                $('exportIcal').textContent = 'Export iCal';
            }
        }
        function setTheme(theme) { if (theme === 'dark') { document.body.classList.add('dark'); $('darkToggle').textContent = '☀️'; localStorage.setItem(THEME_KEY, 'dark'); } else { document.body.classList.remove('dark'); $('darkToggle').textContent = '🌙'; localStorage.setItem(THEME_KEY, 'light'); } }
        function initTheme() { const t = localStorage.getItem(THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); setTheme(t); }

        // rendering
        function renderAll() { renderBabies(); renderVaccines(); renderProgress(); renderCalendar(); }

        function renderBabies() { const list = $('babyList'); list.innerHTML = ''; state.babies.forEach(b => { const el = document.createElement('div'); el.className = 'baby-item'; el.innerHTML = `<div><strong>${escapeHtml(b.name)}</strong><div class="small" style="color:var(--muted)">DOB: ${b.dob ? formatDateLocal(b.dob) : '-'} ${b.gender ? ' • ' + (b.gender === 'male' ? (currentLang === 'bn' ? 'ছেলে' : 'Male') : (currentLang === 'bn' ? 'মেয়ে' : 'Female')) : ''}</div></div><div style="display:flex;gap:8px"><button class="btn ghost" onclick="selectBaby('${b.id}')">${state.selectedBabyId === b.id ? (currentLang === 'bn' ? 'নির্বাচিত' : 'Selected') : (currentLang === 'bn' ? 'বেছে নিন' : 'Select')}</button><button class="btn" onclick="deleteBaby('${b.id}')">${currentLang === 'bn' ? 'মুছুন' : 'Delete'}</button></div>`; list.appendChild(el); }) }

        function getVaccineListForBaby(baby) { const template = defaultTemplates[state.template] || defaultTemplates.standard; return [...template, ...state.customVaccines].map(v => ({ name: v.name, weeks: v.weeks, due: addWeeks(baby.dob, Number(v.weeks)) })); }

        function renderVaccines() { const section = $('vaccineList'); section.innerHTML = ''; const baby = state.babies.find(b => b.id === state.selectedBabyId); if (!baby) { section.innerHTML = `<div class="small" style="color:var(--muted)">${currentLang === 'bn' ? 'দয়া করে বাম থেকে একজন শিশু যোগ করে নির্বাচন করুন।' : 'Please add and select a baby from left.'}</div>`; return } const q = $('searchInput').value.toLowerCase(); const filter = $('filterSelect').value; const vaccines = getVaccineListForBaby(baby).sort((a, b) => new Date(a.due) - new Date(b.due)); vaccines.forEach(v => { const today = new Date(); const dueDate = new Date(v.due); const doneKey = `done_${baby.id}_${v.name}_${dueDate.toISOString().slice(0, 10)}`; const done = localStorage.getItem(doneKey) === '1'; const isOverdue = dueDate < new Date(new Date().setHours(0, 0, 0, 0)) && !done; const isDueSoon = (dueDate - today) <= (7 * 24 * 60 * 60 * 1000) && (dueDate - today) >= 0; const matchesQ = v.name.toLowerCase().includes(q) || baby.name.toLowerCase().includes(q); if (!matchesQ) return; if (filter === 'completed' && !done) return; if (filter === 'pending' && done) return; if (filter === 'overdue' && !isOverdue) return; const el = document.createElement('div'); el.className = 'v-item'; if (done) el.classList.add('done'); el.innerHTML = `<div><div style="font-weight:600">${escapeHtml(v.name)}</div><div class="small" style="color:var(--muted)">${currentLang === 'bn' ? 'নির্ধারিত' : 'Due'}: ${formatDateLocal(dueDate)} • ${v.weeks} ${currentLang === 'bn' ? 'সপ্তাহ পরে' : 'weeks after birth'}</div></div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><div style="font-size:.9rem;color:${isOverdue ? 'var(--danger)' : isDueSoon ? 'crimson' : 'var(--muted)'}">${isOverdue ? (currentLang === 'bn' ? 'Overdue' : 'Overdue') : isDueSoon ? (currentLang === 'bn' ? 'শীঘ্রই' : 'Soon') : (currentLang === 'bn' ? 'পরবর্তী' : 'Upcoming')}</div><div style="display:flex;gap:8px"><button class="btn ghost" onclick="toggleDone('${doneKey}')">${done ? (currentLang === 'bn' ? 'অনমার্ক' : 'Unmark') : (currentLang === 'bn' ? 'মার্ক সম্পন্ন' : 'Mark done')}</button><button class="btn" onclick="snooze('${baby.id}','${escapeJs(v.name)}','${dueDate.toISOString().slice(0, 10)}')">${currentLang === 'bn' ? 'স্মরণ' : 'Snooze'}</button></div></div>`; if (isOverdue) el.querySelector('.small').insertAdjacentHTML('beforebegin', `<div class="badge overdue">${currentLang === 'bn' ? 'ওভারডিউ' : 'Overdue'}</div>`); section.appendChild(el); if (isDueSoon && window.Notification && Notification.permission === 'granted') { notify(`${baby.name} - ${v.name}`, `${formatDateLocal(dueDate)}`); } }) }

        function renderProgress() { const baby = state.babies.find(b => b.id === state.selectedBabyId); if (!baby) { $('progressBar').style.width = '0%'; $('progressText').textContent = currentLang === 'bn' ? '0% completed' : '0% completed'; return } const vacs = getVaccineListForBaby(baby); const total = vacs.length; let done = 0; vacs.forEach(v => { const dueDate = new Date(v.due); const key = `done_${baby.id}_${v.name}_${dueDate.toISOString().slice(0, 10)}`; if (localStorage.getItem(key) === '1') done++; }); const pct = total ? Math.round(done / total * 100) : 0; $('progressBar').style.width = pct + '%'; $('progressText').textContent = pct + '% completed'; }

        // calendar
        let calDate = new Date(); function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
        function renderCalendar() { const cal = $('calendar'); cal.innerHTML = ''; const start = startOfMonth(calDate); const year = start.getFullYear(); const month = start.getMonth(); const firstWeekDay = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate(); $('calendarMonth').textContent = start.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' }); $('calendarYear').textContent = year; for (let i = 0; i < firstWeekDay; i++) { const b = document.createElement('div'); b.className = 'cal-day'; b.innerHTML = ''; cal.appendChild(b); } for (let d = 1; d <= days; d++) { const dayDiv = document.createElement('div'); dayDiv.className = 'cal-day'; const thisDate = new Date(year, month, d); const iso = thisDate.toISOString().slice(0, 10); dayDiv.innerHTML = `<div class="date">${d}</div>`; state.babies.forEach(b => { getVaccineListForBaby(b).forEach(v => { const due = new Date(v.due); if (due.toISOString().slice(0, 10) === iso) { const doneKey = `done_${b.id}_${v.name}_${iso}`; const done = localStorage.getItem(doneKey) === '1'; const el = document.createElement('div'); el.innerHTML = `<div class="small">${escapeHtml(b.name)} - ${escapeHtml(v.name)} ${done ? '✓' : ''}</div>`; if (!done && due < new Date(new Date().setHours(0, 0, 0, 0))) dayDiv.classList.add('overdue'); dayDiv.appendChild(el); } }); }); cal.appendChild(dayDiv); } }

        // actions
        function selectBaby(id) { state.selectedBabyId = id; save(); renderAll(); }
        function deleteBaby(id) { if (!confirm(currentLang === 'bn' ? 'মুছে ফেলতে চান?' : 'Delete?')) return; state.babies = state.babies.filter(b => b.id !== id); if (state.selectedBabyId === id) state.selectedBabyId = null; save(); renderAll(); }
        function addBaby() { const name = $('babyName').value.trim(); const dob = $('babyDob').value; const gender = $('babyGender').value; if (!name || !dob) { alert(currentLang === 'bn' ? 'নাম এবং জন্মতারিখ দিন' : 'Please provide name and DOB'); return } const newB = { id: uid(), name, dob, gender }; state.babies.push(newB); state.selectedBabyId = newB.id; save(); $('babyName').value = ''; $('babyDob').value = ''; renderAll(); }
        function clearAll() { if (!confirm(currentLang === 'bn' ? 'সব তথ্য মুছে ফেলা হবে — আপনি কি নিশ্চিত?' : 'All data will be cleared — are you sure?')) return; localStorage.removeItem(STORAGE_KEY); Object.keys(localStorage).forEach(k => { if (k.startsWith('done_')) localStorage.removeItem(k) }); state = { babies: [], selectedBabyId: null, template: 'standard', customVaccines: [] }; renderAll(); }
        function addCustomVaccine() { const name = $('customVaccineName').value.trim(); const weeks = $('customVaccineWeeks').value; if (!name || weeks === '') { alert(currentLang === 'bn' ? 'টিকা নাম ও সপ্তাহ দিন' : 'Provide vaccine name and weeks'); return } state.customVaccines.push({ name, weeks }); save(); $('customVaccineName').value = ''; $('customVaccineWeeks').value = ''; renderAll(); }
        function toggleDone(key) { if (localStorage.getItem(key) === '1') localStorage.removeItem(key); else localStorage.setItem(key, '1'); renderAll(); }
        function snooze(babyId, vname, vdate) { const t = prompt(currentLang === 'bn' ? 'কত মিনিট পরে স্মরণ করবেন?' : 'Remind after how many minutes?', '60'); const min = Number(t); if (!min || min <= 0) return; setTimeout(() => { notify(vname + ' — ' + vdate, currentLang === 'bn' ? 'সময় হয়েছে — টিকা দেয়া প্রয়োজন।' : 'Time to vaccinate'); alert((currentLang === 'bn' ? 'স্মরণ: ' : 'Reminder: ') + vname + ' - ' + vdate); }, min * 60 * 1000); alert(currentLang === 'bn' ? 'স্মরণ নির্ধারিত — অ্যাপ খুলে থাকলে কাজ করবে।' : 'Snooze set — will work if app is open.'); }
        function notify(title, body) { try { new Notification(title, { body }); } catch (e) { console.warn('notify failed', e); } }
        function requestNotification() { if (!('Notification' in window)) { alert(currentLang === 'bn' ? 'আপনার ব্রাউজারে নোটিফিকেশন সাপোর্ট নেই' : 'Notifications not supported in your browser'); return } Notification.requestPermission().then(p => { if (p === 'granted') alert(currentLang === 'bn' ? 'নোটিফিকেশন অনুমোদন দেওয়া হয়েছে' : 'Notifications granted'); else alert(currentLang === 'bn' ? 'অনুমোদন দেওয়া হয়নি' : 'Not granted'); }); }

        function exportICal() { const baby = state.babies.find(b => b.id === state.selectedBabyId); if (!baby) { alert(currentLang === 'bn' ? 'প্রথমে একটি শিশু নির্বাচন করুন' : 'Select a baby first'); return } const events = getVaccineListForBaby(baby).map(v => { const start = new Date(v.due); const end = new Date(start.getTime() + 30 * 60 * 1000); return { title: `${baby.name} - ${v.name}`, start, end, desc: 'Vaccine reminder' } }); const pad = n => String(n).padStart(2, '0'); function toICSDate(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; } let ics = 'BEGIN:VCALENDAR\\r\\nVERSION:2.0\\r\\nPRODID:-//BabyReminder//EN\\r\\n'; events.forEach(e => { ics += 'BEGIN:VEVENT\\r\\n'; ics += `UID:${Math.random().toString(36).slice(2)}@babyreminder\\r\\n`; ics += `DTSTAMP:${toICSDate(new Date())}\\r\\n`; ics += `DTSTART:${toICSDate(e.start)}\\r\\n`; ics += `DTEND:${toICSDate(e.end)}\\r\\n`; ics += `SUMMARY:${e.title}\\r\\n`; ics += `DESCRIPTION:${e.desc}\\r\\n`; ics += 'END:VEVENT\\r\\n'; }); ics += 'END:VCALENDAR\\r\\n'; const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${baby.name.replace(/\\s+/g, '_')}_vaccines.ics`; a.click(); URL.revokeObjectURL(url); }

        // ==== Google Calendar client-side OAuth & sync ====
        let gapiInited = false;
        let tokenClient;

        function gapiLoad() {
            if (window.gapi) {
                gapi.load('client', initGapiClient);
            }
        }

        async function initGapiClient() {
            try {
                await gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
                gapiInited = true;
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: (resp) => {
                        if (resp.error) { alert('Auth error: ' + resp.error); } else { alert('Authenticated — you can now sync to Google Calendar'); }
                    }
                });
            } catch (err) { console.error('gapi init failed', err); alert('Google API init failed: ' + (err.message || err)); }
        }

        function connectAndSyncGoogle() {
            if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('REPLACE_WITH')) { alert('Please set GOOGLE_CLIENT_ID in the code (create OAuth credentials in Google Cloud Console)'); return; }
            if (!gapiInited) { gapiLoad(); setTimeout(() => { connectAndSyncGoogle(); }, 800); return; }
            tokenClient.requestAccessToken({ prompt: 'consent' });
            setTimeout(() => { syncSelectedBabyToGoogle(); }, 1400);
        }

        async function syncSelectedBabyToGoogle() {
            const baby = state.babies.find(b => b.id === state.selectedBabyId);
            if (!baby) { alert(currentLang === 'bn' ? 'প্রথমে একটি শিশু নির্বাচন করুন' : 'Select a baby first'); return }
            if (!gapiInited) { alert('Google API not ready'); return }

            const events = getVaccineListForBaby(baby).map(v => {
                const start = new Date(v.due); const end = new Date(start.getTime() + 30 * 60 * 1000);
                return {
                    summary: `${baby.name} - ${v.name}`,
                    description: 'Vaccine reminder',
                    start: { dateTime: start.toISOString() },
                    end: { dateTime: end.toISOString() }
                }
            });

            let created = 0;
            for (const ev of events) {
                try {
                    const res = await gapi.client.calendar.events.insert({ calendarId: 'primary', resource: ev });
                    if (res.status === 200 || res.status === 201) created++;
                } catch (err) { console.error('insert event failed', err); }
            }
            alert((currentLang === 'bn' ? 'সম্পন্ন: ' : 'Done: ') + created + ' / ' + events.length + (currentLang === 'bn' ? ' ইভেন্ট Google Calendar-এ যোগ করা হয়েছে।' : ' events added to Google Calendar.'));
        }

        // small helpers
        function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[m])); }
        function escapeJs(s) { return String(s || '').replace(/'/g, "\\'").replace(/\n/g, ' '); }

        // UI wiring
        $('addBaby').addEventListener('click', addBaby);
        $('clearAll').addEventListener('click', clearAll);
        $('addCustomVaccine').addEventListener('click', addCustomVaccine);
        $('notifyPerm').addEventListener('click', requestNotification);
        $('exportIcal').addEventListener('click', exportICal);
        $('exportCsv').addEventListener('click', exportICal);
        $('syncGoogle').addEventListener('click', connectAndSyncGoogle);
        $('searchInput').addEventListener('input', renderVaccines);
        $('filterSelect').addEventListener('change', renderVaccines);
        $('templateSelect').addEventListener('change', e => { state.template = e.target.value; save(); renderAll(); });

        $('darkToggle').addEventListener('click', () => { const isDark = document.body.classList.contains('dark'); setTheme(isDark ? 'light' : 'dark'); });
        $('langSelect').value = currentLang; $('langSelect').addEventListener('change', e => setLang(e.target.value));

        $('prevMonth').addEventListener('click', () => { calDate = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1); renderCalendar(); });
        $('nextMonth').addEventListener('click', () => { calDate = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1); renderCalendar(); });

        window.addEventListener('load', () => {
            initTheme(); setLang(currentLang); load();
            const checkG = setInterval(() => { if (window.gapi && window.google && !gapiInited) { clearInterval(checkG); initGapiClient(); } }, 500);
        });
        window.addEventListener('beforeunload', save);