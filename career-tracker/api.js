// ================================================
// キャリアトラッカー — APIクライアント
// ================================================

const API_BASE = `http://${window.location.hostname}:3001/api/career`;

const api = {
  async _req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Ikigai
  getIkigai:    ()         => api._req('GET',  '/ikigai'),
  saveIkigai:   (data)     => api._req('PUT',  '/ikigai', data),

  // スキル
  getSkills:    ()         => api._req('GET',  '/skills'),
  addSkill:     (data)     => api._req('POST', '/skills', data),
  updateSkill:  (id, data) => api._req('PATCH',`/skills/${id}`, data),
  deleteSkill:  (id)       => api._req('DELETE',`/skills/${id}`),

  // 目標
  getGoals:     ()         => api._req('GET',  '/goals'),
  addGoal:      (data)     => api._req('POST', '/goals', data),
  updateGoal:   (id, data) => api._req('PATCH',`/goals/${id}`, data),
  deleteGoal:   (id)       => api._req('DELETE',`/goals/${id}`),

  // 学習ログ
  getLearning:  ()         => api._req('GET',  '/learning'),
  addLearning:  (data)     => api._req('POST', '/learning', data),
  deleteLearning:(id)      => api._req('DELETE',`/learning/${id}`),

  // フォーカス
  getFocus:     ()         => api._req('GET',  '/focus'),
  addFocus:     (data)     => api._req('POST', '/focus', data),
  updateFocus:  (id, data) => api._req('PATCH',`/focus/${id}`, data),
  deleteFocus:  (id)       => api._req('DELETE',`/focus/${id}`),

  // 経歴
  getExperiences:   ()         => api._req('GET',  '/experiences'),
  addExperience:    (data)     => api._req('POST', '/experiences', data),
  updateExperience: (id, data) => api._req('PATCH',`/experiences/${id}`, data),
  deleteExperience: (id)       => api._req('DELETE',`/experiences/${id}`),
};
