const fs = require('fs');
const file = 'src/components/modals/MediaHarvesterModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);',
  '  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);\n\n  const mainVideoRef = useRef<HTMLVideoElement>(null);\n  const previewVideoRef = useRef<HTMLVideoElement>(null);\n\n  const toggleFullscreen = (videoRef: React.RefObject<HTMLVideoElement>) => {\n    if (videoRef.current) {\n      if (document.fullscreenElement) {\n        document.exitFullscreen().catch(err => console.error(err));\n      } else {\n        videoRef.current.requestFullscreen().catch(err => console.error(err));\n      }\n    }\n  };'
);

fs.writeFileSync(file, content);
