import fetch from "node-fetch";

const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || "").trim();
const OWNER = (process.env.GITHUB_OWNER || "telebottg7-sudo").trim();
const REPO = (process.env.GITHUB_REPO || "Avdb").trim();
const BRANCH = (process.env.GITHUB_BRANCH || "main").trim();

if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN environment variable is missing.");
  process.exit(1);
}

async function clearGitHubRepo() {
  console.log(`[GitHub Clear] Targeted Repository: ${OWNER}/${REPO} on branch ${BRANCH}`);

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "Avdb-Clear-Script",
  };

  // 1. Get latest commit on target branch
  const refRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, { headers });
  if (!refRes.ok) {
    const errText = await refRes.text();
    throw new Error(`Failed to get ref for branch ${BRANCH}: [${refRes.status}] ${errText}`);
  }
  const refData = (await refRes.json()) as { object: { sha: string } };
  const parentCommitSha = refData.object.sha;
  console.log(`[GitHub Clear] Latest Commit SHA: ${parentCommitSha}`);

  // 2. Prepare clean initial index payloads for database/
  const now = new Date().toISOString();
  const initialFiles = [
    {
      path: "database/index/latest.json",
      content: JSON.stringify({ version: 1, updatedAt: now, totalCount: 0, videos: [] }, null, 2),
    },
    {
      path: "database/index/actresses.json",
      content: JSON.stringify({ version: 1, updatedAt: now, totalCount: 0, actresses: [] }, null, 2),
    },
    {
      path: "database/index/studios.json",
      content: JSON.stringify({ version: 1, updatedAt: now, totalCount: 0, studios: [] }, null, 2),
    },
    {
      path: "database/index/stats.json",
      content: JSON.stringify(
        {
          version: 1,
          updatedAt: now,
          totalVideos: 0,
          totalActresses: 0,
          totalStudios: 0,
          totalCodes: 0,
        },
        null,
        2
      ),
    },
    {
      path: "README.md",
      content: `# Avdb Database\n\nCanonical database repository for Avdb metadata.\n`,
    },
  ];

  // 3. Create blobs for each initial file
  const treeItems = [];
  for (const file of initialFiles) {
    const blobRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: file.content,
        encoding: "utf-8",
      }),
    });
    if (!blobRes.ok) {
      const err = await blobRes.text();
      throw new Error(`Failed to create blob for ${file.path}: ${err}`);
    }
    const blobData = (await blobRes.json()) as { sha: string };
    treeItems.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blobData.sha,
    });
  }

  // 4. Create new tree WITHOUT base_tree (this completely replaces the tree, deleting all previous files)
  const treeRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tree: treeItems,
    }),
  });
  if (!treeRes.ok) {
    const err = await treeRes.text();
    throw new Error(`Failed to create tree: ${err}`);
  }
  const treeData = (await treeRes.json()) as { sha: string };
  console.log(`[GitHub Clear] New Root Tree SHA created: ${treeData.sha}`);

  // 5. Create new commit
  const commitRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: "Reset and clear database repository to canonical initial state",
      tree: treeData.sha,
      parents: [parentCommitSha],
    }),
  });
  if (!commitRes.ok) {
    const err = await commitRes.text();
    throw new Error(`Failed to create commit: ${err}`);
  }
  const commitData = (await commitRes.json()) as { sha: string };
  console.log(`[GitHub Clear] New Commit SHA created: ${commitData.sha}`);

  // 6. Update reference refs/heads/main
  const updateRefRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      sha: commitData.sha,
      force: true,
    }),
  });
  if (!updateRefRes.ok) {
    const err = await updateRefRes.text();
    throw new Error(`Failed to update ref: ${err}`);
  }

  console.log(`[GitHub Clear] Successfully reset and cleared GitHub repository ${OWNER}/${REPO}!`);
}

clearGitHubRepo().catch((err) => {
  console.error("[GitHub Clear Error]:", err.message);
  process.exit(1);
});
