/** Notes 文章数据 */
export interface NoteItem {
  slug: string;
  title: string;
  date: string;
  readTime: number;
  /** 标签颜色：对应设计系统中的色彩变量名 */
  color: 'blue' | 'red' | 'yellow' | 'green';
}

export const notes: NoteItem[] = [
  {
    slug: 'designing-memory-for-ai-agents',
    title: 'Designing Memory for AI Agents',
    date: '2024-05-08',
    readTime: 7,
    color: 'blue',
  },
  {
    slug: 'building-a-second-brain-that-actually-works',
    title: 'Building a Second Brain That Actually Works',
    date: '2024-04-22',
    readTime: 9,
    color: 'red',
  },
  {
    slug: 'automating-my-workflow',
    title: 'Automating My Workflow',
    date: '2024-04-06',
    readTime: 6,
    color: 'yellow',
  },
];
