import httpx
import re
import os

token = os.getenv("GITHUB_TOKEN", "")
headers = {
    "User-Agent": "SkillTwin-Verification-Engine/1.0",
    "Accept": "application/vnd.github.v3+json"
}
if token:
    headers["Authorization"] = f"token {token}"

def analyze_repo_commits(owner: str, repo: str):
    with httpx.Client(timeout=10.0) as client:
        # 1. Fetch repo metadata
        repo_res = client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        if repo_res.status_code == 404:
            return {"error": "Repository not found or private", "status": 404}
        elif repo_res.status_code in (403, 429):
            return {"error": "GitHub API rate limit exceeded", "status": 429}
        elif repo_res.status_code != 200:
            return {"error": f"GitHub API error ({repo_res.status_code})", "status": repo_res.status_code}

        repo_data = repo_res.json()

        # 2. Fetch commits (page 1)
        commits_res = client.get(f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=100", headers=headers)
        if commits_res.status_code == 409 or (commits_res.status_code == 200 and not commits_res.json()):
            return {
                "owner": owner,
                "repo": repo,
                "total_commits": 0,
                "commits": [],
                "description": repo_data.get("description"),
                "language": repo_data.get("language")
            }
        elif commits_res.status_code != 200:
            return {"error": f"Failed to fetch commits ({commits_res.status_code})", "status": commits_res.status_code}

        commits_page_1 = commits_res.json()
        link_header = commits_res.headers.get("link", "")

        total_commits = len(commits_page_1)

        # Check for pagination in Link header
        # Pattern: <https://api.github.com/...page=5>; rel="last"
        match = re.search(r'page=(\d+)[^>]*>;\s*rel=["\']last["\']', link_header)
        if match:
            last_page = int(match.group(1))
            # Fetch last page to get the exact final count
            last_page_res = client.get(f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=100&page={last_page}", headers=headers)
            if last_page_res.status_code == 200:
                last_page_commits = last_page_res.json()
                total_commits = (last_page - 1) * 100 + len(last_page_commits)
            else:
                total_commits = last_page * 100

        parsed_commits = []
        for c in commits_page_1[:10]: # Store real commit details for evidence
            commit_obj = c.get("commit", {})
            author_obj = commit_obj.get("author", {})
            parsed_commits.append({
                "sha": c.get("sha", "")[:7],
                "message": commit_obj.get("message", "").split("\n")[0],
                "author": author_obj.get("name", ""),
                "date": author_obj.get("date", ""),
                "url": c.get("html_url", "")
            })

        return {
            "owner": owner,
            "repo": repo,
            "total_commits": total_commits,
            "recent_commits": parsed_commits,
            "description": repo_data.get("description"),
            "language": repo_data.get("language"),
            "default_branch": repo_data.get("default_branch", "main"),
            "stargazers": repo_data.get("stargazers_count", 0),
            "forks": repo_data.get("forks_count", 0),
            "topics": repo_data.get("topics", [])
        }

if __name__ == "__main__":
    for repo_spec in [("octocat", "Hello-World"), ("pallets", "flask")]:
        result = analyze_repo_commits(repo_spec[0], repo_spec[1])
        print(f"[{repo_spec[0]}/{repo_spec[1]}] Total Commits: {result.get('total_commits')}")
        for c in result.get("recent_commits", [])[:3]:
            print(f"  - {c['sha']}: {c['message']} by {c['author']} ({c['date']})")
