/** Work 项目数据 */
export interface WorkItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  year: number;
}

export const works: WorkItem[] = [
  {
    slug: 'pixel-engine',
    title: 'Pixel Engine',
    description: 'A high-performance Canvas 2D particle system for interactive web experiences.',
    tags: ['Canvas 2D', 'TypeScript', 'Animation'],
    year: 2024,
  },
  {
    slug: 'ai-workflow-builder',
    title: 'AI Workflow Builder',
    description: 'Visual workflow builder for chaining AI agents with real-time streaming.',
    tags: ['Next.js', 'AI', 'tRPC'],
    year: 2024,
  },
];
