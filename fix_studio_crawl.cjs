const fs = require('fs');
const file = 'src/components/views/BulkScraperView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /details: data\.commitSha[\s\S]*?checkUncommitted\(\);/g;

content = content.replace(regex, `details: data.autoCommitEnabled
            ? \`GitHub Atomic Commit: \${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"}\`
            : \`Database Staged: Staged in memory (\${data.uncommittedCount || 0} pending files — Auto-Commit is OFF)\`,
        });
        if (typeof data.autoCommitEnabled === "boolean") {
          setAutoCommitEnabled(data.autoCommitEnabled);
        }
        if (typeof data.uncommittedCount === "number") {
          setUncommittedCount(data.uncommittedCount);
        }`);

content = content.replace(
  'setBatchIngesting(false);\n      setStudioVideosLoading(false);\n    }\n  };',
  'setBatchIngesting(false);\n      setStudioVideosLoading(false);\n      fetchAutoCommitStatus();\n    }\n  };'
);

fs.writeFileSync(file, content);
