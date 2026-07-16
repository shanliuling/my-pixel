/** 技术栈分类数据 */
export interface StackCategory {
  name: string;
  items: string[];
}

export const stack: StackCategory[] = [
  {
    name: 'Frontend',
    items: ['React', 'Next.js', 'TypeScript', 'CSS Modules', 'Canvas 2D'],
  },
  {
    name: 'Backend',
    items: ['Node.js', 'tRPC', 'Prisma', 'PostgreSQL'],
  },
  {
    name: 'AI & Tools',
    items: ['LangChain', 'OpenAI API', 'Vercel AI SDK', 'Cursor'],
  },
  {
    name: 'DevOps',
    items: ['Vercel', 'Docker', 'GitHub Actions', 'pnpm'],
  },
];
