(function () {
  'use strict';

  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  const STORAGE_KEY = 'dayplanner_data';
  const CAL_CIRCUM = 339.292;

  let state = loadState();

  // ---- Utils ----
  function today() { return new Date().toISOString().slice(0, 10); }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { tasks: {}, foods: {}, calGoal: 2000 };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getDayTasks() { return state.tasks[today()] || []; }
  function setDayTasks(t) { state.tasks[today()] = t; saveState(); renderAll(); }

  function getDayFoods() { return state.foods[today()] || []; }
  function setDayFoods(f) { state.foods[today()] = f; saveState(); renderAll(); }

  function totalCal() {
    return getDayFoods().reduce((s, f) => s + (f.cal || 0), 0);
  }

  // ---- Render ----
  function renderTasks() {
    const list = $('#task-list');
    const empty = $('#empty-tasks');
    const tasks = getDayTasks();

    if (!tasks.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = tasks.map((t, i) => `
      <li class="task-item${t.done ? ' done' : ''}" data-idx="${i}">
        <button class="task-check" data-action="toggle">${t.done ? '✓' : ''}</button>
        <span class="task-text">${esc(t.text)}</span>
        <span class="task-time">${t.time || ''}</span>
        <button class="task-delete" data-action="delete">✕</button>
      </li>
    `).join('');
  }

  function renderFoods() {
    const list = $('#food-list');
    const empty = $('#empty-foods');
    const foods = getDayFoods();

    if (!foods.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = foods.map((f, i) => `
      <li class="food-item" data-idx="${i}">
        <span class="food-name">${esc(f.name)}</span>
        <span class="food-cal">${f.cal} ккал</span>
        <button class="food-delete" data-action="delete">✕</button>
      </li>
    `).join('');
  }

  function renderCalories() {
    const consumed = totalCal();
    const goal = state.calGoal || 2000;
    const remaining = Math.max(0, goal - consumed);
    const pct = Math.min(1, consumed / goal);

    $('#cal-consumed').textContent = consumed;
    $('#cal-goal').textContent = goal;
    $('#cal-consumed-stat').textContent = consumed;
    $('#cal-remaining-stat').textContent = remaining;

    const offset = CAL_CIRCUM - (pct * CAL_CIRCUM);
    const circle = $('#cal-progress');
    if (circle) circle.style.strokeDashoffset = offset;
  }

  function renderAll() {
    renderTasks();
    renderFoods();
    renderCalories();
  }

  // ---- Modals ----
  function openModal(title, contentHtml) {
    $('#modal-title').textContent = title;
    $('#modal-content').innerHTML = contentHtml;
    $('#modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    $('#modal-overlay').classList.add('hidden');
  }

  function showTaskModal() {
    openModal('Новая задача', `
      <div class="form-group">
        <label>Что нужно сделать?</label>
        <input type="text" id="task-input" placeholder="Например: позавтракать" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Время</label>
        <input type="time" id="time-input">
      </div>
      <button class="btn-primary" id="save-task-btn">Добавить</button>
    `);

    const input = $('#task-input');
    input.focus();

    $('#save-task-btn').onclick = () => {
      const text = input.value.trim();
      if (!text) return;
      const time = $('#time-input').value;
      const tasks = getDayTasks();
      tasks.push({ text, time, done: false });
      setDayTasks(tasks);
      closeModal();
    };
  }

  function showFoodModal() {
    openModal('Добавить еду', `
      <div class="form-group">
        <label>Название</label>
        <input type="text" id="food-name-input" placeholder="Например: овсянка" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Калории</label>
        <input type="number" id="food-cal-input" placeholder="350" min="0" max="99999">
      </div>
      <button class="btn-primary" id="save-food-btn">Добавить</button>
    `);

    $('#food-name-input').focus();

    $('#save-food-btn').onclick = () => {
      const name = $('#food-name-input').value.trim();
      const cal = parseInt($('#food-cal-input').value, 10);
      if (!name || isNaN(cal) || cal <= 0) return;
      const foods = getDayFoods();
      foods.push({ name, cal });
      setDayFoods(foods);
      closeModal();
    };
  }

  // ---- Handlers ----
  function onTaskAction(e) {
    const li = e.target.closest('.task-item');
    if (!li) return;
    const idx = parseInt(li.dataset.idx, 10);
    const action = e.target.dataset.action;
    if (action === 'toggle') {
      const tasks = getDayTasks();
      tasks[idx].done = !tasks[idx].done;
      setDayTasks(tasks);
    } else if (action === 'delete') {
      const tasks = getDayTasks();
      tasks.splice(idx, 1);
      setDayTasks(tasks);
    }
  }

  function onFoodAction(e) {
    const li = e.target.closest('.food-item');
    if (!li) return;
    const idx = parseInt(li.dataset.idx, 10);
    if (e.target.dataset.action === 'delete') {
      const foods = getDayFoods();
      foods.splice(idx, 1);
      setDayFoods(foods);
    }
  }

  // ---- Init ----
  function init() {
    // Date
    const d = new Date();
    const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    const days = ['вс','пн','вт','ср','чт','пт','сб'];
    $('#header-date').textContent =
      `${d.getDate()} ${months[d.getMonth()]}, ${days[d.getDay()]}`;

    // Tab switching
    $$('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $(`#tab-${btn.dataset.tab}`).classList.add('active');
      };
    });

    // Actions
    $('#add-task-btn').onclick = showTaskModal;
    $('#add-food-btn').onclick = showFoodModal;
    $('#task-list').onclick = onTaskAction;
    $('#food-list').onclick = onFoodAction;
    $('#modal-overlay').onclick = (e) => { if (e.target === $('#modal-overlay')) closeModal(); };
    $('#modal-close').onclick = closeModal;

    // Settings
    $('#cal-goal-input').value = state.calGoal || 2000;
    $('#cal-goal-input').onchange = () => {
      const v = parseInt($('#cal-goal-input').value, 10);
      if (v >= 500 && v <= 10000) { state.calGoal = v; saveState(); renderCalories(); }
    };

    $('#reset-day-btn').onclick = () => {
      if (confirm('Сбросить все задачи и приёмы пищи за сегодня?')) {
        state.tasks[today()] = [];
        state.foods[today()] = [];
        saveState(); renderAll();
      }
    };

    $('#reset-all-btn').onclick = () => {
      if (confirm('Сбросить ВСЕ данные?')) {
        state = { tasks: {}, foods: {}, calGoal: state.calGoal };
        saveState(); renderAll();
      }
    };

    // Telegram
    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
    }

    renderAll();
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
