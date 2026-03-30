/**
 * GitHub Integration
 * Repositories, issues, pull requests, commits, and webhooks
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BASE_URL = 'https://api.github.com';

async function githubRequest(path, method = 'GET', body = null) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not configured');

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return { success: true };
  const data = await response.json();
  if (!response.ok) throw new Error(`GitHub API error (${response.status}): ${data.message}`);
  return data;
}

export const github = {
  // ── Repositories ───────────────────────────────────────────────────────────
  async getRepo(owner, repo) {
    return githubRequest(`/repos/${owner}/${repo}`);
  },

  async listRepos({ type = 'all', sort = 'updated', perPage = 30 } = {}) {
    return githubRequest(`/user/repos?type=${type}&sort=${sort}&per_page=${perPage}`);
  },

  async createRepo({ name, description, isPrivate = false, autoInit = true }) {
    return githubRequest('/user/repos', 'POST', {
      name,
      description,
      private: isPrivate,
      auto_init: autoInit,
    });
  },

  // ── Issues ─────────────────────────────────────────────────────────────────
  async createIssue(owner, repo, { title, body, labels = [], assignees = [], milestone }) {
    return githubRequest(`/repos/${owner}/${repo}/issues`, 'POST', {
      title, body, labels, assignees, milestone,
    });
  },

  async listIssues(owner, repo, { state = 'open', labels, perPage = 30 } = {}) {
    const params = new URLSearchParams({ state, per_page: perPage });
    if (labels) params.append('labels', labels);
    return githubRequest(`/repos/${owner}/${repo}/issues?${params}`);
  },

  async updateIssue(owner, repo, issueNumber, updates) {
    return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`, 'PATCH', updates);
  },

  async addIssueComment(owner, repo, issueNumber, body) {
    return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, 'POST', { body });
  },

  // ── Pull Requests ──────────────────────────────────────────────────────────
  async createPR(owner, repo, { title, body, head, base, draft = false }) {
    return githubRequest(`/repos/${owner}/${repo}/pulls`, 'POST', {
      title, body, head, base, draft,
    });
  },

  async listPRs(owner, repo, { state = 'open', perPage = 30 } = {}) {
    return githubRequest(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`);
  },

  async mergePR(owner, repo, pullNumber, { commitTitle, mergeMethod = 'merge' } = {}) {
    return githubRequest(`/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, 'PUT', {
      commit_title: commitTitle,
      merge_method: mergeMethod,
    });
  },

  // ── Commits ────────────────────────────────────────────────────────────────
  async listCommits(owner, repo, { sha, perPage = 30 } = {}) {
    const params = new URLSearchParams({ per_page: perPage });
    if (sha) params.append('sha', sha);
    return githubRequest(`/repos/${owner}/${repo}/commits?${params}`);
  },

  async getCommit(owner, repo, ref) {
    return githubRequest(`/repos/${owner}/${repo}/commits/${ref}`);
  },

  // ── Branches ───────────────────────────────────────────────────────────────
  async listBranches(owner, repo) {
    return githubRequest(`/repos/${owner}/${repo}/branches`);
  },

  async createBranch(owner, repo, { branchName, fromSha }) {
    return githubRequest(`/repos/${owner}/${repo}/git/refs`, 'POST', {
      ref: `refs/heads/${branchName}`,
      sha: fromSha,
    });
  },

  // ── Webhooks ───────────────────────────────────────────────────────────────
  async createWebhook(owner, repo, { url, events = ['push', 'pull_request'], secret }) {
    return githubRequest(`/repos/${owner}/${repo}/hooks`, 'POST', {
      name: 'web',
      active: true,
      events,
      config: { url, content_type: 'json', secret, insecure_ssl: '0' },
    });
  },

  // ── Search ─────────────────────────────────────────────────────────────────
  async searchCode(query, { perPage = 10 } = {}) {
    return githubRequest(`/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}`);
  },

  async searchRepos(query, { sort = 'stars', perPage = 10 } = {}) {
    return githubRequest(`/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&per_page=${perPage}`);
  },

  isConfigured: () => !!GITHUB_TOKEN,
};

export default github;
