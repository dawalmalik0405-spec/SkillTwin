import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Lock,
  Unlock,
  BookOpen,
  Video,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Brain,
  Trophy,
  Code2,
  Database,
  Server,
  Container,
  Shield,
  Terminal,
  Globe,
  Loader2,
  Clock,
  FileText,
  X
} from 'lucide-react';
import { PersonalizedRoadmapResponse } from '../../shared/types';
import { apiClient } from '../../shared/apiClient';

interface VisualRoadmapProps {
  roadmapData: PersonalizedRoadmapResponse | null;
  /** Opens the quiz. The parent (RoadmapPage) owns the QuizModal and the
   *  post-quiz roadmap refresh, so this component only asks for it. */
  onStartQuiz: (taskId: string, skillName: string) => void;
}

interface RoadmapNode {
  id: string;
  label: string;
  skill: string;
  phase: number;
  status: 'locked' | 'available' | 'completed';
  icon: React.ReactNode;
  color: string;
  gradient: string;
  docsUrl?: string;
  youtubeUrl?: string;
  description: string;
  estimatedHours: number;
  type: 'Course' | 'Project' | 'Practice';
}

interface PhaseGroup {
  phase: number;
  title: string;
  subtitle: string;
  nodes: RoadmapNode[];
}

// Fallback documentation links per skill, used when the AI resource call returns
// nothing. Deliberately docs-only: video recommendations come from the model,
// which is prompted to return a specific https://www.youtube.com/watch?v=ID URL.
// A hardcoded YouTube search link is not a lesson, so none is kept here.
const SKILL_RESOURCES: Record<string, { docs: string }> = {
  'HTML/CSS': {
    docs: 'https://developer.mozilla.org/en-US/docs/Learn'
  },
  'JavaScript': {
    docs: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide'
  },
  'React': {
    docs: 'https://react.dev/learn'
  },
  'TypeScript': {
    docs: 'https://www.typescriptlang.org/docs/'
  },
  'Redux': {
    docs: 'https://redux-toolkit.js.org/'
  },
  'Node.js': {
    docs: 'https://nodejs.org/docs/latest/api/'
  },
  'Python/FastAPI': {
    docs: 'https://fastapi.tiangolo.com/tutorial/'
  },
  'Authentication': {
    docs: 'https://auth0.com/docs/get-started/authentication-and-authorization-flow'
  },
  'PostgreSQL': {
    docs: 'https://www.postgresql.org/docs/'
  },
  'ORM': {
    docs: 'https://docs.sqlalchemy.org/'
  },
  'Docker': {
    docs: 'https://docs.docker.com/get-started/'
  },
  'CI/CD': {
    docs: 'https://docs.github.com/en/actions'
  },
  'Testing': {
    docs: 'https://testing-library.com/docs/react-testing-library/intro/'
  },
  'Security': {
    docs: 'https://owasp.org/www-project-top-ten/'
  },
  'Portfolio': {
    docs: 'https://developer.mozilla.org/en-US/docs/Learn'
  },
  'E-commerce': {
    docs: 'https://react.dev/learn'
  },
  'Frontend': {
    docs: 'https://developer.mozilla.org/en-US/docs/Learn/Front-end_web_developer'
  },
  'Backend': {
    docs: 'https://nodejs.org/docs/latest/api/'
  },
  'Database': {
    docs: 'https://www.postgresql.org/docs/'
  },
  'DevOps': {
    docs: 'https://roadmap.sh/devops'
  },
  'Capstone': {
    docs: 'https://github.com'
  }
};

const getNodeIcon = (skill: string): React.ReactNode => {
  const s = skill.toLowerCase();
  if (s.includes('html') || s.includes('css')) return <Globe size={28} />;
  if (s.includes('javascript') || s.includes('react') || s.includes('typescript') || s.includes('redux')) return <Code2 size={28} />;
  if (s.includes('node') || s.includes('express') || s.includes('fastapi') || s.includes('backend')) return <Server size={28} />;
  if (s.includes('postgresql') || s.includes('sql') || s.includes('database') || s.includes('orm')) return <Database size={28} />;
  if (s.includes('docker') || s.includes('ci/cd') || s.includes('devops')) return <Container size={28} />;
  if (s.includes('security')) return <Shield size={28} />;
  if (s.includes('testing')) return <Terminal size={28} />;
  return <BookOpen size={28} />;
};

const getPhaseGradient = (phase: number): string => {
  const gradients = [
    'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',  // Phase 1 - Indigo to Purple
    'linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)',  // Phase 2 - Purple to Fuchsia
    'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)',  // Phase 3 - Blue to Cyan
    'linear-gradient(135deg, #0891B2 0%, #059669 100%)',  // Phase 4 - Cyan to Emerald
    'linear-gradient(135deg, #059669 0%, #CA8A04 100%)',  // Phase 5 - Emerald to Amber
    'linear-gradient(135deg, #CA8A04 0%, #DC2626 100%)',  // Phase 6 - Amber to Red
  ];
  return gradients[(phase - 1) % gradients.length];
};

const getPhaseColor = (phase: number): string => {
  const colors = ['#818CF8', '#A78BFA', '#60A5FA', '#22D3EE', '#34D399', '#FBBF24'];
  return colors[(phase - 1) % colors.length];
};

const resourceIconClass = (type: string): string => {
  if (type === 'video') return 'vr-resource-icon vr-resource-icon--video';
  if (type === 'documentation') return 'vr-resource-icon vr-resource-icon--docs';
  return 'vr-resource-icon vr-resource-icon--other';
};

export const VisualRoadmap: React.FC<VisualRoadmapProps> = ({
  roadmapData,
  onStartQuiz
}) => {
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [aiResources, setAiResources] = useState<Array<{ title: string; url: string; type: string; provider?: string }>>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Flatten every phase's tasks into an ordered node list, then derive the
  // locked/available/completed state from the preceding node.
  const phaseGroups = useMemo((): PhaseGroup[] => {
    if (!roadmapData) return [];

    const completedTasks = new Set<string>();
    roadmapData.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if (task.is_completed) completedTasks.add(task.id);
      });
    });

    const flat: Array<{
      id: string;
      title: string;
      skill: string;
      phase: number;
      phaseTitle: string;
      phaseSubtitle: string;
      hours: number;
      description: string;
      type: string;
    }> = [];

    roadmapData.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        flat.push({
          id: task.id,
          title: task.title,
          // The backend stamps the authoritative skill on every task. Only fall
          // back to guessing from the title if an older payload omits it.
          skill: task.skill_name || extractSkillFromTitle(task.title),
          phase: phase.phase_number,
          phaseTitle: phase.title,
          phaseSubtitle: phase.subtitle,
          hours: task.estimated_hours,
          description: task.description,
          type: task.type
        });
      });
    });

    const groups: PhaseGroup[] = [];

    flat.forEach((task, index) => {
      const isCompleted = completedTasks.has(task.id);
      const prevTaskId = index > 0 ? flat[index - 1].id : null;
      const prevCompleted = prevTaskId ? completedTasks.has(prevTaskId) : true;

      let status: 'locked' | 'available' | 'completed' = 'locked';
      if (isCompleted) status = 'completed';
      else if (index === 0 || prevCompleted) status = 'available';

      const resources = SKILL_RESOURCES[task.skill] || SKILL_RESOURCES['JavaScript'];

      const node: RoadmapNode = {
        id: task.id,
        label: task.title,
        skill: task.skill,
        phase: task.phase,
        status,
        icon: getNodeIcon(task.skill),
        color: getPhaseColor(task.phase),
        gradient: getPhaseGradient(task.phase),
        docsUrl: resources.docs,
        description: task.description,
        estimatedHours: task.hours,
        type: (task.type as 'Course' | 'Project' | 'Practice') || 'Course'
      };

      let group = groups.find(g => g.phase === task.phase);
      if (!group) {
        group = {
          phase: task.phase,
          title: task.phaseTitle,
          subtitle: task.phaseSubtitle,
          nodes: []
        };
        groups.push(group);
      }
      group.nodes.push(node);
    });

    return groups;
  }, [roadmapData]);

  const allNodes = useMemo(
    () => phaseGroups.flatMap(g => g.nodes),
    [phaseGroups]
  );

  // Fetch AI-curated resources for the selected node's skill.
  // Always ensures YouTube + docs links are present as fallback.
  useEffect(() => {
    if (!selectedNode) {
      setAiResources([]);
      return;
    }

    let cancelled = false;
    const skill = selectedNode.skill;
    const node = selectedNode;

    const buildFallbackResources = (): Array<{ title: string; url: string; type: string; provider: string }> => {
      const skillSlug = skill.toLowerCase().replace(/\s+/g, '+').replace(/[&/]/g, '+');
      const taskSlug = node.label.toLowerCase().replace(/\s+/g, '+').replace(/[&:/]/g, '+').substring(0, 60);

      return [
        {
          title: `YouTube: ${skill} Tutorial for Beginners`,
          url: node.youtubeUrl || `https://www.youtube.com/results?search_query=${skillSlug}+tutorial+for+beginners`,
          type: 'video',
          provider: 'YouTube'
        },
        {
          title: `YouTube: ${skill} Full Course`,
          url: `https://www.youtube.com/results?search_query=${skillSlug}+full+course+2024`,
          type: 'video',
          provider: 'YouTube'
        },
        {
          title: `YouTube: ${node.label.substring(0, 50)}`,
          url: `https://www.youtube.com/results?search_query=${taskSlug}+tutorial`,
          type: 'video',
          provider: 'YouTube'
        },
        {
          title: `Official ${skill} Documentation`,
          url: node.docsUrl || `https://developer.mozilla.org/en-US/docs/Learn`,
          type: 'documentation',
          provider: 'Official Docs'
        },
        {
          title: `FreeCodeCamp: Learn ${skill}`,
          url: `https://www.freecodecamp.org/news/search/?query=${skillSlug}`,
          type: 'course',
          provider: 'freeCodeCamp'
        }
      ];
    };

    const fetchResources = async () => {
      setLoadingResources(true);
      try {
        const data = await apiClient.getAiResources(skill, 'intermediate');
        const aiResources = data.resources || [];

        // Merge AI resources with guaranteed fallbacks
        const fallback = buildFallbackResources();
        const merged = [...aiResources];

        // Ensure at least 2 video resources exist
        const videos = merged.filter(r => r.type === 'video');
        if (videos.length < 2) {
          const fallbackVideos = fallback.filter(r => r.type === 'video');
          for (const fv of fallbackVideos) {
            if (!merged.some(m => m.url === fv.url)) {
              merged.push(fv);
            }
            if (merged.filter(r => r.type === 'video').length >= 2) break;
          }
        }

        // Ensure docs exist
        const hasDocs = merged.some(r => r.type === 'documentation');
        if (!hasDocs) {
          const fallbackDoc = fallback.find(r => r.type === 'documentation');
          if (fallbackDoc) merged.push(fallbackDoc);
        }

        if (!cancelled) setAiResources(merged);
      } catch (err) {
        console.error('[VisualRoadmap] Failed to fetch AI resources:', err);
        if (!cancelled) setAiResources(buildFallbackResources());
      } finally {
        if (!cancelled) setLoadingResources(false);
      }
    };

    fetchResources();

    // Guard against a slow response for a previously selected node landing
    // after the user has already opened a different one.
    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  const handleNodeClick = (node: RoadmapNode) => {
    if (node.status === 'locked') return;
    setSelectedNode(node);
  };

  const handleStartQuiz = () => {
    if (!selectedNode) return;
    const { id, skill } = selectedNode;
    setSelectedNode(null);
    onStartQuiz(id, skill);
  };

  if (!roadmapData) {
    return (
      <div className="vr-empty">
        <div>
          <Sparkles size={48} style={{ color: '#A78BFA', marginBottom: '12px' }} />
          <p>Loading your visual roadmap...</p>
        </div>
      </div>
    );
  }

  const completedCount = allNodes.filter(n => n.status === 'completed').length;

  return (
    <div className="vr-container">
      <div className="vr-header">
        <h2 className="vr-header-title">
          <Sparkles size={24} style={{ color: '#A78BFA' }} />
          Your Learning Path
          <Sparkles size={24} style={{ color: '#A78BFA' }} />
        </h2>
        <p className="vr-header-sub">
          Click any unlocked node to view AI-curated resources and take its quiz.
          Score 70% or higher to mark the skill complete and unlock the next one.
        </p>
      </div>

      <div className="vr-phases">
        {phaseGroups.map((group, phaseIdx) => {
          // Odd phases flow right-to-left so the path snakes down the page.
          const reversed = phaseIdx % 2 === 1;

          return (
            <div key={group.phase} className="vr-phase">
              <div className="vr-phase-head">
                <div
                  className="vr-phase-badge"
                  style={{
                    background: getPhaseGradient(group.phase),
                    boxShadow: `0 4px 20px ${getPhaseColor(group.phase)}40`
                  }}
                >
                  PHASE {group.phase}
                </div>
                <div className="vr-phase-caption">
                  {group.title}
                  {group.subtitle ? ` — ${group.subtitle}` : ''}
                </div>
              </div>

              <div className={`vr-row${reversed ? ' vr-row--rtl' : ''}`}>
                {group.nodes.map((node, index) => (
                  <React.Fragment key={node.id}>
                    <div
                      onClick={() => handleNodeClick(node)}
                      className={`vr-node vr-node--${node.status}`}
                      style={
                        node.status === 'available'
                          ? {
                              background: node.gradient,
                              boxShadow: `0 10px 40px ${node.color}40, 0 0 20px ${node.color}20`
                            }
                          : undefined
                      }
                      role="button"
                      tabIndex={node.status === 'locked' ? -1 : 0}
                      aria-disabled={node.status === 'locked'}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNodeClick(node);
                        }
                      }}
                    >
                      <span className="vr-node-index">#{index + 1}</span>

                      {node.status === 'completed' && (
                        <span className="vr-node-badge vr-node-badge--done">
                          <CheckCircle2 size={13} color="#fff" />
                        </span>
                      )}
                      {node.status === 'locked' && (
                        <span className="vr-node-badge vr-node-badge--locked">
                          <Lock size={13} color="#CBD5E1" />
                        </span>
                      )}
                      {node.status === 'available' && (
                        <span className="vr-node-badge">
                          <Unlock size={13} color="#fff" />
                        </span>
                      )}

                      <span className={`vr-node-icon vr-node-icon--${node.status}`}>
                        {node.icon}
                      </span>

                      <h3 className="vr-node-title">{node.label}</h3>
                      <p className="vr-node-skill">{node.skill}</p>
                      <span className="vr-node-hours">
                        <Clock size={10} />
                        {node.estimatedHours}h
                      </span>
                    </div>

                    {index < group.nodes.length - 1 && (
                      <span
                        className={`vr-arrow${node.status === 'completed' ? ' vr-arrow--done' : ''}`}
                        aria-hidden="true"
                      >
                        {/* row-reverse flips the visual order, so flip the glyph
                            to keep it pointing at the following node. */}
                        <ChevronRight
                          size={30}
                          style={reversed ? { transform: 'rotate(180deg)' } : undefined}
                        />
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="vr-progress">
        <div className="vr-progress-head">
          <h3 className="vr-progress-title">
            <Trophy size={20} style={{ color: '#FBBF24' }} />
            Overall Progress
          </h3>
          <div className="vr-progress-pct">
            {roadmapData.summary.overall_completion_pct}%
          </div>
        </div>
        <div className="vr-progress-track">
          <div
            className="vr-progress-fill"
            style={{ width: `${roadmapData.summary.overall_completion_pct}%` }}
          />
        </div>
        <p className="vr-progress-caption">
          {completedCount} of {allNodes.length} skills mastered
        </p>
      </div>

      {selectedNode && (
        <div className="modal-backdrop" onClick={() => setSelectedNode(null)}>
          <div className="vr-detail" onClick={e => e.stopPropagation()}>
            <div
              className="vr-detail-head"
              style={{ background: selectedNode.gradient }}
            >
              <button
                type="button"
                className="vr-detail-close"
                onClick={() => setSelectedNode(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <span className="vr-detail-icon">{selectedNode.icon}</span>
              <div>
                <h2 className="vr-detail-title">{selectedNode.label}</h2>
                <div className="vr-detail-meta">
                  <span>📚 {selectedNode.skill}</span>
                  <span>⏱️ {selectedNode.estimatedHours} hours</span>
                  <span>📍 Phase {selectedNode.phase}</span>
                </div>
              </div>
            </div>

            <div className="vr-detail-body">
              <div>
                <h3 className="vr-section-label">What You'll Learn</h3>
                <p className="vr-detail-desc">{selectedNode.description}</p>
              </div>

              <div>
                <h3 className="vr-section-label">
                  <Sparkles size={14} style={{ color: '#A78BFA' }} />
                  AI-Recommended Resources
                </h3>

                {loadingResources ? (
                  <div className="vr-loading-row">
                    <Loader2 size={18} className="vr-spin" />
                    Finding the best resources for you...
                  </div>
                ) : aiResources.length > 0 ? (
                  <div className="vr-resource-list">
                    {aiResources.map((resource, idx) => (
                      <a
                        key={`${resource.url}-${idx}`}
                        className="vr-resource"
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={resourceIconClass(resource.type)}>
                          {resource.type === 'video' ? (
                            <Video size={17} />
                          ) : resource.type === 'documentation' ? (
                            <FileText size={17} />
                          ) : (
                            <BookOpen size={17} />
                          )}
                        </span>
                        <span className="vr-resource-text">
                          <span className="vr-resource-title">{resource.title}</span>
                          <span className="vr-resource-sub">
                            {resource.provider ? `${resource.provider} • ` : ''}
                            {resource.type}
                          </span>
                        </span>
                        <ExternalLink size={15} className="vr-resource-ext" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="vr-resource-list">
                    {/* No YouTube entry here on purpose. Videos are picked by
                        the model per skill; a search-results link is not a
                        lesson, and there is no honest way to guess a video id
                        client-side. Docs links below are exact pages. */}
                    <a
                      className="vr-resource"
                      href={selectedNode.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="vr-resource-icon vr-resource-icon--docs">
                        <FileText size={17} />
                      </span>
                      <span className="vr-resource-text">
                        <span className="vr-resource-title">Official Docs</span>
                        <span className="vr-resource-sub">Reference documentation</span>
                      </span>
                      <ExternalLink size={15} className="vr-resource-ext" />
                    </a>
                  </div>
                )}
              </div>

              <div className="vr-stats">
                <div className="vr-stat">
                  <div className="vr-stat-value">{selectedNode.estimatedHours}h</div>
                  <div className="vr-stat-label">Duration</div>
                </div>
                <div className="vr-stat">
                  <div className="vr-stat-value">5</div>
                  <div className="vr-stat-label">Quiz Questions</div>
                </div>
                <div className="vr-stat">
                  <div className="vr-stat-value">70%</div>
                  <div className="vr-stat-label">To Pass</div>
                </div>
              </div>
            </div>

            <div className="vr-detail-foot">
              <button
                type="button"
                onClick={handleStartQuiz}
                className={`vr-quiz-btn${selectedNode.status === 'completed' ? ' vr-quiz-btn--done' : ''}`}
              >
                {selectedNode.status === 'completed' ? (
                  <>
                    <Trophy size={20} />
                    Completed — Retake Quiz
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    Start Quiz to Unlock Next
                  </>
                )}
              </button>
              <p className="vr-quiz-hint">
                {selectedNode.status === 'completed'
                  ? 'Already completed — test your knowledge again.'
                  : `Answer 5 ${selectedNode.skill} questions to complete this step.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualRoadmap;

/**
 * Legacy fallback for payloads that predate the backend's skill_name field.
 * Prefer task.skill_name — this guesses, and guessing mislabels tasks whose
 * titles don't name their technology.
 */
function extractSkillFromTitle(title: string): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('html') || lowerTitle.includes('css') || lowerTitle.includes('responsive')) return 'HTML/CSS';
  if (lowerTitle.includes('javascript') || lowerTitle.includes('js')) return 'JavaScript';
  if (lowerTitle.includes('react')) return 'React';
  if (lowerTitle.includes('typescript')) return 'TypeScript';
  if (lowerTitle.includes('redux')) return 'Redux';
  if (lowerTitle.includes('node') || lowerTitle.includes('express')) return 'Node.js';
  if (lowerTitle.includes('fastapi') || lowerTitle.includes('python')) return 'Python/FastAPI';
  if (lowerTitle.includes('auth') || lowerTitle.includes('jwt')) return 'Authentication';
  if (lowerTitle.includes('postgresql') || lowerTitle.includes('sql')) return 'PostgreSQL';
  if (lowerTitle.includes('orm')) return 'ORM';
  if (lowerTitle.includes('docker') || lowerTitle.includes('container')) return 'Docker';
  if (lowerTitle.includes('ci/cd') || lowerTitle.includes('github') || lowerTitle.includes('actions')) return 'CI/CD';
  if (lowerTitle.includes('test')) return 'Testing';
  if (lowerTitle.includes('security') || lowerTitle.includes('owasp')) return 'Security';
  if (lowerTitle.includes('portfolio')) return 'Portfolio';
  if (lowerTitle.includes('e-commerce') || lowerTitle.includes('shop')) return 'E-commerce';
  if (lowerTitle.includes('backend') || lowerTitle.includes('api')) return 'Backend';
  if (lowerTitle.includes('database')) return 'Database';
  if (lowerTitle.includes('devops')) return 'DevOps';
  if (lowerTitle.includes('capstone') || lowerTitle.includes('production')) return 'Capstone';

  return 'JavaScript';
}
